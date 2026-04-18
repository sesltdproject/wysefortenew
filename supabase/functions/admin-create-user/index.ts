import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create regular client to verify requesting user is admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify the requesting user is an admin using security definer function
    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser()
    
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: isAdmin, error: roleCheckError } = await supabaseAdmin.rpc('has_role', {
      _user_id: requestingUser.id,
      _role: 'admin'
    })

    if (roleCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, full_name, role = 'user', username, security_code } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only default admin can create admin accounts
    if (role === 'admin') {
      const { data: callerIsDefault } = await supabaseAdmin.rpc('is_default_admin', {
        _user_id: requestingUser.id
      })

      if (!callerIsDefault) {
        return new Response(
          JSON.stringify({ error: 'Only the default administrator can create admin accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate security code is required and exactly 6 digits
    if (!security_code || !/^\d{6}$/.test(security_code)) {
      return new Response(
        JSON.stringify({ error: 'Security code is required and must be exactly 6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If username is provided, check for uniqueness
    if (username) {
      const { data: existingUsername } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle()

      if (existingUsername) {
        return new Response(
          JSON.stringify({ error: 'Username is already taken' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create user with admin client
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        role,
      },
      email_confirm: true, // Auto-confirm email
    })

    if (userError) {
      console.error('Error creating user:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure profile and role exist (safety net in case trigger hasn't fired yet)
    if (user.user) {
      // Explicitly create profile with ON CONFLICT to avoid clashing with trigger
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.user.id,
          email,
          full_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: true })

      if (profileError) {
        console.error('Error ensuring profile exists:', profileError)
      }

      // Delete any existing roles created by the trigger, then insert the desired role
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user.user.id)

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ 
          user_id: user.user.id, 
          role: role as 'user' | 'admin' 
        })

      if (roleError) {
        console.error('Error assigning user role:', roleError)
        await supabaseAdmin.auth.admin.deleteUser(user.user.id)
        return new Response(
          JSON.stringify({ error: 'Failed to assign role', details: roleError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update profile with username if provided
      if (username) {
        const { error: usernameError } = await supabaseAdmin
          .from('profiles')
          .update({ username })
          .eq('id', user.user.id)

        if (usernameError) {
          console.error('Error setting username:', usernameError)
          // Don't fail the entire operation, just log the error
        }
      }

      // Hash security code and create user_security record
      console.log('Hashing security code for user:', user.user.id)
      const { data: hashData, error: hashError } = await supabaseAdmin.rpc('hash_security_code', {
        p_code: security_code
      })

      if (hashError) {
        console.error('Error hashing security code:', hashError)
        // Rollback user creation if security code hashing fails
        await supabaseAdmin.auth.admin.deleteUser(user.user.id)
        return new Response(
          JSON.stringify({ error: 'Failed to process security code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user_security record with security code and must_change_password flag
      const { error: securityError } = await supabaseAdmin
        .from('user_security')
        .upsert({
          user_id: user.user.id,
          security_code_enabled: true,
          security_code_hash: hashData,
          security_code_for_transfers: true,
          must_change_password: true,
        }, { onConflict: 'user_id' })

      if (securityError) {
        console.error('Error creating user security record:', securityError)
        // Rollback user creation if security record creation fails
        await supabaseAdmin.auth.admin.deleteUser(user.user.id)
        return new Response(
          JSON.stringify({ error: 'Failed to configure security settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('User security record created successfully with security code enabled and must_change_password=true')

      // Log admin activity
      await supabaseAdmin
        .from('admin_activities')
        .insert({
          admin_id: requestingUser.id,
          action: 'user_created',
          details: `Created user ${email}${username ? ` (username: ${username})` : ''} with role ${role} and security code enabled`
        })
    }

    return new Response(
      JSON.stringify({ success: true, user: user.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

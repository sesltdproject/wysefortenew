import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Admin credentials
    // Parse request body for custom admin credentials, or use defaults
    const body = await req.json().catch(() => ({}))
    const adminEmail = body.email || 'admin@wyseforte.co.uk'
    const adminPassword = body.password || '2P@4zQ9977x'
    const adminFullName = body.full_name || 'System Administrator'

    console.log('Starting admin setup...')

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail)

    let userId: string

    if (existingUser) {
      console.log('Admin user already exists:', existingUser.id)
      userId = existingUser.id
      
      // Update password for existing user
      console.log('Updating admin password...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: adminPassword }
      )
      
      if (updateError) {
        console.error('Error updating password:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update password', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Password updated successfully')
    } else {
      // Create the admin user
      console.log('Creating new admin user...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminFullName
        }
      })

      if (createError) {
        console.error('Error creating admin user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create admin user', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id
      console.log('Admin user created:', userId)
    }

    // Ensure profile exists (the trigger should create it, but let's be safe)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      console.log('Creating admin profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: adminEmail,
          full_name: adminFullName
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Non-fatal - profile might already exist via trigger
      } else {
        console.log('Profile created successfully')
      }
    }

    // Check if admin role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (existingRole) {
      console.log('Admin role already assigned')
      
      // Also ensure user_security record exists
      const { data: existingSecurityCheck } = await supabase
        .from('user_security')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existingSecurityCheck) {
        console.log('Creating user_security record...')
        await supabase.from('user_security').insert({ user_id: userId })
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Admin user already set up (password updated)',
          userId,
          email: adminEmail
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign admin role
    console.log('Assigning admin role...')
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ 
        user_id: userId, 
        role: 'admin' 
      })

    if (roleError) {
      console.error('Error assigning admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to assign admin role', details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also ensure user_security record exists
    const { data: existingSecurity } = await supabase
      .from('user_security')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingSecurity) {
      console.log('Creating user_security record...')
      await supabase
        .from('user_security')
        .insert({ user_id: userId })
    }

    console.log('Admin setup completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin user created and role assigned successfully',
        userId,
        email: adminEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

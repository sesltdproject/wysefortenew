import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { identifier } = await req.json()

    if (!identifier || typeof identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Identifier is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trimmedIdentifier = identifier.trim()

    // If identifier contains @, treat it as email and return as-is
    if (trimmedIdentifier.includes('@')) {
      console.log('Identifier is email, returning as-is')
      return new Response(
        JSON.stringify({ email: trimmedIdentifier, resolved_from: 'email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, look up username in profiles table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Case-insensitive username lookup
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .ilike('username', trimmedIdentifier)
      .maybeSingle()

    if (error) {
      console.error('Error looking up username:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to resolve identifier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile) {
      // Return generic error to prevent username enumeration
      console.log('Username not found:', trimmedIdentifier)
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Username resolved to email for:', trimmedIdentifier)
    return new Response(
      JSON.stringify({ email: profile.email, resolved_from: 'username' }),
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


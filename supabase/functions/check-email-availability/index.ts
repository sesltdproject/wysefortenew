 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const { email } = await req.json()
 
     if (!email) {
       return new Response(
         JSON.stringify({ error: 'Email is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Basic email validation
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
     if (!emailRegex.test(email)) {
       return new Response(
         JSON.stringify({ available: false, reason: 'Invalid email format' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
       auth: {
         autoRefreshToken: false,
         persistSession: false,
       },
     })
 
     const normalizedEmail = email.toLowerCase().trim()
 
     // Check 1: auth.users table (requires admin privileges)
     const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
     
     if (authError) {
       console.error('Error checking auth.users:', authError)
       return new Response(
         JSON.stringify({ error: 'Failed to check email availability' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const existsInAuth = authUsers.users.some(
       user => user.email?.toLowerCase() === normalizedEmail
     )
 
     if (existsInAuth) {
       return new Response(
         JSON.stringify({ available: false, reason: 'Email is already registered' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check 2: profiles table
     const { data: existingProfile, error: profileError } = await supabaseAdmin
       .from('profiles')
       .select('id')
       .ilike('email', normalizedEmail)
       .maybeSingle()
 
     if (profileError) {
       console.error('Error checking profiles:', profileError)
       return new Response(
         JSON.stringify({ error: 'Failed to check email availability' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     if (existingProfile) {
       return new Response(
         JSON.stringify({ available: false, reason: 'Email is already registered' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check 3: pending account applications
     const { data: existingApplication, error: appError } = await supabaseAdmin
       .from('account_applications')
       .select('id')
       .ilike('email', normalizedEmail)
       .eq('status', 'pending')
       .maybeSingle()
 
     if (appError) {
       console.error('Error checking applications:', appError)
       return new Response(
         JSON.stringify({ error: 'Failed to check email availability' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     if (existingApplication) {
       return new Response(
         JSON.stringify({ available: false, reason: 'Email has a pending application' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Email is available
     return new Response(
       JSON.stringify({ available: true }),
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
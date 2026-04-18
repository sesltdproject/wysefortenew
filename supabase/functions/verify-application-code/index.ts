import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if auth emails are enabled - if disabled, auto-verify
    const { data: settings } = await supabaseAdmin
      .from('website_settings')
      .select('auth_emails_enabled')
      .single();

    if (!settings?.auth_emails_enabled) {
      console.log('Auth emails are disabled - auto-verifying');
      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the verification code
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('verification_code', code)
      .single();

    if (fetchError || !verificationData) {
      // Increment attempts if a record exists for this email - fetch and increment properly
      const { data: existingRecord } = await supabaseAdmin
        .from('email_verification_codes')
        .select('attempts')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingRecord) {
        await supabaseAdmin
          .from('email_verification_codes')
          .update({ attempts: (existingRecord.attempts || 0) + 1 })
          .eq('email', email.toLowerCase());
      }

      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has expired
    if (new Date(verificationData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Verification code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (verificationData.verified) {
      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error marking code as verified:', updateError);
      throw new Error('Failed to verify code');
    }

    console.log('Email verified successfully:', email);

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

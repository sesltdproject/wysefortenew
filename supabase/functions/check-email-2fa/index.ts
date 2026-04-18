import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckEmail2FARequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email }: CheckEmail2FARequest = await req.json();

    console.log('Checking email 2FA status for:', email);

    if (!email) {
      return new Response(JSON.stringify({ 
        requires_email_2fa: false,
        error: 'Email is required' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // Don't reveal if user exists or not for security
      return new Response(JSON.stringify({ 
        requires_email_2fa: false
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check if email 2FA is enabled
    const { data: securityData, error: securityError } = await supabase
      .from('user_security')
      .select('email_2fa_enabled')
      .eq('user_id', userData.id)
      .single();

    if (securityError && securityError.code !== 'PGRST116') {
      console.error('Error fetching security data:', securityError);
    }

    const requires2FA = securityData?.email_2fa_enabled === true;

    return new Response(JSON.stringify({ 
      requires_email_2fa: requires2FA,
      user_id: requires2FA ? userData.id : undefined
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error checking email 2FA:", error);
    return new Response(JSON.stringify({ 
      requires_email_2fa: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);

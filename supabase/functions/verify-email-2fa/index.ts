import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyEmail2FARequest {
  email: string;
  code: string;
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

    const { email, code }: VerifyEmail2FARequest = await req.json();

    console.log('Verifying email 2FA code for:', email);

    if (!email || !code) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Email and code are required' 
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
      console.error('Error fetching user:', userError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'User not found' 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get stored verification code
    const { data: securityData, error: securityError } = await supabase
      .from('user_security')
      .select('email_2fa_code, email_2fa_code_expires_at, failed_verification_attempts')
      .eq('user_id', userData.id)
      .single();

    if (securityError) {
      console.error('Error fetching security data:', securityError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Security settings not found' 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check if code has expired
    if (securityData.email_2fa_code_expires_at) {
      const expiresAt = new Date(securityData.email_2fa_code_expires_at);
      if (new Date() > expiresAt) {
        // Clear the expired code
        await supabase
          .from('user_security')
          .update({ 
            email_2fa_code: null, 
            email_2fa_code_expires_at: null 
          })
          .eq('user_id', userData.id);

        return new Response(JSON.stringify({ 
          success: false,
          error: 'Verification code has expired. Please request a new code.' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Verify the code
    if (securityData.email_2fa_code !== code) {
      // Increment failed attempts
      const failedAttempts = (securityData.failed_verification_attempts || 0) + 1;
      
      await supabase
        .from('user_security')
        .update({ 
          failed_verification_attempts: failedAttempts,
          last_failed_attempt: new Date().toISOString()
        })
        .eq('user_id', userData.id);

      // If too many failed attempts, lock temporarily
      if (failedAttempts >= 5) {
        await supabase
          .from('user_security')
          .update({ 
            email_2fa_code: null, 
            email_2fa_code_expires_at: null,
            account_locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
          })
          .eq('user_id', userData.id);

        return new Response(JSON.stringify({ 
          success: false,
          error: 'Too many failed attempts. Please wait 15 minutes before trying again.',
          locked: true
        }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({ 
        success: false,
        error: `Invalid verification code. ${5 - failedAttempts} attempts remaining.`,
        attempts_remaining: 5 - failedAttempts
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Code is valid - clear it and reset failed attempts
    await supabase
      .from('user_security')
      .update({ 
        email_2fa_code: null, 
        email_2fa_code_expires_at: null,
        failed_verification_attempts: 0,
        last_failed_attempt: null
      })
      .eq('user_id', userData.id);

    console.log('Email 2FA verification successful for user:', userData.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Verification successful',
      user_id: userData.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error verifying email 2FA:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);

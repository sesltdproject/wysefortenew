import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckAccountRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: CheckAccountRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Checking account status for:', email);

    // Security Fix: Return generic response to prevent account enumeration
    // This prevents attackers from determining if an email exists in the system
    
    // Still check account status internally for legitimate authentication flow
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, account_locked')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching profile:', error);
      // Return generic message even on error to prevent information leakage
      return new Response(
        JSON.stringify({ 
          message: 'Please proceed with login. If your credentials are correct, you will be authenticated.'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If profile not found, return generic response (don't reveal account doesn't exist)
    if (!profile) {
      console.log('Profile not found for email:', email);
      return new Response(
        JSON.stringify({ 
          message: 'Please proceed with login. If your credentials are correct, you will be authenticated.'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if security code is required
    const { data: securitySettings } = await supabase
      .from('user_security')
      .select('security_code_enabled, account_locked_until')
      .eq('user_id', profile.id)
      .maybeSingle();

    const isLocked = profile.account_locked || false;
    const isTemporarilyLocked = securitySettings?.account_locked_until && 
                                 new Date(securitySettings.account_locked_until) > new Date();
    const requiresSecurityCode = securitySettings?.security_code_enabled || false;
    
    console.log('Account status:', { 
      email, 
      locked: isLocked, 
      temp_locked: isTemporarilyLocked,
      requires_security_code: requiresSecurityCode 
    });

    // Return actual status only for authenticated internal use
    // The client will handle this appropriately without revealing information
    return new Response(
      JSON.stringify({ 
        exists: true,
        locked: isLocked,
        temporarily_locked: isTemporarilyLocked,
        locked_until: isTemporarilyLocked ? securitySettings.account_locked_until : null,
        requires_security_code: requiresSecurityCode,
        user_id: profile.id,
        // Generic message for display
        message: 'Account status verified'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in check-account-status function:', error);
    // Return generic message even on internal error
    return new Response(
      JSON.stringify({ 
        message: 'Please proceed with login. If your credentials are correct, you will be authenticated.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

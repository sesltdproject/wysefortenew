import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompletePasswordResetRequest {
  email: string;
  reset_code: string;
  new_password: string;
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

    const { email, reset_code, new_password }: CompletePasswordResetRequest = await req.json();

    console.log('Processing password reset completion for:', email);

    // Validate inputs
    if (!email || !reset_code || !new_password) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'All fields are required' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (new_password.length < 8) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Password must be at least 8 characters long' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get the password reset request
    const { data: resetRequest, error: fetchError } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('reset_code', reset_code)
      .eq('used', false)
      .single();

    if (fetchError || !resetRequest) {
      console.log('Reset request not found or already used');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid or expired reset code' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check if code is expired
    if (new Date(resetRequest.expires_at) < new Date()) {
      console.log('Reset code expired');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Reset code has expired. Please request a new one.' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check attempts
    if (resetRequest.attempts >= 5) {
      console.log('Too many attempts');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Too many failed attempts. Please request a new reset code.' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw new Error('Failed to process password reset');
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    
    // Use generic error message to prevent user enumeration
    if (!user) {
      console.log('User not found in auth');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Password reset could not be completed. Please try again or request a new reset code.' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to update password. Please try again.' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Mark the reset code as used
    await supabase
      .from('password_reset_requests')
      .update({ used: true })
      .eq('id', resetRequest.id);

    console.log('Password reset completed successfully for:', email);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error completing password reset:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateEmailRequest {
  user_id: string;
  new_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      throw new Error('Unauthorized');
    }

    // Check if caller is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { user_id, new_email }: UpdateEmailRequest = await req.json();

    if (!user_id || !new_email) {
      throw new Error('Missing required fields');
    }

    console.log('Admin updating email for user:', user_id, 'to:', new_email);

    // Update email in auth.users table using Admin API
    const { data: authData, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: new_email, email_confirm: true }
    );

    if (updateAuthError) {
      console.error('Error updating auth user email:', updateAuthError);
      throw new Error(`Failed to update auth email: ${updateAuthError.message}`);
    }

    // Update email in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: new_email })
      .eq('id', user_id);

    if (profileError) {
      console.error('Error updating profile email:', profileError);
      throw new Error(`Failed to update profile email: ${profileError.message}`);
    }

    console.log('Email updated successfully for user:', user_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email updated successfully' 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error updating user email:", error);
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

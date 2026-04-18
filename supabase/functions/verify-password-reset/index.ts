import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPasswordResetRequest {
  email: string;
  date_of_birth: string; // YYYY-MM-DD format
  phone_last_4: string;
}

// Generate a 6-digit reset code
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 10;
const BLOCK_DURATION_MINUTES = 30;

// Generic error message to prevent user enumeration
const GENERIC_ERROR = 'The information provided does not match our records';

async function checkRateLimit(
  supabase: any,
  identifier: string,
  identifierType: 'ip' | 'email'
): Promise<{ allowed: boolean; blockedUntil?: string }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  
  // Check if blocked
  const { data: existing } = await supabase
    .from('password_reset_rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .single();
  
  if (existing?.blocked_until) {
    const blockedUntil = new Date(existing.blocked_until);
    if (blockedUntil > now) {
      return { allowed: false, blockedUntil: existing.blocked_until };
    }
    // Block expired, reset the record
    await supabase
      .from('password_reset_rate_limits')
      .delete()
      .eq('id', existing.id);
  }
  
  const maxAttempts = identifierType === 'email' ? MAX_ATTEMPTS_PER_EMAIL : MAX_ATTEMPTS_PER_IP;
  
  if (existing && new Date(existing.first_attempt_at) > windowStart) {
    if (existing.attempt_count >= maxAttempts) {
      // Block this identifier
      const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000);
      await supabase
        .from('password_reset_rate_limits')
        .update({ blocked_until: blockedUntil.toISOString() })
        .eq('id', existing.id);
      return { allowed: false, blockedUntil: blockedUntil.toISOString() };
    }
    
    // Increment attempt count
    await supabase
      .from('password_reset_rate_limits')
      .update({ 
        attempt_count: existing.attempt_count + 1,
        last_attempt_at: now.toISOString()
      })
      .eq('id', existing.id);
  } else if (existing) {
    // Reset the window
    await supabase
      .from('password_reset_rate_limits')
      .update({
        attempt_count: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
        blocked_until: null
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase
      .from('password_reset_rate_limits')
      .insert({
        identifier,
        identifier_type: identifierType,
        attempt_count: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString()
      });
  }
  
  return { allowed: true };
}

async function logAudit(
  supabase: any,
  email: string,
  action: string,
  success: boolean,
  ipAddress: string | null,
  userAgent: string | null,
  failureReason?: string
) {
  try {
    await supabase
      .from('password_reset_audit')
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
        action,
        success,
        failure_reason: failureReason
      });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get client IP and user agent for audit logging
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = req.headers.get('user-agent');

  try {
    const { email, date_of_birth, phone_last_4 }: VerifyPasswordResetRequest = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();

    console.log('Processing password reset verification for:', normalizedEmail);

    // Validate inputs
    if (!email || !date_of_birth || !phone_last_4) {
      await logAudit(supabase, email || 'unknown', 'initiated', false, clientIp, userAgent, 'Missing required fields');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'All fields are required' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (phone_last_4.length !== 4 || !/^\d{4}$/.test(phone_last_4)) {
      await logAudit(supabase, normalizedEmail, 'initiated', false, clientIp, userAgent, 'Invalid phone format');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Please enter exactly 4 digits for phone number' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Check rate limits for both IP and email
    const ipRateCheck = await checkRateLimit(supabase, clientIp, 'ip');
    if (!ipRateCheck.allowed) {
      await logAudit(supabase, normalizedEmail, 'initiated', false, clientIp, userAgent, 'IP rate limit exceeded');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Too many attempts. Please try again later.' 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const emailRateCheck = await checkRateLimit(supabase, normalizedEmail, 'email');
    if (!emailRateCheck.allowed) {
      await logAudit(supabase, normalizedEmail, 'initiated', false, clientIp, userAgent, 'Email rate limit exceeded');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Too many attempts for this email. Please try again later.' 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Log the attempt
    await logAudit(supabase, normalizedEmail, 'initiated', true, clientIp, userAgent);

    // Get user profile by email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, date_of_birth, phone')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profileData) {
      console.log('User not found:', normalizedEmail);
      await logAudit(supabase, normalizedEmail, 'verified', false, clientIp, userAgent, 'User not found');
      // Don't reveal whether user exists
      return new Response(JSON.stringify({ 
        success: false,
        error: GENERIC_ERROR
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Verify date of birth
    const userDob = profileData.date_of_birth;
    if (!userDob || userDob !== date_of_birth) {
      console.log('DOB mismatch');
      await logAudit(supabase, normalizedEmail, 'verified', false, clientIp, userAgent, 'DOB mismatch');
      return new Response(JSON.stringify({ 
        success: false,
        error: GENERIC_ERROR
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Verify last 4 digits of phone
    const userPhone = profileData.phone?.replace(/\D/g, ''); // Remove non-digits
    if (!userPhone || !userPhone.endsWith(phone_last_4)) {
      console.log('Phone mismatch');
      await logAudit(supabase, normalizedEmail, 'verified', false, clientIp, userAgent, 'Phone mismatch');
      return new Response(JSON.stringify({ 
        success: false,
        error: GENERIC_ERROR
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // All verifications passed - generate reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes (reduced from 15)

    // Clean up any existing reset requests for this email
    await supabase
      .from('password_reset_requests')
      .delete()
      .eq('email', normalizedEmail);

    // Store the reset code
    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        email: normalizedEmail,
        reset_code: resetCode,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error storing reset code:', insertError);
      await logAudit(supabase, normalizedEmail, 'code_sent', false, clientIp, userAgent, 'Failed to store reset code');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to generate reset code. Please try again.' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('Identity verified, reset code generated for:', normalizedEmail);
    await logAudit(supabase, normalizedEmail, 'code_sent', true, clientIp, userAgent);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Identity verified. Reset code will be sent to your email.',
      reset_code: resetCode, // This will be used by send-password-reset
      user_name: profileData.full_name
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in password reset verification:", error);
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

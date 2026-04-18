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
    const { email, bankName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if auth emails are enabled
    const { data: settings } = await supabaseAdmin
      .from('website_settings')
      .select('auth_emails_enabled, smtp_enabled, resend_enabled, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_use_ssl, bank_name')
      .single();

    if (!settings?.auth_emails_enabled) {
      console.log('Auth emails are disabled - skipping verification email');
      // Return success with explicit skip flag
      return new Response(
        JSON.stringify({ success: true, emailSent: false, skipped: true, message: 'Email verification is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any email provider is properly configured
    const smtpConfigured = settings.smtp_enabled && settings.smtp_host;
    const resendConfigured = settings.resend_enabled;

    if (!smtpConfigured && !resendConfigured) {
      console.log('No email provider properly configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          emailSent: false, 
          skipped: false,
          error: 'Email provider not configured. Please configure SMTP or Resend in admin settings.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing codes for this email
    await supabaseAdmin
      .from('email_verification_codes')
      .delete()
      .eq('email', email.toLowerCase());

    // Insert the new verification code
    const { error: insertError } = await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        email: email.toLowerCase(),
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error inserting verification code:', insertError);
      throw new Error('Failed to generate verification code');
    }

    const effectiveBankName = bankName || settings.bank_name || 'Your Bank';

    // Fetch the email template from database
    const { data: templateData } = await supabaseAdmin
      .from('email_templates')
      .select('subject_template, html_template, is_active')
      .eq('template_name', 'account_application_verification')
      .single();

    let emailSubject: string;
    let emailHtml: string;

    if (templateData && templateData.is_active) {
      // Use custom template with variable replacement (support both {var} and {{var}} formats)
      const templateVariables: Record<string, string> = {
        bank_name: effectiveBankName,
        verification_code: verificationCode,
        expiry_time: '15 minutes',
        applicant_email: email,
        user_name: email,
        contact_email: settings.smtp_from_email || 'support@bank.com',
      };
      
      emailSubject = templateData.subject_template;
      emailHtml = templateData.html_template;
      
      Object.entries(templateVariables).forEach(([key, value]) => {
        const singleBrace = new RegExp(`\\{${key}\\}`, 'g');
        const doubleBrace = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        emailSubject = emailSubject.replace(singleBrace, value).replace(doubleBrace, value);
        emailHtml = emailHtml.replace(singleBrace, value).replace(doubleBrace, value);
      });
    } else {
      // Fall back to hardcoded template
      emailSubject = `${effectiveBankName} - Email Verification Code`;
      emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#1a365d 0%,#2d4a77 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;font-size:24px;">${effectiveBankName}</h1><p style="color:rgba(255,255,255,0.8);margin:10px 0 0 0;font-size:14px;">Account Application Verification</p></div><div style="background-color:#f8fafc;padding:30px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none;"><h2 style="color:#1a365d;margin-top:0;">Verify Your Email Address</h2><p>Thank you for applying for an account with ${effectiveBankName}. To continue with your application, please enter the following verification code:</p><div style="background-color:#1a365d;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;text-align:center;border-radius:8px;margin:25px 0;">${verificationCode}</div><p style="color:#64748b;font-size:14px;">This code will expire in <strong>15 minutes</strong>.</p><div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;"><p style="margin:0;color:#92400e;font-size:14px;"><strong>Security Notice:</strong> If you did not initiate this account application, please disregard this email.</p></div><p style="color:#64748b;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">This is an automated message from ${effectiveBankName}. Please do not reply to this email.</p></div></body></html>`;
    }

    let emailSent = false;

    // Send email via configured provider
    if (settings.smtp_enabled && settings.smtp_host) {
      // Use SMTP
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
      
      const port = settings.smtp_port || 587;
      // Port 465 uses implicit TLS, port 587/25 use STARTTLS
      const useImplicitTLS = port === 465;
      
      const client = new SMTPClient({
        connection: {
          hostname: settings.smtp_host,
          port: port,
          // Only use tls:true for port 465 (implicit TLS)
          // For port 587, denomailer handles STARTTLS automatically when tls is false
          tls: useImplicitTLS,
          auth: {
            username: settings.smtp_username || '',
            password: settings.smtp_password || '',
          },
        },
      });

      // Minify HTML to prevent Quoted-Printable encoding issues (=20 artifacts)
      const minifiedHtml = emailHtml.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim();

      await client.send({
        from: settings.smtp_from_email || 'noreply@bank.com',
        to: email,
        subject: emailSubject,
        content: "Please view this email in an HTML-compatible email client.",
        html: minifiedHtml,
      });

      await client.close();
      emailSent = true;
      console.log('Verification email sent via SMTP to:', email);
    } else if (settings.resend_enabled) {
      // Use Resend
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        throw new Error('Resend API key not configured');
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${effectiveBankName} <onboarding@resend.dev>`,
          to: [email],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend API error: ${errorData}`);
      }

      emailSent = true;
      console.log('Verification email sent via Resend to:', email);
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, message: 'Verification code sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

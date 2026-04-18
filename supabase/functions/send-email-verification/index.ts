import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "https://esm.sh/resend@2.0.0";
import nodemailer from "npm:nodemailer@6.9.10";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailVerificationRequest {
  email: string;
  verification_code: string;
  user_name?: string;
  language?: string;
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

    const { email, verification_code, user_name, language = 'en' }: EmailVerificationRequest = await req.json();
    
    const t = getEmailTranslations(language);

    console.log('Processing email verification for:', email, 'Language:', language);

    // Get bank settings
    const { data: settingsData } = await supabase.rpc('get_website_settings');
    const settings = settingsData?.[0];
    const bankName = settings?.bank_name || 'Wyseforte Bank';
    const contactEmail = settings?.contact_email || 'info@wyseforte.co.uk';

    const smtpEnabled = settings?.smtp_enabled;
    const resendEnabled = settings?.resend_enabled ?? true;

    const emailHtml = getLocalizedVerificationTemplate(t, {
      user_name: user_name || 'User',
      verification_code,
      bank_name: bankName,
      contact_email: contactEmail,
    });

    let emailResult;

    // Try SMTP first
    if (smtpEnabled && settings?.smtp_host && settings?.smtp_username && settings?.smtp_password) {
      try {
        const smtpPort = settings.smtp_port || 587;
        
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: settings.smtp_username,
            pass: settings.smtp_password,
          },
          connectionTimeout: 15000,
        });

        await transporter.sendMail({
          from: `${settings.smtp_from_name || bankName} <${settings.smtp_from_email || settings.smtp_username}>`,
          to: email,
          subject: `${t.verifyYourEmail} - ${bankName}`,
          text: "Please view this email in an HTML-capable client.",
          html: emailHtml,
        });

        emailResult = { success: true, method: 'smtp' };
        console.log("Email verification sent successfully via SMTP");
      } catch (smtpError: any) {
        console.error('SMTP failed, will try Resend:', smtpError);
        emailResult = null;
      }
    }

    // Fallback to Resend
    if (!emailResult && resendEnabled) {
      const emailResponse = await resend.emails.send({
        from: `${bankName} <onboarding@resend.dev>`,
        to: [email],
        subject: `${t.verifyYourEmail} - ${bankName}`,
        html: emailHtml,
      });

      emailResult = { success: true, method: 'resend', email_id: emailResponse.data?.id };
      console.log("Email verification sent successfully via Resend:", emailResponse);
    }

    if (!emailResult) {
      throw new Error('No email provider available');
    }

    console.log("Email verification sent successfully:", emailResult);
    return new Response(JSON.stringify({
      success: true, 
      message: 'Email verification sent successfully'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error sending email verification:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

function getLocalizedVerificationTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  user_name: string;
  verification_code: string;
  bank_name: string;
  contact_email: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.emailVerification}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #1e40af; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">${t.emailVerification}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${t.dear} ${vars.user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">${t.emailVerificationDesc}</p>
      
      <div style="background-color: #f8fafc; border: 2px solid #1e40af; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px;">
          ${vars.verification_code}
        </div>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        ${t.codeExpiresIn10}. ${t.secureNotice}
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        ${t.contactUs}: ${vars.contact_email}
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">${vars.bank_name}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">Secure Banking Solutions</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);

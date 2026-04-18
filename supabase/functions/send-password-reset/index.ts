import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPasswordResetRequest {
  email: string;
  reset_code: string;
  user_name: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { email, reset_code, user_name, language = 'en' }: SendPasswordResetRequest = await req.json();
    
    // Get translations for the user's language
    const t = getEmailTranslations(language);

    console.log("Sending password reset email to:", email, "Language:", language);

    // Get website settings for branding and email provider
    const { data: settingsData } = await supabase.rpc("get_website_settings");
    const settings = settingsData?.[0];

    const bankName = settings?.bank_name || "Wyseforte Bank";
    const bankAddress = settings?.bank_address || "Oscar van Goidtsnovenlaan 6, Brussels 1180, Belgium";
    const contactEmail = settings?.support_email || settings?.bank_email || "support@wyseforte.co.uk";

    // CRITICAL: Authentication emails should ALWAYS be sent regardless of email_alerts_enabled
    // Only check if a provider is available
    const smtpEnabled = settings?.smtp_enabled;
    const resendEnabled = settings?.resend_enabled ?? true;
    const smtpHost = settings?.smtp_host;
    const smtpUsername = settings?.smtp_username;
    const smtpPassword = settings?.smtp_password;
    const smtpPort = settings?.smtp_port || 587;
    const smtpUseSsl = settings?.smtp_use_ssl ?? true;
    const smtpFromEmail = settings?.smtp_from_email || smtpUsername;
    const smtpFromName = settings?.smtp_from_name || bankName;

    const subject = `${t.passwordReset} - ${bankName}`;
    const htmlContent = getLocalizedPasswordResetTemplate(t, {
      user_name,
      reset_code,
      bank_name: bankName,
      bank_address: bankAddress,
      contact_email: contactEmail,
    });

    let emailResult;

    // Try SMTP first if enabled
    if (smtpEnabled && smtpHost && smtpUsername && smtpPassword) {
      console.log("Sending password reset email via SMTP:", smtpHost);
      try {
        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: smtpUseSsl,
            auth: {
              username: smtpUsername,
              password: smtpPassword,
            },
          },
        });

        await client.send({
          from: `${smtpFromName} <${smtpFromEmail}>`,
          to: [email],
          subject: subject,
          content: "Please view this email in an HTML-capable client.",
          html: htmlContent,
        });

        await client.close();
        emailResult = { success: true, method: "smtp" };
        console.log("Password reset email sent successfully via SMTP");
      } catch (smtpError: any) {
        console.error("SMTP failed, will try Resend:", smtpError);
        emailResult = null;
      }
    }

    // Fallback to Resend if SMTP failed or not configured
    if (!emailResult && resendEnabled) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("No email sending method available - Resend API key not configured");
      }

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: `${bankName} <onboarding@resend.dev>`,
        to: [email],
        subject: subject,
        html: htmlContent,
      });

      emailResult = { success: true, method: "resend", email_id: emailResponse.data?.id };
      console.log("Password reset email sent successfully via Resend:", emailResponse);
    }

    if (!emailResult) {
      throw new Error("No email provider available");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset email sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

function getLocalizedPasswordResetTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  user_name: string;
  reset_code: string;
  bank_name: string;
  bank_address: string;
  contact_email: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.passwordReset}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🔐 ${t.passwordReset}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${t.dear} ${vars.user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">${t.passwordResetDesc}</p>
      
      <div style="background-color: #f0f7ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <div style="font-size: 36px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px; margin-bottom: 10px;">
          ${vars.reset_code}
        </div>
        <p style="font-size: 14px; color: #666; margin: 0;">${t.codeExpiresIn15}</p>
      </div>
      
      <p style="font-size: 14px; color: #ef4444; margin-bottom: 20px;">
        <strong>${t.didNotRequestReset} ${vars.contact_email}.</strong>
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">${vars.bank_name}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">${vars.bank_address}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import nodemailer from "npm:nodemailer@6.9.10";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Email2FARequest {
  email: string;
  language?: string;
}

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get location from IP using a free geolocation API
async function getLocationFromIP(ip: string): Promise<string> {
  try {
    if (ip === "127.0.0.1" || ip === "localhost" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "::1") {
      return "Local Network";
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
    const data = await response.json();

    if (data.status === "success") {
      return `${data.city || "Unknown City"}, ${data.country || "Unknown Country"}`;
    }
    return "Unknown Location";
  } catch (error) {
    console.error("Error fetching location:", error);
    return "Unknown Location";
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { email, language = 'en' }: Email2FARequest = await req.json();
    
    const t = getEmailTranslations(language);

    const clientIP =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "Unknown";

    console.log("Processing email 2FA for:", email, "IP:", clientIP, "Language:", language);

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user data:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if email 2FA is enabled
    const { data: securityData, error: securityError } = await supabase
      .from("user_security")
      .select("email_2fa_enabled, email_2fa_last_sent_at")
      .eq("user_id", userData.id)
      .single();

    if (securityError && securityError.code !== "PGRST116") {
      console.error("Error fetching security data:", securityError);
      return new Response(JSON.stringify({ error: "Security settings not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!securityData?.email_2fa_enabled) {
      return new Response(
        JSON.stringify({
          requires_2fa: false,
          message: "Email 2FA not enabled for this user",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Rate limiting
    if (securityData.email_2fa_last_sent_at) {
      const lastSent = new Date(securityData.email_2fa_last_sent_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;

      if (diffSeconds < 60) {
        return new Response(
          JSON.stringify({
            error: "Please wait before requesting another code",
            wait_seconds: Math.ceil(60 - diffSeconds),
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const location = await getLocationFromIP(clientIP);

    // Store verification code
    const { error: updateError } = await supabase
      .from("user_security")
      .update({
        email_2fa_code: verificationCode,
        email_2fa_code_expires_at: expiresAt.toISOString(),
        email_2fa_last_sent_at: new Date().toISOString(),
      })
      .eq("user_id", userData.id);

    if (updateError) {
      console.error("Error storing verification code:", updateError);
      return new Response(JSON.stringify({ error: "Failed to generate verification code" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get website settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("website_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching website settings:", settingsError);
    }

    const settings = settingsData;
    const bankName = settings?.bank_name || "Wyseforte Bank";
    const bankAddress = settings?.bank_address || "Oscar van Goidtsnovenlaan 6, Brussels 1180, Belgium";
    const contactEmail = settings?.support_email || settings?.bank_email || "support@wyseforte.co.uk";

    // Get email template
    const { data: templateData } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_name", "email_2fa_login")
      .eq("is_active", true)
      .single();

    const loginTime = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC";

    let processedSubject: string;
    let processedHtml: string;

    if (templateData) {
      processedSubject = templateData.subject_template;
      processedHtml = templateData.html_template;
      
      const templateVariables: Record<string, string> = {
        user_name: userData.full_name,
        user_email: userData.email,
        bank_name: bankName,
        bank_address: bankAddress,
        contact_email: contactEmail,
        verification_code: verificationCode,
        login_ip: clientIP,
        login_location: location,
        login_time: loginTime,
      };

      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex1 = new RegExp(`\\{${key}\\}`, "g");
        const regex2 = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        processedSubject = processedSubject.replace(regex1, value).replace(regex2, value);
        processedHtml = processedHtml.replace(regex1, value).replace(regex2, value);
      });
    } else {
      processedSubject = `${t.loginVerification} - ${bankName}`;
      processedHtml = getLocalizedTemplate(t, {
        userName: userData.full_name,
        verificationCode,
        clientIP,
        location,
        loginTime,
        contactEmail,
        bankName,
        bankAddress,
      });
    }

    const smtpEnabled = settings?.smtp_enabled ?? false;
    const resendEnabled = settings?.resend_enabled ?? false;
    const smtpHost = settings?.smtp_host;
    const smtpUsername = settings?.smtp_username;
    const smtpPassword = settings?.smtp_password;
    const smtpPort = settings?.smtp_port || 587;
    const smtpFromEmail = settings?.smtp_from_email || smtpUsername;
    const smtpFromName = settings?.smtp_from_name || bankName;

    const smtpConfigured = smtpEnabled && smtpHost && smtpUsername && smtpPassword;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendConfigured = resendEnabled && resendApiKey;

    if (!smtpConfigured && !resendConfigured) {
      console.error("No email provider configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email provider not configured. Please configure SMTP or Resend in Admin Website Settings.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    let emailResult;

    // Try SMTP first
    if (smtpConfigured) {
      console.log("Sending 2FA email via SMTP:", smtpHost);
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUsername,
            pass: smtpPassword,
          },
          connectionTimeout: 15000,
        });

        await transporter.sendMail({
          from: `${smtpFromName} <${smtpFromEmail}>`,
          to: userData.email,
          subject: processedSubject,
          text: "Please view this email in an HTML-capable client.",
          html: processedHtml,
        });

        emailResult = { success: true, method: "smtp" };
        console.log("2FA email sent successfully via SMTP");
      } catch (smtpError: any) {
        console.error("SMTP failed:", smtpError);
        if (!resendConfigured) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "SMTP email sending failed. Please check SMTP configuration.",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      }
    }

    // Fallback to Resend
    if (!emailResult && resendConfigured) {
      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: `${bankName} <onboarding@resend.dev>`,
        to: [userData.email],
        subject: processedSubject,
        html: processedHtml,
      });

      emailResult = { success: true, method: "resend", email_id: emailResponse.data?.id };
      console.log("2FA email sent successfully via Resend:", emailResponse);
    }

    return new Response(
      JSON.stringify({
        success: true,
        requires_2fa: true,
        message: "Verification code sent to your email",
        user_id: userData.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error sending 2FA email:", error);
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

function getLocalizedTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  userName: string;
  verificationCode: string;
  clientIP: string;
  location: string;
  loginTime: string;
  contactEmail: string;
  bankName: string;
  bankAddress: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.loginVerification}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🔐 ${t.loginVerification}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${t.dear} ${vars.userName},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">${t.loginVerificationDesc}</p>
      
      <div style="background-color: #f0f7ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <div style="font-size: 36px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px; margin-bottom: 10px;">
          ${vars.verificationCode}
        </div>
        <p style="font-size: 14px; color: #666; margin: 0;">${t.codeExpiresIn10}</p>
      </div>
      
      <div style="background-color: #fff8e6; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #92400e; margin: 0 0 10px 0;"><strong>⚠️ ${t.securityNotice}</strong></p>
        <p style="font-size: 14px; color: #92400e; margin: 0;">${t.ipAddress}: ${vars.clientIP}</p>
        <p style="font-size: 14px; color: #92400e; margin: 0;">${t.location}: ${vars.location}</p>
        <p style="font-size: 14px; color: #92400e; margin: 0;">${t.time}: ${vars.loginTime}</p>
      </div>
      
      <p style="font-size: 14px; color: #ef4444; margin-bottom: 20px;">
        <strong>${t.didNotAttemptLogin} ${vars.contactEmail}.</strong>
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">${vars.bankName}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">${vars.bankAddress}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionEmailRequest {
  user_id: string;
  transaction_type: string;
  amount: number;
  description: string;
  account_number: string;
  reference_number: string;
  new_balance: number;
  currency?: string;
  language?: string;
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CHF: "CHF ",
    CAD: "C$",
    AUD: "A$",
  };
  return symbols[currency?.toUpperCase()] || "$";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const {
      user_id,
      transaction_type,
      amount,
      description,
      account_number,
      reference_number,
      new_balance,
      currency = "USD",
      language = 'en',
    }: TransactionEmailRequest = await req.json();
    
    // Get translations for the user's language
    const t = getEmailTranslations(language);

    console.log("Processing email alert for transaction:", { user_id, transaction_type, amount, language });

    // Query website_settings directly using service role (bypasses RLS)
    const { data: settingsData, error: settingsError } = await supabase
      .from("website_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching website settings:", settingsError);
    }

    const emailAlertsEnabled = settingsData?.email_alerts_enabled ?? true;

    if (!emailAlertsEnabled) {
      console.log("Email alerts are disabled globally");
      return new Response(JSON.stringify({ message: "Email alerts disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user data:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine template type based on transaction
    const isCredit = ["deposit"].includes(transaction_type);
    const templateType = isCredit ? "credit_alert" : "debit_alert";

    // Get email template from database
    const { data: templateData, error: templateError } = await supabase.rpc("get_active_template", {
      p_template_name: templateType,
    });

    // Get bank settings for branding
    const bankName = settingsData?.bank_name || "Wyseforte Bank";
    const bankAddress = settingsData?.bank_address || "Oscar van Goidtsnovenlaan 6, Brussels 1180, Belgium";
    const contactEmail = settingsData?.support_email || "info@wyseforte.co.uk";
    const bankEmail = settingsData?.bank_email || settingsData?.support_email || "support@wyseforte.co.uk";
    const bankPhone = settingsData?.bank_phone || "";

    // Get currency symbol for proper formatting
    const currencySymbol = getCurrencySymbol(currency);
    const formattedAmount = `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedBalance = `${currencySymbol}${new_balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let processedSubject: string;
    let processedHtml: string;

    if (!templateError && templateData?.[0]) {
      const template = templateData[0];
      processedSubject = template.subject_template;
      processedHtml = template.html_template;

      // Process template variables
      const templateVariables: Record<string, string> = {
        user_name: userData.full_name,
        user_email: userData.email,
        bank_name: bankName,
        bank_address: bankAddress,
        contact_email: contactEmail,
        bank_email: bankEmail,
        bank_phone: bankPhone,
        transaction_type: transaction_type,
        amount: formattedAmount,
        description: description,
        reference_number: reference_number,
        new_balance: formattedBalance,
        account_number: account_number,
        transaction_date: new Date().toLocaleString(),
        currency: currency,
        currency_symbol: currencySymbol,
      };

      // Replace template variables (support both {var} and {{var}} formats)
      Object.entries(templateVariables).forEach(([key, value]) => {
        const singleBrace = new RegExp(`\\{${key}\\}`, "g");
        const doubleBrace = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        processedSubject = processedSubject.replace(singleBrace, value).replace(doubleBrace, value);
        processedHtml = processedHtml.replace(singleBrace, value).replace(doubleBrace, value);
      });
    } else {
      // Use runtime-translated template
      const alertTitle = isCredit ? t.creditAlert : t.debitAlert;
      processedSubject = `${alertTitle} - ${bankName}`;
      processedHtml = getLocalizedTransactionTemplate(t, {
        isCredit,
        userName: userData.full_name,
        transactionType: transaction_type,
        formattedAmount,
        description,
        accountNumber: account_number,
        referenceNumber: reference_number,
        formattedBalance,
        transactionDate: new Date().toLocaleString(),
        contactEmail,
        bankName,
        bankAddress,
      });
    }

    // Check if SMTP is enabled
    const smtpEnabled = settingsData?.smtp_enabled;
    const smtpHost = settingsData?.smtp_host;
    const smtpUsername = settingsData?.smtp_username;
    const smtpPassword = settingsData?.smtp_password;
    const smtpPort = settingsData?.smtp_port || 587;
    const smtpUseSsl = settingsData?.smtp_use_ssl ?? true;
    const smtpFromEmail = settingsData?.smtp_from_email || smtpUsername;
    const smtpFromName = settingsData?.smtp_from_name || bankName;

    let emailResult;

    if (smtpEnabled && smtpHost && smtpUsername && smtpPassword) {
      console.log("Sending email via SMTP:", smtpHost, "port:", smtpPort);
      try {
        // Port 465 uses implicit TLS, ports 587/25 use STARTTLS
        const useImplicitTls = smtpPort === 465;

        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: useImplicitTls,
            auth: {
              username: smtpUsername,
              password: smtpPassword,
            },
          },
        });

        // Minify HTML to prevent Quoted-Printable encoding issues (=20 artifacts)
        const minifiedHtml = processedHtml
          .replace(/\n/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        await client.send({
          from: `${smtpFromName} <${smtpFromEmail}>`,
          to: [userData.email],
          subject: processedSubject,
          content: "Please view this email in an HTML-capable client.",
          html: minifiedHtml,
        });

        await client.close();
        emailResult = { success: true, method: "smtp" };
        console.log("Transaction email sent successfully via SMTP");
      } catch (smtpError: any) {
        console.error("SMTP failed, falling back to Resend:", smtpError);
        // Fall through to Resend
        emailResult = null;
      }
    }

    // Fallback to Resend
    if (!emailResult) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error("No email sending method available");
      }

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: `${bankName} <onboarding@resend.dev>`,
        to: [userData.email],
        subject: processedSubject,
        html: processedHtml,
      });

      emailResult = { success: true, method: "resend", email_id: emailResponse.data?.id };
      console.log("Transaction email sent successfully via Resend:", emailResponse);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Transaction email sent successfully",
        method: emailResult?.method,
        email_id: emailResult?.email_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error sending transaction email:", error);
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

function getLocalizedTransactionTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  isCredit: boolean;
  userName: string;
  transactionType: string;
  formattedAmount: string;
  description: string;
  accountNumber: string;
  referenceNumber: string;
  formattedBalance: string;
  transactionDate: string;
  contactEmail: string;
  bankName: string;
  bankAddress: string;
}): string {
  const alertType = vars.isCredit ? t.creditAlert : t.debitAlert;
  const alertDesc = vars.isCredit ? t.accountCredited : t.accountDebited;
  const alertIcon = vars.isCredit ? "✓" : "↓";
  const headerGradient = vars.isCredit
    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  const accentColor = vars.isCredit ? "#10b981" : "#f59e0b";
  const bgColor = vars.isCredit ? "#f0fdf4" : "#fffbeb";
  const borderColor = vars.isCredit ? "#10b981" : "#f59e0b";
  const textColor = vars.isCredit ? "#065f46" : "#92400e";
  const transactionSign = vars.isCredit ? "+" : "-";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alertType}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header with gradient -->
    <div style="background: ${headerGradient}; padding: 40px 30px; text-align: center;">
      <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px; color: white;">${alertIcon}</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">${alertType}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${t.transactionNotification}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 35px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">${t.dear} <strong>${vars.userName}</strong>,</p>
      <p style="font-size: 15px; color: #4b5563; margin-bottom: 30px; line-height: 1.6;">
        ${alertDesc}
      </p>
      
      <!-- Amount Card -->
      <div style="background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <p style="font-size: 14px; color: ${textColor}; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">${t.amount}</p>
        <p style="font-size: 42px; font-weight: 700; color: ${accentColor}; margin: 0;">
          ${transactionSign}${vars.formattedAmount}
        </p>
      </div>
      
      <!-- Transaction Details -->
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1f2937; margin: 0 0 15px; font-size: 15px; font-weight: 600;">${t.transferDetails}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${t.transactionType}</td>
            <td style="padding: 12px 0; font-size: 14px; color: #1f2937; font-weight: 500; text-align: right; border-bottom: 1px solid #e5e7eb;">${vars.transactionType}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${t.description}</td>
            <td style="padding: 12px 0; font-size: 14px; color: #1f2937; font-weight: 500; text-align: right; border-bottom: 1px solid #e5e7eb;">${vars.description}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${t.fromAccount}</td>
            <td style="padding: 12px 0; font-size: 14px; color: #1f2937; font-weight: 500; text-align: right; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${vars.accountNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${t.referenceNumber}</td>
            <td style="padding: 12px 0; font-size: 14px; color: #1f2937; font-weight: 500; text-align: right; font-family: monospace; border-bottom: 1px solid #e5e7eb;">${vars.referenceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${t.transactionDate}</td>
            <td style="padding: 12px 0; font-size: 14px; color: #1f2937; font-weight: 500; text-align: right; border-bottom: 1px solid #e5e7eb;">${vars.transactionDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #6b7280;">${t.newBalance}</td>
            <td style="padding: 12px 0; font-size: 16px; color: #059669; font-weight: 700; text-align: right;">${vars.formattedBalance}</td>
          </tr>
        </table>
      </div>
      
      ${!vars.isCredit ? `
      <!-- Security Notice for Debits -->
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 15px 20px; margin-bottom: 25px;">
        <p style="font-size: 14px; color: #991b1b; margin: 0; line-height: 1.5;">
          <strong>🔒 ${t.securityNotice}:</strong> ${t.didNotAuthorize} ${vars.contactEmail}.
        </p>
      </div>
      ` : ''}
      
      <!-- Contact Info -->
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px; line-height: 1.6;">
        ${t.contactUs}: <a href="mailto:${vars.contactEmail}" style="color: ${accentColor}; text-decoration: none;">${vars.contactEmail}</a>
      </p>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; text-align: center;">
        <p style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 5px;">${vars.bankName}</p>
        <p style="font-size: 13px; color: #9ca3af; margin: 0;">${vars.bankAddress}</p>
      </div>
    </div>
    
    <!-- Confidentiality Notice -->
    <div style="background-color: #f3f4f6; padding: 20px; text-align: center;">
      <p style="font-size: 11px; color: #6b7280; margin: 0; line-height: 1.5;">
        ${t.confidentialityNotice}
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);

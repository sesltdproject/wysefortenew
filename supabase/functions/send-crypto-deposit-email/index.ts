import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CryptoDepositEmailRequest {
  deposit_id: string;
  email_type: "pending" | "approved";
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { deposit_id, email_type, language = 'en' }: CryptoDepositEmailRequest = await req.json();
    
    // Get translations for the user's language
    const t = getEmailTranslations(language);
    
    console.log("Processing crypto deposit email:", { deposit_id, email_type, language });

    // Fetch deposit details with user and account info
    // Use explicit relationship reference to avoid PostgREST ambiguity with duplicate FKs
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from("crypto_deposits")
      .select(
        `
        *,
        accounts!crypto_deposits_account_id_fkey (account_number, account_type, balance, user_id)
      `,
      )
      .eq("id", deposit_id)
      .single();

    if (depositError || !deposit) {
      console.error("Error fetching deposit:", depositError);
      throw new Error("Deposit not found");
    }

    // Get user profile separately using the account's user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", deposit.accounts?.user_id || deposit.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    const userEmail = profile?.email;
    const userName = profile?.full_name || "Valued Customer";

    if (!userEmail) {
      console.error("User email not found for deposit:", deposit_id);
      throw new Error("User email not found");
    }

    // Get website/bank settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin.rpc("get_website_settings");
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    const settings = settingsData?.[0] || {};
    const bankName = settings.bank_name || "Bank";
    const bankEmail = settings.contact_email || settings.smtp_from_email || "support@wyseforte.co.uk";
    const bankPhone = settings.phone_number || "";

    // Determine which template to use
    const templateName = email_type === "approved" ? "crypto_deposit_approved" : "crypto_deposit_pending";

    // Fetch email template
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("template_name", templateName)
      .eq("is_active", true)
      .single();

    let processedSubject: string;
    let processedHtml: string;

    // Prepare variables for template replacement
    const variables: Record<string, string> = {
      bank_name: bankName,
      user_name: userName,
      amount: deposit.amount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00",
      crypto_type: deposit.crypto_type || "Cryptocurrency",
      transaction_hash: deposit.transaction_hash || "N/A",
      account_number: deposit.accounts?.account_number || "N/A",
      account_type: deposit.accounts?.account_type || "Account",
      new_balance:
        deposit.accounts?.balance?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ||
        "0.00",
      status: email_type === "approved" ? t.approved : t.pendingReview,
      submission_date: new Date(deposit.created_at).toLocaleString(),
      approval_date: new Date().toLocaleString(),
      bank_email: bankEmail,
      bank_phone: bankPhone,
      contact_email: bankEmail,
    };

    if (templateError || !templateData) {
      console.log("Template not found, using localized fallback:", templateName);
      // Use runtime-translated template
      const title = email_type === "approved" ? t.cryptoDepositApproved : t.cryptoDepositPending;
      processedSubject = `${title} - ${bankName}`;
      processedHtml = getLocalizedCryptoTemplate(t, {
        emailType: email_type,
        userName,
        amount: variables.amount,
        cryptoType: variables.crypto_type,
        transactionHash: variables.transaction_hash,
        accountNumber: variables.account_number,
        newBalance: variables.new_balance,
        bankName,
        bankEmail,
      });
    } else {
      // Process database template - replace all variable placeholders
      processedHtml = templateData.html_template;
      processedSubject = templateData.subject_template;

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        const doubleRegex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        processedHtml = processedHtml.replace(regex, value).replace(doubleRegex, value);
        processedSubject = processedSubject.replace(regex, value).replace(doubleRegex, value);
      });
    }

    console.log("Sending email to:", userEmail);

    // Send email via send-email-smtp function
    const { error: emailError } = await supabaseAdmin.functions.invoke("send-email-smtp", {
      body: {
        to: userEmail,
        subject: processedSubject,
        html: processedHtml,
        from_name: bankName,
      },
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send email");
    }

    console.log("Crypto deposit email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `${email_type} email sent successfully`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in send-crypto-deposit-email:", error);
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

function getLocalizedCryptoTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  emailType: "pending" | "approved";
  userName: string;
  amount: string;
  cryptoType: string;
  transactionHash: string;
  accountNumber: string;
  newBalance: string;
  bankName: string;
  bankEmail: string;
}): string {
  const isApproved = vars.emailType === "approved";
  const title = isApproved ? t.cryptoDepositApproved : t.cryptoDepositPending;
  const headerColor = isApproved ? "#10b981" : "#f59e0b";
  const statusLabel = isApproved ? t.approved : t.pendingReview;
  const icon = isApproved ? "✅" : "⏳";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: ${headerColor}; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">${icon} ${title}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${t.dear} ${vars.userName},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
        ${isApproved 
          ? `Your cryptocurrency deposit has been approved and credited to your account.`
          : `Your cryptocurrency deposit has been received and is pending review.`
        }
      </p>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 16px;">${t.transferDetails}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.amount}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">$${vars.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.cryptoType}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.cryptoType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.transactionHash}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace; word-break: break-all;">${vars.transactionHash}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.fromAccount}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.accountNumber}</td>
          </tr>
          ${isApproved ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.newBalance}:</td>
            <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: bold; text-align: right;">$${vars.newBalance}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.status}:</td>
            <td style="padding: 8px 0; color: ${isApproved ? '#10b981' : '#f59e0b'}; font-size: 14px; font-weight: bold; text-align: right;">${statusLabel}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        ${t.contactUs}: <a href="mailto:${vars.bankEmail}" style="color: #1e40af;">${vars.bankEmail}</a>
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">${vars.bankName}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailTranslations } from "../_shared/email-translations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferNotificationRequest {
  user_id: string;
  transfer_type: "domestic" | "international";
  notification_type: "submitted" | "approved" | "rejected";
  amount: number;
  reference_number: string;
  from_account: string;
  recipient_name: string;
  recipient_account?: string;
  recipient_bank: string;
  swift_code?: string;
  routing_code?: string;
  language?: string;
  admin_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const requestData: TransferNotificationRequest = await req.json();
    const {
      user_id,
      transfer_type,
      notification_type,
      amount,
      reference_number,
      from_account,
      recipient_name,
      recipient_account,
      recipient_bank,
      swift_code,
      routing_code,
      language = 'en',
      admin_notes,
    } = requestData;
    
    // Get translations for the user's language
    const t = getEmailTranslations(language);

    console.log("Processing transfer notification:", {
      user_id,
      transfer_type,
      notification_type,
      amount,
      reference_number,
      language,
    });

    // Get settings directly using service role (bypasses RLS)
    const { data: settingsData, error: settingsError } = await supabase.from("website_settings").select("*").single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailAlertsEnabled = settingsData?.email_alerts_enabled;

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

    // Determine template name based on transfer type and notification type
    const templateName = `${transfer_type}_transfer_${notification_type}`;
    console.log("Using template:", templateName);

    // Get email template from database
    const { data: templateData, error: templateError } = await supabase.rpc("get_active_template", {
      p_template_name: templateName,
    });

    // Get bank settings for branding (direct access, not array)
    const bankName = settingsData?.bank_name || "Wyseforte Bank";
    const bankAddress = settingsData?.bank_address || "Oscar van Goidtsnovenlaan 6, Brussels 1180, Belgium";
    const contactEmail = settingsData?.support_email || settingsData?.bank_email || "support@wyseforte.co.uk";
    const bankEmail = settingsData?.bank_email || settingsData?.support_email || "support@wyseforte.co.uk";
    const bankPhone = settingsData?.bank_phone || "";

    // Process template variables - format amount with thousands separator
    const formattedAmount = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    let processedSubject: string;
    let processedHtml: string;

    if (!templateError && templateData?.[0]) {
      const template = templateData[0];
      processedSubject = template.subject_template;
      processedHtml = template.html_template;

      const templateVariables: Record<string, string> = {
        user_name: userData.full_name,
        user_email: userData.email,
        bank_name: bankName,
        bank_address: bankAddress,
        contact_email: contactEmail,
        bank_email: bankEmail,
        bank_phone: bankPhone,
        amount: formattedAmount,
        reference_number: reference_number || "N/A",
        from_account: from_account || "N/A",
        recipient_name: recipient_name || "N/A",
        recipient_account: recipient_account || "N/A",
        recipient_bank: recipient_bank || "N/A",
        swift_code: swift_code || "N/A",
        routing_code: routing_code || "N/A",
        admin_notes: admin_notes || "N/A",
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
      const titleKey = notification_type === 'submitted' 
        ? t.transferSubmitted 
        : notification_type === 'rejected' 
          ? (t.transferRejected || 'Transfer Rejected')
          : t.transferApproved;
      const transferTypeLabel = transfer_type === 'international' ? t.internationalTransfer : t.domesticTransfer;
      
      processedSubject = `${titleKey} - ${bankName}`;
      processedHtml = getLocalizedTransferTemplate(t, {
        userName: userData.full_name,
        notificationType: notification_type,
        transferType: transfer_type,
        transferTypeLabel,
        amount: formattedAmount,
        referenceNumber: reference_number || "N/A",
        fromAccount: from_account || "N/A",
        recipientName: recipient_name || "N/A",
        recipientAccount: recipient_account || "N/A",
        recipientBank: recipient_bank || "N/A",
        swiftCode: swift_code,
        routingCode: routing_code,
        bankName,
        bankAddress,
        contactEmail,
        adminNotes: admin_notes,
      });
    }

    // Check if SMTP is enabled - access directly from settingsData (not array)
    const smtpEnabled = settingsData?.smtp_enabled;
    const smtpHost = settingsData?.smtp_host;
    const smtpUsername = settingsData?.smtp_username;
    const smtpPassword = settingsData?.smtp_password;
    const smtpPort = settingsData?.smtp_port || 587;
    const smtpFromEmail = settingsData?.smtp_from_email || smtpUsername;
    const smtpFromName = settingsData?.smtp_from_name || bankName;

    // TLS configuration: Port 465 = Implicit TLS, Port 587/25 = STARTTLS
    const useImplicitTLS = smtpPort === 465;

    let emailResult;

    if (smtpEnabled && smtpHost && smtpUsername && smtpPassword) {
      console.log("Sending email via SMTP:", smtpHost, "port:", smtpPort, "TLS:", useImplicitTLS);
      try {
        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: useImplicitTLS,
            auth: {
              username: smtpUsername,
              password: smtpPassword,
            },
          },
        });

        // Minify HTML to prevent Quoted-Printable encoding issues
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
        console.log("Transfer notification email sent successfully via SMTP");
      } catch (smtpError: any) {
        console.error("SMTP failed, falling back to Resend:", smtpError);
        emailResult = null;
      }
    }

    // Fallback to Resend
    if (!emailResult) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.error("No email sending method available");
        return new Response(
          JSON.stringify({
            success: false,
            error: "No email sending method configured",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: `${bankName} <onboarding@resend.dev>`,
        to: [userData.email],
        subject: processedSubject,
        html: processedHtml,
      });

      emailResult = { success: true, method: "resend", email_id: emailResponse.data?.id };
      console.log("Transfer notification email sent successfully via Resend:", emailResponse);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Transfer notification email sent successfully",
        method: emailResult?.method,
        template: templateName,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error sending transfer notification email:", error);
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

function getLocalizedTransferTemplate(t: ReturnType<typeof getEmailTranslations>, vars: {
  userName: string;
  notificationType: string;
  transferType: string;
  transferTypeLabel: string;
  amount: string;
  referenceNumber: string;
  fromAccount: string;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  swiftCode?: string;
  routingCode?: string;
  bankName: string;
  bankAddress: string;
  contactEmail: string;
  adminNotes?: string;
}): string {
  const isSubmitted = vars.notificationType === 'submitted';
  const isRejected = vars.notificationType === 'rejected';
  const statusLabel = isSubmitted ? t.pendingReview : isRejected ? (t.rejected || 'Rejected') : t.completed;
  const headerIcon = isSubmitted ? '📤' : isRejected ? '❌' : '✅';
  const title = isSubmitted ? t.transferSubmitted : isRejected ? (t.transferRejected || 'Transfer Rejected') : t.transferApproved;
  const headerColor = isSubmitted ? '#f59e0b' : isRejected ? '#ef4444' : '#10b981';

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
      <h1 style="color: white; margin: 0; font-size: 28px;">${headerIcon} ${title}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${t.dear} ${vars.userName},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
        ${isSubmitted 
          ? `Your ${vars.transferTypeLabel.toLowerCase()} has been submitted and is pending approval.`
          : isRejected
            ? `Your ${vars.transferTypeLabel.toLowerCase()} has been rejected.`
            : `Your ${vars.transferTypeLabel.toLowerCase()} has been approved and processed successfully.`
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
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.referenceNumber}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace;">${vars.referenceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.fromAccount}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.fromAccount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.recipientName}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.recipientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.recipientBank}:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.recipientBank}</td>
          </tr>
          ${vars.swiftCode ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">SWIFT/BIC:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace;">${vars.swiftCode}</td>
          </tr>
          ` : ''}
          ${vars.routingCode ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Routing Code:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; font-family: monospace;">${vars.routingCode}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.status}:</td>
            <td style="padding: 8px 0; color: ${isSubmitted ? '#f59e0b' : isRejected ? '#ef4444' : '#10b981'}; font-size: 14px; font-weight: bold; text-align: right;">${statusLabel}</td>
          </tr>
          ${isRejected && vars.adminNotes ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
            <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vars.adminNotes}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        ${t.contactUs}: <a href="mailto:${vars.contactEmail}" style="color: #1e40af;">${vars.contactEmail}</a>
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecisionRequest {
  application_id: string;
  decision: "approved" | "rejected";
  rejection_reason?: string;
  admin_notes?: string;
  account_number?: string;
  account_type?: string;
  login_email?: string;
  // SECURITY: Temporary password is passed in memory only, never stored
  temporary_password?: string;
  required_initial_deposit?: number;
  currency?: string;
}

// Format currency amount with proper locale
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
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

    const request: DecisionRequest = await req.json();
    const {
      application_id,
      decision,
      rejection_reason,
      account_number,
      account_type,
      login_email,
      temporary_password,
      required_initial_deposit,
      currency,
    } = request;

    console.log("Processing application decision:", { application_id, decision });

    // Fetch application details
    const { data: application, error: appError } = await supabaseAdmin
      .from("account_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Fetch website settings for bank info
    const { data: settingsData } = await supabaseAdmin.rpc("get_website_settings");
    const settings = settingsData?.[0] || {};

    const bankName = settings.bank_name || "Wyseforte Bank";
    const bankEmail = settings.bank_email || settings.support_email || "support@wyseforte.co.uk";
    const bankPhone = settings.bank_phone || "";

    // Fetch appropriate email template
    const templateName = decision === "approved" ? "application_approved" : "application_rejected";
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("template_name", templateName)
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      console.error("Template not found:", templateName, templateError);
      throw new Error(`Email template '${templateName}' not found or inactive`);
    }

    const applicantName = `${application.first_name} ${application.last_name}`;

    // Build variable replacements
    let htmlContent = templateData.html_template;
    let subjectContent = templateData.subject_template;

    // Common replacements
    const replacements: Record<string, string> = {
      "{{bank_name}}": bankName,
      "{bank_name}": bankName,
      "{{bank_email}}": bankEmail,
      "{bank_email}": bankEmail,
      "{{bank_phone}}": bankPhone,
      "{bank_phone}": bankPhone,
      "{{applicant_name}}": applicantName,
      "{applicant_name}": applicantName,
      "{{user_name}}": applicantName,
      "{user_name}": applicantName,
      "{{reference_number}}": application.reference_number,
      "{reference_number}": application.reference_number,
      "{{contact_email}}": bankEmail,
      "{contact_email}": bankEmail,
    };

    if (decision === "approved") {
      // Add approval-specific variables
      const formattedAccountType = (account_type || application.account_type || "Standard")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase());

      // SECURITY: Include the temporary password in the email
      // This password was generated server-side and is only sent via email
      // It is never stored in the database
      const passwordDisplay = temporary_password || "(Password sent separately)";
      const passwordMessage = "Please change your password after your first login for security.";
      
      // Format the required initial deposit
      const accountCurrency = currency || application.currency || 'USD';
      const depositDisplay = required_initial_deposit 
        ? formatCurrency(required_initial_deposit, accountCurrency)
        : "Contact support for details";

      replacements["{{account_number}}"] = account_number || "Pending Assignment";
      replacements["{account_number}"] = account_number || "Pending Assignment";
      replacements["{{account_type}}"] = formattedAccountType;
      replacements["{account_type}"] = formattedAccountType;
      // Use email for login, not username
      replacements["{{login_email}}"] = login_email || application.email;
      replacements["{login_email}"] = login_email || application.email;
      replacements["{{username}}"] = login_email || application.email; // Backward compatibility
      replacements["{username}"] = login_email || application.email;
      // SECURITY: Include the actual temporary password for user to login
      replacements["{{temporary_password}}"] = passwordDisplay;
      replacements["{temporary_password}"] = passwordDisplay;
      replacements["{{redacted_password}}"] = passwordDisplay;
      replacements["{redacted_password}"] = passwordDisplay;
      replacements["{{password_message}}"] = passwordMessage;
      replacements["{password_message}"] = passwordMessage;
      // Required initial deposit
      replacements["{{required_initial_deposit}}"] = depositDisplay;
      replacements["{required_initial_deposit}"] = depositDisplay;
    } else {
      // Rejection-specific variables
      replacements["{{rejection_reason}}"] =
        rejection_reason || "Your application did not meet our current requirements.";
      replacements["{rejection_reason}"] =
        rejection_reason || "Your application did not meet our current requirements.";
    }

    // Apply all replacements
    for (const [key, value] of Object.entries(replacements)) {
      htmlContent = htmlContent.split(key).join(value);
      subjectContent = subjectContent.split(key).join(value);
    }

    // Send email via send-email-smtp function
    const { error: emailError } = await supabaseAdmin.functions.invoke("send-email-smtp", {
      body: {
        to: application.email,
        subject: subjectContent,
        html: htmlContent,
        from_name: bankName,
      },
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Don't throw - log but continue (admin action already succeeded)
    }

    console.log(`Application ${decision} email sent to ${application.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${decision === "approved" ? "Approval" : "Rejection"} email sent successfully`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error sending application decision email:", error);
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

serve(handler);

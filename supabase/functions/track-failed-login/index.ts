import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackFailedLoginRequest {
  email: string;
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

    const { email }: TrackFailedLoginRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract client IP from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");

    let clientIp = "Unknown";
    if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else if (forwardedFor) {
      clientIp = forwardedFor.split(",")[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    }

    console.log(`Tracking failed login for ${email} from IP: ${clientIp}`);

    // Get user profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      // Don't reveal if user exists or not - return generic response
      console.log("Profile not found for email:", email);
      return new Response(
        JSON.stringify({
          warning_shown: false,
          locked: false,
          attempts: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Get current user_security record
    const { data: securityData, error: securityError } = await supabaseAdmin
      .from("user_security")
      .select("login_attempts, account_locked_until")
      .eq("user_id", profile.id)
      .single();

    // Check if account is currently locked
    if (securityData?.account_locked_until) {
      const lockedUntil = new Date(securityData.account_locked_until);
      if (lockedUntil > new Date()) {
        // Account is still locked
        return new Response(
          JSON.stringify({
            warning_shown: false,
            locked: true,
            locked_until: lockedUntil.toISOString(),
            attempts: securityData.login_attempts || 0,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      } else {
        // Lock has expired, reset attempts
        await supabaseAdmin
          .from("user_security")
          .update({
            login_attempts: 0,
            account_locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", profile.id);
      }
    }

    const currentAttempts = (securityData?.login_attempts || 0) + 1;
    const now = new Date();

    // Update login attempts
    if (securityError && securityError.code === "PGRST116") {
      // No record exists, create one
      await supabaseAdmin.from("user_security").insert({
        user_id: profile.id,
        login_attempts: currentAttempts,
        last_failed_attempt: now.toISOString(),
        updated_at: now.toISOString(),
      });
    } else {
      // Update existing record
      const updateData: any = {
        login_attempts: currentAttempts,
        last_failed_attempt: now.toISOString(),
        updated_at: now.toISOString(),
      };

      // Lock account on 3rd failed attempt
      if (currentAttempts >= 3) {
        const lockedUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
        updateData.account_locked_until = lockedUntil.toISOString();

        // Send failed login alert email
        try {
          // Get bank settings
          const { data: settingsData } = await supabaseAdmin.rpc("get_website_settings");
          const settings = settingsData?.[0] || {};
          const bankName = settings.bank_name || "Bank";
          const bankEmail = settings.contact_email || settings.smtp_from_email || "support@wyseforte.co.uk";

          // Get email template
          const { data: templateData } = await supabaseAdmin
            .from("email_templates")
            .select("*")
            .eq("template_name", "failed_login_alert")
            .eq("is_active", true)
            .single();

          if (templateData) {
            const variables: Record<string, string> = {
              user_name: profile.full_name || "Valued Customer",
              ip_address: clientIp,
              attempt_time: now.toLocaleString(),
              attempt_count: currentAttempts.toString(),
              locked_until: lockedUntil.toLocaleString(),
              bank_name: bankName,
              bank_email: bankEmail,
            };

            let processedHtml = templateData.html_template;
            let processedSubject = templateData.subject_template;

            Object.entries(variables).forEach(([key, value]) => {
              const regex = new RegExp(`\\{${key}\\}`, "g");
              const doubleRegex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
              processedHtml = processedHtml.replace(regex, value).replace(doubleRegex, value);
              processedSubject = processedSubject.replace(regex, value).replace(doubleRegex, value);
            });

            // Send email via send-email-smtp function
            await supabaseAdmin.functions.invoke("send-email-smtp", {
              body: {
                to: profile.email,
                subject: processedSubject,
                html: processedHtml,
                from_name: bankName,
              },
            });

            console.log("Failed login alert email sent to:", profile.email);
          }
        } catch (emailError) {
          console.error("Failed to send lockout email:", emailError);
          // Don't fail the request if email fails
        }
      }

      await supabaseAdmin.from("user_security").update(updateData).eq("user_id", profile.id);
    }

    // Determine response
    const showWarning = currentAttempts === 2; // Show warning on 2nd attempt
    const isLocked = currentAttempts >= 3;
    const lockedUntil = isLocked ? new Date(now.getTime() + 30 * 60 * 1000) : null;

    console.log(`Failed login tracked: ${currentAttempts} attempts, warning: ${showWarning}, locked: ${isLocked}`);

    return new Response(
      JSON.stringify({
        warning_shown: showWarning,
        locked: isLocked,
        locked_until: lockedUntil?.toISOString() || null,
        attempts: currentAttempts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in track-failed-login:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        warning_shown: false,
        locked: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);

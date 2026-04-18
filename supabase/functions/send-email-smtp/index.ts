import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "https://esm.sh/resend@2.0.0";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from_name?: string;
  from_email?: string;
}

interface SmtpSettings {
  smtp_enabled: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_username: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_use_ssl: boolean;
  bank_name: string | null;
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

    const emailRequest: EmailRequest = await req.json();
    const { to, subject, html, text, from_name, from_email } = emailRequest;

    console.log('Processing email request:', { to, subject });

    // Get SMTP settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('website_settings')
      .select('smtp_enabled, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_use_ssl, bank_name, resend_enabled')
      .limit(1)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError);
      console.log('Will attempt to use Resend as fallback');
    }

    const settings: SmtpSettings = settingsData || {} as SmtpSettings;
    const bankName = settings.bank_name || 'Bank';

    // Determine which method to use
    const useSmtp = settings.smtp_enabled && 
                    settings.smtp_host && 
                    settings.smtp_username && 
                    settings.smtp_password;

    const toAddresses = Array.isArray(to) ? to : [to];

    if (useSmtp) {
      console.log('Using SMTP to send email via:', settings.smtp_host);
      
      try {
        const port = settings.smtp_port || 465;
        
        // Create nodemailer transporter
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host!,
          port: port,
          secure: port === 465, // true for 465, false for other ports (STARTTLS)
          auth: {
            user: settings.smtp_username!,
            pass: settings.smtp_password!,
          },
          connectionTimeout: 15000,
        });

        const senderEmail = from_email || settings.smtp_from_email || settings.smtp_username!;
        const senderName = from_name || settings.smtp_from_name || bankName;

        const mailOptions = {
          from: `${senderName} <${senderEmail}>`,
          to: toAddresses.join(', '),
          subject: subject,
          text: text || "Please view this email in an HTML-capable client.",
          html: html,
        };

        await transporter.sendMail(mailOptions);

        console.log('Email sent successfully via SMTP');
        return new Response(JSON.stringify({ 
          success: true, 
          method: 'smtp',
          message: 'Email sent successfully via SMTP' 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (smtpError: any) {
        console.error('SMTP error, falling back to Resend:', smtpError);
        
        let smtpErrorMessage = smtpError.message;
        if (smtpError.code === 'ECONNREFUSED') {
          smtpErrorMessage = 'SMTP connection refused - verify host and port';
        } else if (smtpError.code === 'ETIMEDOUT') {
          smtpErrorMessage = 'SMTP connection timed out - check port (465 for SSL, 587 for STARTTLS)';
        }
        console.log('SMTP detailed error:', smtpErrorMessage);
        // Fall through to Resend
      }
    }

    // Use Resend as fallback or primary method
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('No email sending method available. Configure SMTP or set RESEND_API_KEY.');
    }

    console.log('Using Resend to send email');
    const resend = new Resend(resendApiKey);

    const senderName = from_name || settings.smtp_from_name || bankName;
    const emailResponse = await resend.emails.send({
      from: `${senderName} <onboarding@resend.dev>`,
      to: toAddresses,
      subject: subject,
      html: html,
    });

    console.log('Email sent successfully via Resend:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      method: 'resend',
      message: 'Email sent successfully via Resend',
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);

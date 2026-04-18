import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestSmtpRequest {
  test_email: string;
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

    const { test_email }: TestSmtpRequest = await req.json();

    console.log('Testing SMTP connection, sending to:', test_email);

    // Get SMTP settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('website_settings')
      .select('smtp_enabled, smtp_host, smtp_port, smtp_use_ssl, smtp_username, smtp_password, smtp_from_email, smtp_from_name, bank_name')
      .single();
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch SMTP settings');
    }
    
    if (!settings?.smtp_enabled) {
      throw new Error('SMTP is not enabled');
    }

    if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
      throw new Error('SMTP configuration is incomplete. Please fill in all required fields.');
    }

    const port = settings.smtp_port || 587;
    console.log('Connecting to SMTP server:', settings.smtp_host, 'port:', port);

    // Create nodemailer transporter
    // Port 465 = implicit TLS (secure: true)
    // Port 587/25 = STARTTLS (secure: false, upgrade happens automatically)
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: port,
      secure: port === 465, // true for 465, false for other ports (STARTTLS)
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password,
      },
      connectionTimeout: 15000, // 15 second timeout
    });

    const senderEmail = settings.smtp_from_email || settings.smtp_username;
    const senderName = settings.smtp_from_name || settings.bank_name || 'Bank';

    const mailOptions = {
      from: `${senderName} <${senderEmail}>`,
      to: test_email,
      subject: `SMTP Test - ${senderName}`,
      text: "This is a test email to verify SMTP configuration.",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SMTP Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #003366; margin-bottom: 20px;">✓ SMTP Test Successful</h1>
            <p style="color: #333; font-size: 16px; line-height: 1.5;">
              This email confirms that your SMTP configuration is working correctly.
            </p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 4px;">
              <p style="margin: 0; color: #15803d; font-size: 14px;">
                <strong>SMTP Server:</strong> ${settings.smtp_host}<br>
                <strong>Port:</strong> ${port}<br>
                <strong>SSL/TLS:</strong> ${port === 465 ? 'Implicit TLS' : 'STARTTLS'}<br>
                <strong>From:</strong> ${senderEmail}
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log('SMTP test email sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent successfully to ${test_email}` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("SMTP test failed:", error);
    
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connection refused')) {
      errorMessage = 'Connection refused. Please verify your SMTP host and port are correct.';
    } else if (error.code === 'EAUTH' || error.message?.includes('authentication') || error.message?.includes('Invalid login')) {
      errorMessage = 'Authentication failed. Please check your SMTP username and password.';
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      errorMessage = 'Connection timed out. Please verify: 1) Port is correct (465 for SSL, 587 for STARTTLS), 2) Server is accessible, 3) No firewall blocking.';
    } else if (error.message?.includes('certificate') || error.code === 'ESOCKET') {
      errorMessage = 'SSL/TLS certificate error. Try using port 587 for STARTTLS or check server certificate.';
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);

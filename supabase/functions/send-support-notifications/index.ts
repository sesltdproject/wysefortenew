import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SupportNotificationRequest {
  ticket_id: string;
  type: 'new_ticket' | 'user_reply' | 'admin_reply' | 'status_change';
  message?: string;
  user_id?: string;
  subject?: string;
  user_name?: string;
  new_status?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SupportNotificationRequest = await req.json();
    const { ticket_id, type, message, user_id, subject, user_name, new_status } = body;

    console.log('Processing support notification:', { ticket_id, type });

    // Get bank settings
    const { data: settingsData } = await supabase
      .from('website_settings')
      .select('bank_name, support_email, super_admin_email, login_alert_email')
      .limit(1)
      .single();

    const bankName = settingsData?.bank_name || 'Bank';
    const adminEmail = settingsData?.login_alert_email || settingsData?.super_admin_email || settingsData?.support_email;

    // Get ticket info if not provided
    let ticketSubject = subject || '';
    let ticketUserId = user_id || '';
    let ticketUserName = user_name || '';

    if (!ticketSubject || !ticketUserId) {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('subject, user_id, profiles!user_id(full_name, email)')
        .eq('id', ticket_id)
        .single();

      if (ticket) {
        ticketSubject = ticketSubject || ticket.subject;
        ticketUserId = ticketUserId || ticket.user_id;
        const profile = (ticket as any).profiles;
        ticketUserName = ticketUserName || profile?.full_name || 'User';
      }
    }

    // Get user email for admin_reply notifications
    let userEmail = '';
    if (type === 'admin_reply' || type === 'status_change') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', ticketUserId)
        .single();
      userEmail = profile?.email || '';
      ticketUserName = ticketUserName || profile?.full_name || 'User';
    }

    // --- Dashboard Notifications ---
    try {
      if (type === 'new_ticket' || type === 'user_reply') {
        // Create admin dashboard notification
        await supabase.from('admin_notifications').insert({
          type: 'support',
          title: type === 'new_ticket' ? 'New Support Ticket' : 'New Support Reply',
          message: type === 'new_ticket'
            ? `${ticketUserName} created a new ticket: "${ticketSubject}"`
            : `${ticketUserName} replied to ticket: "${ticketSubject}"`,
          link: '/admin?tab=support',
        });
      } else if (type === 'admin_reply' || type === 'status_change') {
        // Create user dashboard notification
        const notifTitle = type === 'admin_reply' ? 'Support Response' : 'Ticket Status Updated';
        const notifMessage = type === 'admin_reply'
          ? `Support team responded to your ticket: "${ticketSubject}"`
          : `Your ticket "${ticketSubject}" status changed to ${new_status || 'updated'}`;

        await supabase.from('notifications').insert({
          user_id: ticketUserId,
          type: 'support',
          title: notifTitle,
          message: notifMessage,
          link: '/dashboard/support',
        });
      }
    } catch (dashError) {
      console.error('Dashboard notification error (non-blocking):', dashError);
    }

    // --- Email Notifications ---
    try {
      let emailTo = '';
      let emailSubject = '';
      let emailContent = '';

      if (type === 'new_ticket' || type === 'user_reply') {
        emailTo = adminEmail || '';
        emailSubject = type === 'new_ticket'
          ? `New Support Ticket: ${ticketSubject} - ${bankName}`
          : `New Reply on Ticket: ${ticketSubject} - ${bankName}`;
        emailContent = `
          <h2>${type === 'new_ticket' ? 'New Support Ticket' : 'New Reply on Support Ticket'}</h2>
          <p><strong>From:</strong> ${ticketUserName}</p>
          <p><strong>Subject:</strong> ${ticketSubject}</p>
          ${message ? `<div style="background:#f8fafc;padding:15px;border-left:4px solid #1e40af;margin:10px 0;">${message}</div>` : ''}
          <p>Please log in to the admin dashboard to respond.</p>
        `;
      } else if (type === 'admin_reply') {
        emailTo = userEmail;
        emailSubject = `Support Response: ${ticketSubject} - ${bankName}`;
        emailContent = `
          <h2>Support Team Response</h2>
          <p>Dear ${ticketUserName},</p>
          <p>The support team has responded to your ticket: <strong>${ticketSubject}</strong></p>
          ${message ? `<div style="background:#f0fdf4;padding:15px;border-left:4px solid #16a34a;margin:10px 0;">${message}</div>` : ''}
          ${new_status === 'resolved' || new_status === 'closed' ? '<p><strong>This ticket has been marked as ' + new_status + '.</strong></p>' : '<p>You can reply to this ticket from your support page.</p>'}
        `;
      } else if (type === 'status_change') {
        emailTo = userEmail;
        emailSubject = `Ticket Status Updated: ${ticketSubject} - ${bankName}`;
        emailContent = `
          <h2>Ticket Status Updated</h2>
          <p>Dear ${ticketUserName},</p>
          <p>Your support ticket "<strong>${ticketSubject}</strong>" has been updated to: <strong>${new_status}</strong></p>
        `;
      }

      if (emailTo) {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: emailTo,
            subject: emailSubject,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
                <div style="max-width:600px;margin:0 auto;background:#fff;">
                  <div style="background:#1e40af;padding:25px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">${bankName} Support</h1>
                  </div>
                  <div style="padding:30px;">
                    ${emailContent}
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;">
                    <p style="font-size:13px;color:#6b7280;text-align:center;">${bankName} Support Team</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Support email failed:', await emailResponse.text());
        } else {
          console.log('Support email sent successfully to:', emailTo);
        }
      }
    } catch (emailError) {
      console.error('Email notification error (non-blocking):', emailError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in send-support-notifications:", error);
    // Always return success to not block ticket operations
    return new Response(JSON.stringify({ success: true, error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract client IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    let clientIp = 'Unknown';
    if (cfConnectingIp) clientIp = cfConnectingIp;
    else if (forwardedFor) clientIp = forwardedFor.split(',')[0].trim();
    else if (realIp) clientIp = realIp;

    console.log(`Tracking login for user ${user_id} from IP: ${clientIp}`);

    // Get current login data to shift to previous
    const { data: currentData, error: fetchError } = await supabaseAdmin
      .from('user_security')
      .select('last_login, last_login_ip')
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current login data:', fetchError);
    }

    const now = new Date().toISOString();

    // Update user_security: shift current to previous, set new current
    const { error: updateError } = await supabaseAdmin
      .from('user_security')
      .update({
        previous_login_ip: currentData?.last_login_ip || null,
        previous_login_at: currentData?.last_login || null,
        last_login_ip: clientIp,
        last_login: now,
        updated_at: now,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating login tracking:', updateError);
      if (updateError.code === 'PGRST116') {
        const { error: insertError } = await supabaseAdmin
          .from('user_security')
          .insert({
            user_id,
            last_login_ip: clientIp,
            last_login: now,
            created_at: now,
            updated_at: now,
          });
        if (insertError) {
          console.error('Error inserting login tracking:', insertError);
        }
      }
    }

    console.log(`Successfully tracked login for user ${user_id}`);

    // --- Login Alert Email Logic ---
    try {
      // Fetch login alert settings
      const { data: settingsData } = await supabaseAdmin
        .from('website_settings')
        .select('login_alerts_enabled, login_alert_email, super_admin_email, support_email, bank_name')
        .limit(1)
        .single();

      if (settingsData?.login_alerts_enabled) {
        // Check if user is a regular user (not admin)
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id)
          .single();

        const isAdmin = roleData?.role === 'admin';

        if (!isAdmin) {
          // Fetch user profile
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', user_id)
            .single();

          // Get geolocation (with 3s timeout, non-blocking)
          let location = 'Unknown';
          try {
            if (clientIp !== 'Unknown') {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (geoRes.ok) {
                const geo = await geoRes.json();
                if (geo.city && geo.country_name) {
                  location = `${geo.city}, ${geo.region || ''}, ${geo.country_name}`.replace(', ,', ',');
                } else if (geo.country_name) {
                  location = geo.country_name;
                }
              }
            }
          } catch (geoErr) {
            console.log('Geolocation lookup failed (non-blocking):', geoErr.message);
          }

          const alertEmail = settingsData.login_alert_email || settingsData.super_admin_email || settingsData.support_email;
          const bankName = settingsData.bank_name || 'Bank';

          if (alertEmail && profile) {
            const loginTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
            
            // Call send-email-smtp edge function
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: alertEmail,
                subject: `Login Alert - ${profile.full_name} - ${bankName}`,
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head><meta charset="utf-8"></head>
                  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
                    <div style="max-width:600px;margin:0 auto;background:#fff;">
                      <div style="background:#1e40af;padding:25px;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:22px;">🔔 User Login Alert</h1>
                      </div>
                      <div style="padding:30px;">
                        <p style="font-size:15px;color:#333;">A user has logged into their account:</p>
                        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                          <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:12px 8px;font-weight:bold;color:#374151;width:140px;">Full Name</td>
                            <td style="padding:12px 8px;color:#111;">${profile.full_name}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:12px 8px;font-weight:bold;color:#374151;">Email</td>
                            <td style="padding:12px 8px;color:#111;">${profile.email}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:12px 8px;font-weight:bold;color:#374151;">IP Address</td>
                            <td style="padding:12px 8px;color:#111;">${clientIp}</td>
                          </tr>
                          <tr style="border-bottom:1px solid #e5e7eb;">
                            <td style="padding:12px 8px;font-weight:bold;color:#374151;">Location</td>
                            <td style="padding:12px 8px;color:#111;">${location}</td>
                          </tr>
                          <tr>
                            <td style="padding:12px 8px;font-weight:bold;color:#374151;">Login Time (UTC)</td>
                            <td style="padding:12px 8px;color:#111;">${loginTime}</td>
                          </tr>
                        </table>
                        <p style="font-size:13px;color:#6b7280;margin-top:20px;">
                          This is an automated login alert from ${bankName}. 
                          You can disable these alerts in Website Settings.
                        </p>
                      </div>
                    </div>
                  </body>
                  </html>
                `,
              }),
            });

            if (!emailResponse.ok) {
              console.error('Login alert email failed:', await emailResponse.text());
            } else {
              console.log('Login alert email sent successfully');
            }
          }
        }
      }
    } catch (alertError) {
      // Never block login flow due to alert failure
      console.error('Login alert error (non-blocking):', alertError);
    }

    return new Response(
      JSON.stringify({ success: true, ip: clientIp }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in track-login:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

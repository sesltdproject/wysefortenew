import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KYCProcessRequest {
  document_id: string;
  action: 'approve' | 'reject';
  admin_notes?: string;
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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: user } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { document_id, action, admin_notes }: KYCProcessRequest = await req.json();

    console.log('Processing KYC document:', { document_id, action });

    // Get the KYC document with user details
    const { data: kycDocument, error: kycError } = await supabase
      .from('kyc_documents')
      .select(`
        *,
        profiles!inner(id, email, full_name)
      `)
      .eq('id', document_id)
      .single();

    if (kycError || !kycDocument) {
      return new Response(
        JSON.stringify({ error: 'KYC document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update KYC document status
    const { error: updateError } = await supabase
      .from('kyc_documents')
      .update({
        verification_status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Error updating KYC document:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update KYC document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notification email to user
    const { data: settingsData } = await supabase.rpc('get_website_settings');
    const bankName = settingsData?.[0]?.bank_name || 'Wyseforte Bank';
    const contactEmail = settingsData?.[0]?.contact_email || 'info@wyseforte.co.uk';

    const isApproved = action === 'approve';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusText = isApproved ? 'Approved' : 'Rejected';

    await resend.emails.send({
      from: `${bankName} <onboarding@resend.dev>`,
      to: [kycDocument.profiles.email],
      subject: `KYC Document ${statusText} - ${bankName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>KYC Document ${statusText}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: ${statusColor}; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">KYC Document ${statusText}</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${kycDocument.profiles.full_name},</p>
              <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                Your KYC document (${kycDocument.document_type}) has been ${action === 'approve' ? 'approved' : 'rejected'}.
              </p>
              
              ${admin_notes ? `
                <div style="background-color: #f8fafc; border-left: 4px solid ${statusColor}; padding: 15px; margin-bottom: 20px;">
                  <p style="font-size: 14px; color: #374151; margin: 0;"><strong>Admin Notes:</strong></p>
                  <p style="font-size: 14px; color: #6b7280; margin: 5px 0 0 0;">${admin_notes}</p>
                </div>
              ` : ''}
              
              ${isApproved ? `
                <p style="font-size: 16px; color: #10b981; font-weight: bold; margin-bottom: 20px;">
                  ✓ Your account verification is now complete!
                </p>
              ` : `
                <p style="font-size: 16px; color: #ef4444; margin-bottom: 20px;">
                  Please review the feedback and resubmit your documents if necessary.
                </p>
              `}
              
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                If you have any questions, please contact us at ${contactEmail}.
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">${bankName}</p>
                <p style="font-size: 14px; color: #6b7280; margin: 0;">Secure Banking Solutions</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Create notification for the user
    await supabase
      .from('notifications')
      .insert({
        user_id: kycDocument.user_id,
        title: `KYC Document ${statusText}`,
        message: `Your ${kycDocument.document_type} document has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
        type: action === 'approve' ? 'success' : 'warning'
      });

    console.log('KYC document processed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: `KYC document ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error processing KYC document:", error);
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
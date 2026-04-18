import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveApplicationRequest {
  application_id: string;
  admin_notes?: string;
  required_initial_deposit?: number;
}

// Generate a unique account number with type prefix
function generateAccountNumber(accountType: string): string {
  const prefixes: Record<string, string> = {
    'checking': 'CHK',
    'premium_checking': 'PCK',
    'savings': 'SAV',
    'premium_savings': 'PSV',
    'high_yield_savings': 'HYS',
    'escrow_account': 'ESC',
    'call_account': 'CAL',
    'investment_account': 'INV',
    'trust_account': 'TRU',
    'business': 'BUS',
    'business_account': 'BIZ'
  };
  const prefix = prefixes[accountType] || 'ACC';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}${random}`;
}

// Generate a cryptographically secure temporary password
// SECURITY: Passwords are always generated server-side, never stored from user input
function generateSecurePassword(): string {
  // Use crypto.getRandomValues for cryptographic randomness
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  
  // Character sets for password complexity
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Ensure at least one of each required character type
  let password = '';
  password += lowercase[array[0] % lowercase.length];
  password += uppercase[array[1] % uppercase.length];
  password += numbers[array[2] % numbers.length];
  password += symbols[array[3] % symbols.length];
  
  // Fill remaining characters randomly
  for (let i = 4; i < 14; i++) {
    password += allChars[array[i] % allChars.length];
  }
  
  // Shuffle the password to avoid predictable positions
  const shuffled = password.split('');
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i % array.length] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      throw new Error('Unauthorized');
    }

    // Check if caller is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { application_id, admin_notes, required_initial_deposit }: ApproveApplicationRequest = await req.json();

    if (!application_id) {
      throw new Error('Missing application_id');
    }

    console.log('Approving application:', application_id);

    // Fetch the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('account_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application has already been processed');
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === application.email.toLowerCase());
    
    if (userExists) {
      // Use generic error to prevent email enumeration
      throw new Error('Unable to process this application. Please contact support.');
    }

    // SECURITY: Always generate password server-side
    // We never store or use user-provided passwords from the application form
    const userPassword = generateSecurePassword();
    
    // Create the user in auth.users with the secure generated password
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${application.first_name} ${application.last_name}`,
        phone: application.phone_number
      }
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating user:', createUserError);
      throw new Error(`Failed to create user account`);
    }

    const userId = newUser.user.id;
    console.log('Created auth user:', userId);

    // Create or update profile (use upsert to handle race condition with auth trigger)
    const fullName = [application.first_name, application.middle_name, application.last_name]
      .filter(Boolean)
      .join(' ');

    const profileData = {
      id: userId,
      email: application.email,
      full_name: fullName,
      phone: application.phone_number,
      address: [application.street_address, application.apartment, application.city, application.state, application.postal_code, application.country]
        .filter(Boolean)
        .join(', '),
      date_of_birth: application.date_of_birth,
      username: application.desired_username || null,
      title: application.title || null
    };

    // Use upsert with onConflict to handle the case where a trigger already created the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      // Clean up: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create profile`);
    }
    
    console.log('Profile created/updated for user:', userId);

    // Assign user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'user'
      }, { onConflict: 'user_id,role' });

    if (roleInsertError) {
      console.error('Error assigning user role:', roleInsertError);
    }

    // Map application account type to database enum values
    // Database enum uses underscores: checking, savings, business, premium_checking, 
    // premium_savings, high_yield_savings, trust_account, escrow_account, investment_account, business_account, call_account
    const accountTypeMap: Record<string, string> = {
      'checking': 'checking',
      'premium-checking': 'premium_checking',
      'savings': 'savings',
      'premium-savings': 'premium_savings',
      'high-yield-savings': 'high_yield_savings',
      'escrow': 'escrow_account',
      'call': 'call_account',
      'investment': 'investment_account',
      'trust': 'trust_account',
      'business': 'business',
      'business-account': 'business_account'
    };
    
    const dbAccountType = accountTypeMap[application.account_type?.toLowerCase()] || 'checking';
    
    // Get currency from application (default to USD)
    const accountCurrency = application.currency || 'USD';
    
    // Generate account number with type prefix
    const accountNumber = generateAccountNumber(dbAccountType);

    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: userId,
        account_number: accountNumber,
        account_type: dbAccountType,
        balance: 0,
        status: 'awaiting_deposit',
        currency: accountCurrency,
        required_initial_deposit: required_initial_deposit || null
      })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating account:', accountError);
      // Clean up: delete the auth user if account creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create bank account`);
    }
    
    console.log('Bank account created:', accountNumber);

    // Create next of kin entry
    if (application.next_of_kin_name) {
      const { error: nokError } = await supabaseAdmin
        .from('next_of_kin')
        .insert({
          user_id: userId,
          full_name: application.next_of_kin_name,
          relationship: application.next_of_kin_relationship,
          phone_number: application.next_of_kin_phone,
          email: application.next_of_kin_email
        });

      if (nokError) {
        console.error('Error creating next of kin:', nokError);
      }
    }

    // Create user security entry with security code if provided in application
    const hasSecurityCode = !!application.security_code_hash;

    // If security code was provided, hash it using the proper database function
    let securityCodeHashForDb: string | null = null;
    if (hasSecurityCode && application.security_code_hash) {
      console.log('Hashing security code for user:', userId);
      
      // Use the hash_security_code RPC function (same as admin-create-user)
      const { data: hashData, error: hashError } = await supabaseAdmin.rpc('hash_security_code', {
        p_code: application.security_code_hash
      });
      
      if (hashError) {
        console.error('Error hashing security code:', hashError);
        // Don't fail the approval, but log the error
      } else if (hashData) {
        securityCodeHashForDb = hashData;
        console.log('Security code hashed successfully');
      }
    }

    // Create or update user_security record with all required flags
    // Use upsert to handle potential conflicts with triggers
    const { error: securityError } = await supabaseAdmin
      .from('user_security')
      .upsert({
        user_id: userId,
        security_code_enabled: hasSecurityCode && !!securityCodeHashForDb,
        security_code_hash: securityCodeHashForDb,
        security_code_for_transfers: hasSecurityCode && !!securityCodeHashForDb,
        must_change_password: true  // Force password change on first login
      }, { onConflict: 'user_id' });

    if (securityError) {
      console.error('Error creating/updating user security:', securityError);
    }

    // Update application status
    const { error: updateError } = await supabaseAdmin
      .from('account_applications')
      .update({
        status: 'approved',
        reviewed_by: callingUser.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: admin_notes || null
      })
      .eq('id', application_id);

    if (updateError) {
      console.error('Error updating application:', updateError);
    }

    // Log admin activity (don't include password in logs)
    await supabaseAdmin
      .from('admin_activities')
      .insert({
        admin_id: callingUser.id,
        action: 'application_approved',
        details: JSON.stringify({
          application_id,
          reference_number: application.reference_number,
          applicant_email: application.email,
          account_number: accountNumber
        })
      });

    // Send approval email with temporary password
    try {
      await supabaseAdmin.functions.invoke('send-application-decision', {
        body: {
          application_id,
          decision: 'approved',
          temporary_password: userPassword,
          account_number: accountNumber,
          required_initial_deposit: required_initial_deposit || null,
          currency: accountCurrency
        }
      });
      console.log('Approval email sent to:', application.email);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't fail the approval if email fails
    }

    console.log('Application approved successfully:', {
      application_id,
      user_id: userId,
      account_number: accountNumber
    });

    return new Response(JSON.stringify({ 
      success: true,
      user_id: userId,
      account_number: accountNumber,
      login_email: application.email,
      // SECURITY: Never return the password in the response
      message: 'Application approved. Temporary password sent via email.'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error approving application:", error);
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

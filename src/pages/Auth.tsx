import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Vault, Lock, CreditCard, AlertCircle, UserPlus, Smartphone, Shield, Mail, KeyRound, Calendar, Phone } from "lucide-react";
import Header from "@/components/Header";
import LoginFooter from "@/components/LoginFooter";
import AnimatedBackground from "@/components/AnimatedBackground";
import { AccountLockedDialog } from "@/components/AccountLockedDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useSecurityCode } from "@/hooks/useSecurityCode";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
const bankingProfessional = "/lovable-uploads/security-professional-new.png";
const Auth = () => {
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const {
    settings
  } = useWebsiteSettings();
  const { t, language } = useTranslation();
  const {
    verifySecurityCode
  } = useSecurityCode();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  // Removed activeTab since we only have signin now
  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [showFrozenAccountDialog, setShowFrozenAccountDialog] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [showAdminBlockedDialog, setShowAdminBlockedDialog] = useState(false);
  const [loginAttemptWarning, setLoginAttemptWarning] = useState<string | null>(null);

  // Apply blue theme to body so portaled elements (dialogs, modals, toasts) inherit it
  useEffect(() => {
    document.body.classList.add('theme-blue-banking');
    return () => document.body.classList.remove('theme-blue-banking');
  }, []);

  // Security Code states
  const [requiresSecurityCode, setRequiresSecurityCode] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [securityCodeAttempts, setSecurityCodeAttempts] = useState(0);
  const [validatedCredentials, setValidatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Email 2FA states
  const [requiresEmail2FA, setRequiresEmail2FA] = useState(false);
  const [email2FACode, setEmail2FACode] = useState("");
  const [email2FAAttempts, setEmail2FAAttempts] = useState(0);
  const [email2FASending, setEmail2FASending] = useState(false);

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'verify' | 'reset'>('verify');
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    dateOfBirth: "",
    phoneLast4: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Flag to prevent redirect race condition during security code validation
  const [validatingSecurityCodeFlow, setValidatingSecurityCodeFlow] = useState(false);
  // State for mandatory password change
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    console.log('Auth useEffect triggered:', {
      user: !!user,
      requiresSecurityCode,
      isAccountLocked,
      validatingSecurityCodeFlow,
      mustChangePassword,
      userEmail: user?.email
    });
    // Only redirect if already logged in AND not in any 2FA flow AND account is not locked
    // AND not currently validating security code requirements AND not requiring password change
    if (user && !requiresSecurityCode && !requiresEmail2FA && !isAccountLocked && !validatingSecurityCodeFlow && !mustChangePassword) {
      console.log('Redirecting to dashboard');
      navigate("/dashboard");
    }
  }, [user, navigate, requiresSecurityCode, isAccountLocked, validatingSecurityCodeFlow, mustChangePassword]);
  const validateForm = () => {
    const newErrors: string[] = [];

    // Identifier validation (email or username)
    if (!formData.identifier) {
      newErrors.push("Email or username is required");
    } else if (formData.identifier.length < 3) {
      newErrors.push("Please enter a valid email or username");
    }

    // Password validation
    if (!formData.password) {
      newErrors.push("Password is required");
    } else if (formData.password.length < 8) {
      newErrors.push("Password must be at least 8 characters");
    }
    return newErrors;
  };

  // Resolve identifier (email or username) to email
  const resolveIdentifier = async (identifier: string): Promise<{email: string | null;error: string | null;}> => {
    try {
      // If it looks like an email, return as-is
      if (identifier.includes('@')) {
        return { email: identifier, error: null };
      }

      // Otherwise, resolve username to email via edge function
      const { data, error } = await supabase.functions.invoke('resolve-login-identifier', {
        body: { identifier }
      });

      if (error || data?.error) {
        console.error('Error resolving identifier:', error || data?.error);
        return { email: null, error: 'Invalid email or username' };
      }

      return { email: data.email, error: null };
    } catch (error) {
      console.error('Error resolving identifier:', error);
      return { email: null, error: 'Failed to verify credentials' };
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage("");
    setLoginAttemptWarning(null);
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setValidatingSecurityCodeFlow(true); // Prevent redirect during security code check
    try {
      console.log('Attempting sign in...');

      // First, resolve the identifier to an email
      const { email: resolvedEmail, error: resolveError } = await resolveIdentifier(formData.identifier);

      if (resolveError || !resolvedEmail) {
        setErrors([resolveError || 'Invalid email or username']);
        setValidatingSecurityCodeFlow(false);
        setIsLoading(false);
        return;
      }

      // Attempt to sign in with resolved email
      const { error: signInError } = await signIn(resolvedEmail, formData.password);

      if (signInError) {
        console.error('Sign in error:', signInError);

        // Track failed login attempt
        if (signInError.message.includes('Invalid login credentials')) {
          try {
            const { data: failedLoginData } = await supabase.functions.invoke(
              'track-failed-login',
              { body: { email: resolvedEmail } }
            );

            console.log('Failed login tracking result:', failedLoginData);

            // Check if account is now locked
            if (failedLoginData?.locked) {
              const lockedUntil = new Date(failedLoginData.locked_until);
              setErrors([`Your account has been temporarily locked due to multiple failed login attempts. Please try again after ${lockedUntil.toLocaleString()}.`]);
              setValidatingSecurityCodeFlow(false);
              setIsLoading(false);
              return;
            }

            // Show warning on 2nd failed attempt
            if (failedLoginData?.warning_shown) {
              setLoginAttemptWarning('Warning: One more failed attempt will lock your account for 30 minutes.');
            }
          } catch (trackError) {
            console.error('Error tracking failed login:', trackError);
          }

          // Check account status after authentication failure
          const { data: statusData } = await supabase.functions.invoke(
            'check-account-status',
            { body: { email: resolvedEmail } }
          );

          // If account exists and is locked, show specific message
          if (statusData?.exists && statusData?.locked) {
            setIsAccountLocked(true);
            setShowFrozenAccountDialog(true);
            return;
          }

          // If account exists and temporarily locked, show lockout message
          if (statusData?.exists && statusData?.temporarily_locked) {
            const lockedUntil = new Date(statusData.locked_until);
            setErrors([`Account temporarily locked due to too many failed attempts. Please try again after ${lockedUntil.toLocaleString()}.`]);
            return;
          }

          // Generic error for invalid credentials
          setErrors(['Invalid email or password']);
        } else if (signInError.message.includes('Email not confirmed')) {
          setErrors(['Please confirm your email address before logging in']);
        } else {
          setErrors([signInError.message]);
        }
        return;
      }

      // Check if user is an admin - admins cannot use customer login
      const { data: sessionCheckData } = await supabase.auth.getSession();
      const currentUserId = sessionCheckData?.session?.user?.id;
      if (currentUserId) {
        const { data: roleData } = await supabase.
        from('user_roles').
        select('role').
        eq('user_id', currentUserId).
        eq('role', 'admin').
        maybeSingle();

        if (roleData) {
          // Admin account - sign out and show warning
          await supabase.auth.signOut();
          setShowAdminBlockedDialog(true);
          setValidatingSecurityCodeFlow(false);
          setIsLoading(false);
          return;
        }
      }

      // Successful login - reset any failed attempt counters
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          // Reset login attempts on successful login
          await supabase.
          from('user_security').
          update({
            login_attempts: 0,
            account_locked_until: null,
            updated_at: new Date().toISOString()
          }).
          eq('user_id', sessionData.session.user.id);
        }
      } catch (resetError) {
        console.error('Error resetting login attempts:', resetError);
      }

      // After successful authentication, check if security code or email 2FA is required
      const { data: statusData } = await supabase.functions.invoke(
        'check-account-status',
        { body: { email: resolvedEmail } }
      );

      // Check for email 2FA first
      const { data: email2faData } = await supabase.functions.invoke(
        'check-email-2fa',
        { body: { email: resolvedEmail } }
      );

      if (email2faData?.requires_email_2fa) {
        console.log('Email 2FA required - signing out to prompt for code');

        await supabase.auth.signOut();

        // Store validated credentials for re-authentication after email 2FA
        setValidatedCredentials({
          email: resolvedEmail,
          password: formData.password
        });
        setTempUserId(email2faData.user_id);

        // Send verification email
        setEmail2FASending(true);
        try {
          const { data: sendResult, error: sendError } = await supabase.functions.invoke(
            'send-email-2fa',
            { body: { email: resolvedEmail, language } }
          );

          if (sendError || !sendResult?.success) {
            setErrors([sendResult?.error || 'Failed to send verification email']);
            setValidatingSecurityCodeFlow(false);
            return;
          }

          setRequiresEmail2FA(true);
          setSuccessMessage('Verification code sent to your email');
        } catch (emailError) {
          console.error('Error sending 2FA email:', emailError);
          setErrors(['Failed to send verification email. Please try again.']);
        } finally {
          setEmail2FASending(false);
        }

        setValidatingSecurityCodeFlow(false);
        return;
      }

      if (statusData?.exists && statusData?.requires_security_code) {
        console.log('Security code required - signing out to prompt for code');

        // CRITICAL FIX: Sign out immediately to prevent auto-redirect
        // The user is authenticated but we need the security code first
        await supabase.auth.signOut();

        // Store validated credentials for re-authentication after security code
        setValidatedCredentials({
          email: resolvedEmail,
          password: formData.password
        });
        setTempUserId(statusData.user_id);
        setRequiresSecurityCode(true);
        setValidatingSecurityCodeFlow(false); // Clear flag, we're showing security code prompt
        return;
      }
      console.log('Sign in successful, authentication complete');

      // Track login IP for security
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          await supabase.functions.invoke('track-login', {
            body: { user_id: sessionData.session.user.id }
          });

          // Check if user must change password (first login after approval)
          const { data: securityData } = await supabase.
          from('user_security').
          select('must_change_password').
          eq('user_id', sessionData.session.user.id).
          single();

          if (securityData?.must_change_password) {
            console.log('User must change password on first login');
            setMustChangePassword(true);
            setValidatingSecurityCodeFlow(false);
            return;
          }
        }
      } catch (trackError) {
        console.error('Error tracking login:', trackError);
        // Don't block login on tracking failure
      }

      setValidatingSecurityCodeFlow(false); // Clear flag, normal sign-in complete
      // User is signed in, will redirect via useEffect
    } catch (error) {
      console.error('Auth error:', error);
      setErrors(["An unexpected error occurred. Please try again."]);
      setValidatingSecurityCodeFlow(false); // Clear flag on error
    } finally {
      setIsLoading(false);
    }
  };
  const handleSecurityCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserId || securityCode.length !== 6 || !validatedCredentials) {
      setErrors(["Please enter a 6-digit security code."]);
      return;
    }
    setIsLoading(true);
    setErrors([]);
    try {
      const result = await verifySecurityCode(tempUserId, securityCode);
      const typedResult = result as {
        success: boolean;
        error?: string;
        type?: string;
        hard_locked?: boolean;
        locked_until?: string;
      };
      if (typedResult.success) {
        // Security code verified - now sign in the user
        const {
          error: signInError
        } = await signIn(validatedCredentials.email, validatedCredentials.password);
        if (!signInError) {
          // Track login IP for security
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.id) {
              await supabase.functions.invoke('track-login', {
                body: { user_id: sessionData.session.user.id }
              });

              // Check if user must change password (first login after approval)
              const { data: securityData } = await supabase.
              from('user_security').
              select('must_change_password').
              eq('user_id', sessionData.session.user.id).
              single();

              if (securityData?.must_change_password) {
                console.log('User must change password on first login after security code verification');
                // Clear security code states but keep user signed in
                setRequiresSecurityCode(false);
                setSecurityCode("");
                setTempUserId(null);
                setSecurityCodeAttempts(0);
                setValidatedCredentials(null);
                setMustChangePassword(true);
                return;
              }
            }
          } catch (trackError) {
            console.error('Error tracking login:', trackError);
          }

          // Clear all security states - normal flow (no password change required)
          setRequiresSecurityCode(false);
          setSecurityCode("");
          setTempUserId(null);
          setSecurityCodeAttempts(0);
          setValidatedCredentials(null);
          // Navigation will happen automatically via useAuth
        } else {
          setErrors([signInError.message]);
        }
      } else {
        setSecurityCode(""); // Clear the code

        if (typedResult.hard_locked) {
          // Hard locked - show AccountLockedDialog
          setRequiresSecurityCode(false);
          setTempUserId(null);
          setValidatedCredentials(null);
          setIsAccountLocked(true);
          setShowFrozenAccountDialog(true);
        } else {
          setErrors([typedResult.error || "Invalid security code. Please try again."]);
        }
      }
    } catch (error) {
      console.error('Security code verification error:', error);
      setErrors(["An error occurred while verifying your security code."]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleBackToLogin = () => {
    setRequiresSecurityCode(false);
    setSecurityCode("");
    setRequiresEmail2FA(false);
    setEmail2FACode("");
    setEmail2FAAttempts(0);
    setTempUserId(null);
    setSecurityCodeAttempts(0);
    setValidatedCredentials(null);
    setMustChangePassword(false);
    setNewPasswordData({ newPassword: '', confirmPassword: '' });
    setErrors([]);
    setSuccessMessage("");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const { newPassword, confirmPassword } = newPasswordData;

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      setErrors(["Password must be at least 8 characters"]);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setErrors(["Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Get current session to update must_change_password flag
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        // Clear the must_change_password flag
        await supabase.
        from('user_security').
        update({
          must_change_password: false,
          updated_at: new Date().toISOString()
        }).
        eq('user_id', sessionData.session.user.id);
      }

      // Clear state and redirect
      setMustChangePassword(false);
      setNewPasswordData({ newPassword: '', confirmPassword: '' });
      setSuccessMessage("Password updated successfully!");

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Error updating password:', error);
      setErrors([error.message || "Failed to update password. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedCredentials || email2FACode.length !== 6) {
      setErrors(["Please enter a 6-digit verification code."]);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      // Verify the email 2FA code
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'verify-email-2fa',
        { body: { email: validatedCredentials.email, code: email2FACode } }
      );

      // When edge function returns non-2xx, data may be null and error contains the response
      let resultData = verifyResult;
      if (verifyError && !resultData) {
        try {
          // Try to parse error context for the response body
          if (verifyError.context && typeof verifyError.context.json === 'function') {
            resultData = await verifyError.context.json();
          }
        } catch {



          // Could not parse error context
        }}if (verifyError || !resultData?.success) {
        setEmail2FAAttempts((prev) => prev + 1);
        setEmail2FACode("");

        if (resultData?.locked) {
          setErrors(["Too many failed attempts. Please wait 15 minutes before trying again."]);
          handleBackToLogin();
        } else {
          setErrors([resultData?.error || "Invalid verification code. Please try again."]);
        }
        return;
      }

      // Code verified - now sign in the user
      const { error: signInError } = await signIn(
        validatedCredentials.email,
        validatedCredentials.password
      );

      if (!signInError) {
        // Track login IP for security
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.id) {
            await supabase.functions.invoke('track-login', {
              body: { user_id: sessionData.session.user.id }
            });

            // Check if user must change password (first login after approval)
            const { data: securityData } = await supabase.
            from('user_security').
            select('must_change_password').
            eq('user_id', sessionData.session.user.id).
            single();

            if (securityData?.must_change_password) {
              console.log('User must change password on first login after email 2FA verification');
              // Clear email 2FA states but keep user signed in
              setRequiresEmail2FA(false);
              setEmail2FACode("");
              setEmail2FAAttempts(0);
              setTempUserId(null);
              setValidatedCredentials(null);
              setMustChangePassword(true);
              return;
            }
          }
        } catch (trackError) {
          console.error('Error tracking login:', trackError);
        }

        // Clear all email 2FA states - normal flow (no password change required)
        setRequiresEmail2FA(false);
        setEmail2FACode("");
        setEmail2FAAttempts(0);
        setTempUserId(null);
        setValidatedCredentials(null);

        // Navigate directly to dashboard after successful 2FA verification
        navigate("/dashboard");
      } else {
        setErrors([signInError.message]);
      }
    } catch (error) {
      console.error('Email 2FA verification error:', error);
      setErrors(["An error occurred while verifying your code."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail2FA = async () => {
    if (!validatedCredentials) return;

    setEmail2FASending(true);
    setErrors([]);

    try {
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'send-email-2fa',
        { body: { email: validatedCredentials.email } }
      );

      if (sendError || !sendResult?.success) {
        if (sendResult?.wait_seconds) {
          setErrors([`Please wait ${sendResult.wait_seconds} seconds before requesting a new code.`]);
        } else {
          setErrors([sendResult?.error || 'Failed to resend verification email']);
        }
        return;
      }

      setSuccessMessage('New verification code sent to your email');
      setEmail2FACode("");
    } catch (error) {
      console.error('Error resending 2FA email:', error);
      setErrors(['Failed to resend verification email. Please try again.']);
    } finally {
      setEmail2FASending(false);
    }
  };
  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotPasswordStep('verify');
    // Use identifier for forgot password - user can enter email or username
    const identifierValue = formData.identifier || "";
    setForgotPasswordData({
      email: identifierValue.includes('@') ? identifierValue : "",
      dateOfBirth: "",
      phoneLast4: "",
      resetCode: "",
      newPassword: "",
      confirmPassword: ""
    });
    setErrors([]);
    setSuccessMessage("");
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setForgotPasswordLoading(true);

    try {
      // Validate inputs
      if (!forgotPasswordData.email || !forgotPasswordData.dateOfBirth || !forgotPasswordData.phoneLast4) {
        setErrors(["All fields are required"]);
        return;
      }

      if (forgotPasswordData.phoneLast4.length !== 4 || !/^\d{4}$/.test(forgotPasswordData.phoneLast4)) {
        setErrors(["Please enter exactly 4 digits for phone number"]);
        return;
      }

      // Call verify-password-reset edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'verify-password-reset',
        {
          body: {
            email: forgotPasswordData.email,
            date_of_birth: forgotPasswordData.dateOfBirth,
            phone_last_4: forgotPasswordData.phoneLast4
          }
        }
      );

      if (verifyError || !verifyResult?.success) {
        setErrors([verifyResult?.error || "Verification failed. Please try again."]);
        return;
      }

      // Send password reset email
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'send-password-reset',
        {
          body: {
            email: forgotPasswordData.email,
            reset_code: verifyResult.reset_code,
            user_name: verifyResult.user_name
          }
        }
      );

      if (sendError || !sendResult?.success) {
        setErrors([sendResult?.error || "Failed to send reset code. Please try again."]);
        return;
      }

      setSuccessMessage("A password reset code has been sent to your email.");
      setForgotPasswordStep('reset');
    } catch (error) {
      console.error("Forgot password verify error:", error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setForgotPasswordLoading(true);

    try {
      // Validate inputs
      if (!forgotPasswordData.resetCode || !forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword) {
        setErrors(["All fields are required"]);
        return;
      }

      if (forgotPasswordData.newPassword.length < 8) {
        setErrors(["Password must be at least 8 characters long"]);
        return;
      }

      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
        setErrors(["Passwords do not match"]);
        return;
      }

      // Call complete-password-reset edge function
      const { data: resetResult, error: resetError } = await supabase.functions.invoke(
        'complete-password-reset',
        {
          body: {
            email: forgotPasswordData.email,
            reset_code: forgotPasswordData.resetCode,
            new_password: forgotPasswordData.newPassword
          }
        }
      );

      if (resetError || !resetResult?.success) {
        setErrors([resetResult?.error || "Failed to reset password. Please try again."]);
        return;
      }

      setSuccessMessage("Password reset successful! You can now sign in with your new password.");
      setShowForgotPassword(false);
      setForgotPasswordStep('verify');
      setForgotPasswordData({
        email: "",
        dateOfBirth: "",
        phoneLast4: "",
        resetCode: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Forgot password reset error:", error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep('verify');
    setForgotPasswordData({
      email: "",
      dateOfBirth: "",
      phoneLast4: "",
      resetCode: "",
      newPassword: "",
      confirmPassword: ""
    });
    setErrors([]);
    setSuccessMessage("");
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };
  return <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header useConsoleLogo />
      
      {/* Auth Section */}
      <section className="py-20 theme-blue-banking">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12 relative">
                
                {/* Background accent */}
                <div className="absolute inset-0 -top-8 -bottom-8 bg-gradient-to-br from-primary/5 via-transparent to-gold/5 rounded-3xl"></div>
                
                {/* Enhanced title */}
                <div className="relative z-10">
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                    Customer Portal
                  </h1>
                  <div className="flex items-center justify-center gap-2 mb-4 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
                    <div className="h-1 bg-primary rounded-full w-12"></div>
                    <div className="h-1 bg-gold rounded-full w-12"></div>
                  </div>
                  <p className="text-xl lg:text-2xl text-muted-foreground font-medium animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                    Secure access to your <span className="text-primary font-semibold">{settings?.bankName || 'Wyseforte Bank'}</span> account
                  </p>
                  
                  {/* Trust indicators */}
                  <div className="flex items-center justify-center gap-6 mt-6 animate-slide-in-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>{t('auth.encryption256')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>{t('auth.fdicInsured')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span>{t('auth.monitoring24x7')}</span>
                    </div>
                  </div>
                </div>
              </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Security Image */}
              <div className="order-2 lg:order-1 animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                <div className="w-full h-64 lg:h-80 rounded-lg bg-cover bg-center shadow-banking transition-transform duration-500 hover:scale-105" style={{
                backgroundImage: `url(${bankingProfessional})`
              }} />
                <div className="mt-6 space-y-4">
                  <div className="flex items-center space-x-3 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:translate-x-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('auth.secureSupport')}</span>
                  </div>
                  <div className="flex items-center space-x-3 animate-slide-in-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:translate-x-2">
                    <Vault className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('auth.convenientTransfers')}</span>
                  </div>
                  <div className="flex items-center space-x-3 animate-slide-in-up [animation-delay:600ms] opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:translate-x-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('auth.fastDeposits')}</span>
                  </div>
                </div>
              </div>

              {/* Auth Form */}
              <div className="order-1 lg:order-2 animate-slide-in-right [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
                <Card className="shadow-banking transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-muted-foreground">
                      {t('auth.welcomeBack')}
                    </CardTitle>
                    <CardDescription>
                      {t('auth.signInToAccount').replace('{bankName}', settings?.bankName || 'Wyseforte Bank')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Success Message */}
                    {successMessage && <Alert className="mb-4 border-green-200 bg-green-50">
                        <AlertCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          {successMessage}
                        </AlertDescription>
                      </Alert>}

                    {/* Error Messages */}
                    {errors.length > 0 && <Alert className="mb-4 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          <ul className="list-disc pl-4 space-y-1">
                            {errors.map((error, index) => <li key={index}>{error}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>}

                    {/* Login Attempt Warning */}
                    {loginAttemptWarning && <Alert className="mb-4 border-yellow-300 bg-yellow-50">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-700 font-medium">
                          {loginAttemptWarning}
                        </AlertDescription>
                      </Alert>}

                    {mustChangePassword ? <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div className="text-center space-y-2 animate-scale-in">
                          <div className="animate-pulse-glow">
                            <KeyRound className="h-8 w-8 text-primary mx-auto" />
                          </div>
                          <h3 className="text-lg font-medium animate-slide-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">{t('auth.changePassword')}</h3>
                          <p className="text-sm text-muted-foreground animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                            {t('auth.firstLoginSecurity')}
                          </p>
                        </div>

                        <div className="space-y-2 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
                          <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                          <Input id="newPassword" type="password" value={newPasswordData.newPassword} onChange={(e) => setNewPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))} placeholder={t('auth.newPassword')} className="transition-all duration-300 focus:ring-2 focus:ring-primary/20" autoComplete="new-password" />
                          <p className="text-xs text-muted-foreground">
                            {t('auth.passwordRequirements')}
                          </p>
                        </div>
                        
                        <div className="space-y-2 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                          <Label htmlFor="confirmNewPassword">{t('auth.confirmNewPassword')}</Label>
                          <Input id="confirmNewPassword" type="password" value={newPasswordData.confirmPassword} onChange={(e) => setNewPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))} placeholder={t('auth.confirmNewPassword')} className="transition-all duration-300 focus:ring-2 focus:ring-primary/20" autoComplete="new-password" />
                        </div>

                        <div className="space-y-3 animate-slide-in-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
                          <Button type="submit" variant="banking" className="w-full transition-all duration-300 hover:scale-105 active:scale-95" disabled={isLoading || !newPasswordData.newPassword || !newPasswordData.confirmPassword}>
                            {isLoading ? <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{t('auth.updatingPassword')}</span>
                              </div> : t('auth.setNewPassword')}
                          </Button>
                        </div>
                      </form> : !requiresSecurityCode && !requiresEmail2FA ? <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
                        <Label htmlFor="identifier">{t('auth.emailOrUsername')}</Label>
                        <Input id="identifier" type="text" value={formData.identifier} onChange={(e) => handleInputChange("identifier", e.target.value)} placeholder={t('auth.emailOrUsernamePlaceholder')} className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:scale-105" autoComplete="username" />
                      </div>
                      
                      <div className="space-y-2 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                        <Label htmlFor="password">{t('auth.password')}</Label>
                        <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder={t('auth.passwordPlaceholder')} className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:scale-105" autoComplete="current-password" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm animate-slide-in-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
                        <label className="flex items-center space-x-2 cursor-pointer transition-all duration-200 hover:text-primary">
                          <input type="checkbox" className="rounded border-input transition-all duration-200" />
                          <span className="text-muted-foreground">{t('auth.rememberMe')}</span>
                        </label>
                        <button type="button" onClick={handleForgotPassword} className="text-primary hover:text-primary-dark hover:underline transition-all duration-200 hover:scale-105">
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      
                      <Button type="submit" variant="banking" className="w-full hover-lift animate-slide-in-up [animation-delay:600ms] opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:scale-105 active:scale-95" disabled={isLoading}>
                        {isLoading ? <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{t('auth.signingIn')}</span>
                          </div> : t('auth.signInButton')}
                      </Button>
                    </form> : requiresEmail2FA ? <form onSubmit={handleEmail2FASubmit} className="space-y-6">
                        <div className="text-center space-y-2 animate-scale-in">
                          <div className="animate-pulse-glow">
                            <Mail className="h-8 w-8 text-primary mx-auto" />
                          </div>
                          <h3 className="text-lg font-medium animate-slide-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">{t('auth.email2faTitle')}</h3>
                          <p className="text-sm text-muted-foreground animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                            {t('auth.email2faSubtitle')}
                          </p>
                        </div>

                        <div className="space-y-2 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
                          <Label htmlFor="email2faCode">{t('auth.verificationCode')}</Label>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} value={email2FACode} onChange={(value) => setEmail2FACode(value)} className="transition-all duration-300 hover:scale-105">
                              <InputOTPGroup>
                                {Array.from({ length: 6 }).map((_, index) => <InputOTPSlot key={index} index={index} className="transition-all duration-200 hover:border-primary focus:ring-2 focus:ring-primary/20" />)}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            {t('auth.codeExpires')}
                          </p>
                        </div>

                        <div className="space-y-3 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                          <Button type="submit" variant="banking" className="w-full transition-all duration-300 hover:scale-105 active:scale-95" disabled={isLoading || email2FACode.length !== 6}>
                            {isLoading ? <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{t('auth.verifying')}</span>
                              </div> : t('auth.verifyCode')}
                          </Button>
                          
                          <Button type="button" variant="outline" className="w-full transition-all duration-300 hover:scale-105 active:scale-95" onClick={handleResendEmail2FA} disabled={email2FASending}>
                            {email2FASending ? t('auth.sending') : t('auth.resendCode')}
                          </Button>
                          
                          <Button type="button" variant="ghost" className="w-full" onClick={handleBackToLogin} disabled={isLoading}>
                            {t('auth.backToLogin')}
                          </Button>
                        </div>
                      </form> : <form onSubmit={handleSecurityCodeSubmit} className="space-y-6">
                        <div className="text-center space-y-2 animate-scale-in">
                          <div className="animate-pulse-glow">
                            <Smartphone className="h-8 w-8 text-primary mx-auto" />
                          </div>
                          <h3 className="text-lg font-medium animate-slide-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">{t('auth.securityCodeTitle')}</h3>
                          <p className="text-sm text-muted-foreground animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
                            {t('auth.securityCodeSubtitle')}
                          </p>
                        </div>

                        <div className="space-y-2 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
                          <Label htmlFor="securityCode">{t('auth.securityCode')}</Label>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} value={securityCode} onChange={(value) => setSecurityCode(value)} className="transition-all duration-300 hover:scale-105" type="password">
                              <InputOTPGroup>
                                {Array.from({ length: 6 }).map((_, index) =>
                            <InputOTPSlot key={index} index={index} className="transition-all duration-200 hover:border-primary focus:ring-2 focus:ring-primary/20" />
                            )}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            {t('auth.useBackupCode')}
                          </p>
                        </div>

                        <div className="space-y-3 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
                          <Button type="submit" variant="banking" className="w-full transition-all duration-300 hover:scale-105 active:scale-95" disabled={isLoading || securityCode.length !== 6}>
                            {isLoading ? <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{t('auth.verifying')}</span>
                              </div> : t('auth.verifySecurityCode')}
                          </Button>
                          
                          <Button type="button" variant="outline" className="w-full transition-all duration-300 hover:scale-105 active:scale-95" onClick={handleBackToLogin} disabled={isLoading}>
                            {t('auth.backToLogin')}
                          </Button>
                        </div>
                      </form>}
                  </CardContent>
                </Card>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.needHelp')}{" "}
                    <Link to="/contact" className="text-primary hover:text-primary-dark">
                      {t('auth.contactSupport')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LoginFooter />

      {/* Account Locked Dialog */}
      <AccountLockedDialog
      open={showFrozenAccountDialog}
      onClose={() => {
        setShowFrozenAccountDialog(false);
        setIsAccountLocked(false);
      }} />


      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => !open && handleCloseForgotPassword()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {t('auth.resetPasswordTitle')}
            </DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === 'verify' ?
            t('auth.resetPasswordSubtitle') :
            t('auth.enterResetCode')
            }
            </DialogDescription>
          </DialogHeader>

          {/* Error Messages */}
          {errors.length > 0 &&
        <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <ul className="list-disc pl-4 space-y-1">
                  {errors.map((error, index) => <li key={index}>{error}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
        }

          {/* Success Message */}
          {successMessage &&
        <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
        }

          {forgotPasswordStep === 'verify' ?
        <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fpEmail">{t('contact.email')}</Label>
                <Input
              id="fpEmail"
              type="email"
              value={forgotPasswordData.email}
              onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
              placeholder={t('contact.email')} />

              </div>

              <div className="space-y-2">
                <Label htmlFor="fpDob" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('auth.dateOfBirth')}
                </Label>
                <Input
              id="fpDob"
              type="date"
              value={forgotPasswordData.dateOfBirth}
              onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, dateOfBirth: e.target.value })} />

              </div>

              <div className="space-y-2">
                <Label htmlFor="fpPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('auth.phoneLast4')}
                </Label>
                <Input
              id="fpPhone"
              type="text"
              maxLength={4}
              value={forgotPasswordData.phoneLast4}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setForgotPasswordData({ ...forgotPasswordData, phoneLast4: value });
              }}
              placeholder="1234" />

              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={handleCloseForgotPassword}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ?
              <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('auth.verifying')}
                    </div> :
              t('auth.sendResetCode')}
                </Button>
              </DialogFooter>
            </form> :

        <form onSubmit={handleForgotPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fpCode">{t('auth.enterResetCode')}</Label>
                <div className="flex justify-center">
                  <InputOTP
                maxLength={6}
                value={forgotPasswordData.resetCode}
                onChange={(value) => setForgotPasswordData({ ...forgotPasswordData, resetCode: value })}>

                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) =>
                  <InputOTPSlot key={index} index={index} />
                  )}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.enterVerificationCode')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fpNewPassword">{t('auth.newPassword')}</Label>
                <Input
              id="fpNewPassword"
              type="password"
              value={forgotPasswordData.newPassword}
              onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value })}
              placeholder={t('auth.newPassword')} />

              </div>

              <div className="space-y-2">
                <Label htmlFor="fpConfirmPassword">{t('auth.confirmNewPassword')}</Label>
                <Input
              id="fpConfirmPassword"
              type="password"
              value={forgotPasswordData.confirmPassword}
              onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, confirmPassword: e.target.value })}
              placeholder={t('auth.confirmNewPassword')} />

              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setForgotPasswordStep('verify')}>
                  {t('common.back')}
                </Button>
                <Button type="submit" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ?
              <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.loading')}
                    </div> :
              t('auth.resetPassword')}
                </Button>
              </DialogFooter>
            </form>
        }
        </DialogContent>
      </Dialog>

      {/* Admin Account Blocked Dialog */}
      <AlertDialog open={showAdminBlockedDialog} onOpenChange={setShowAdminBlockedDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Unauthorized Access
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Administrator accounts cannot access the customer portal.
              Please use the admin console to manage the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
            className="w-full sm:w-auto min-w-[200px] gradient-primary text-primary-foreground hover:opacity-90"
            onClick={() => {
              setShowAdminBlockedDialog(false);
              navigate("/admin-auth");
            }}>

              Go to Admin Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Auth;
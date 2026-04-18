import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Vault, Shield, Lock, AlertCircle, KeyRound, Mail, RefreshCw } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction } from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import LoginFooter from "@/components/LoginFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import securityImage from "@/assets/security-lock.jpg";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

const AdminAuth = () => {
  const { signIn, user, profile } = useAuth();
  const { settings } = useWebsiteSettings();
  const bankName = settings?.bankName || "Your Bank";
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [showNonAdminDialog, setShowNonAdminDialog] = useState(false);

  // Email 2FA states
  const [requiresEmail2FA, setRequiresEmail2FA] = useState(false);
  const [email2FACode, setEmail2FACode] = useState("");
  const [email2FAAttempts, setEmail2FAAttempts] = useState(0);
  const [email2FASending, setEmail2FASending] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [validatedCredentials, setValidatedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Apply blue theme to body so portaled elements (dialogs, modals, toasts) inherit it
  useEffect(() => {
    document.body.classList.add('theme-blue-banking');
    return () => document.body.classList.remove('theme-blue-banking');
  }, []);

  useEffect(() => {
    // Redirect if already logged in (admin check happens server-side)
    // IMPORTANT: do NOT redirect while we're in the middle of a login or email-2FA flow.
    // Otherwise, the user can briefly land on /admin-dashboard before AdminAuth signs them out
    // to complete 2FA, causing the flash-and-logout behavior.
    if (isLoading || requiresEmail2FA) return;

    if (user && profile) {
      // Server-side role validation will handle admin access
      navigate("/admin-dashboard");
    }
  }, [user, profile, navigate, isLoading, requiresEmail2FA]);

  const validateForm = () => {
    const newErrors: string[] = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.push("Email is required");
    } else if (!emailRegex.test(formData.email)) {
      newErrors.push("Please enter a valid email address");
    }

    // Password validation
    if (!formData.password) {
      newErrors.push("Password is required");
    } else if (formData.password.length < 8) {
      newErrors.push("Password must be at least 8 characters");
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage("");

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        if (error.message === "USER_LOGIN_RESTRICTED") {
          setErrors(["Regular user accounts cannot access the admin console. Please use the customer portal."]);
        } else if (error.message.includes("Invalid login credentials")) {
          setErrors(["Invalid email or password. Please try again."]);
        } else {
          setErrors([error.message]);
        }
        return;
      }

      // Immediately check if the user has an admin role
      const { data: sessionCheck } = await supabase.auth.getSession();
      const userId = sessionCheck?.session?.user?.id;
      if (userId) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          // Not an admin — sign out immediately and show warning dialog
          await supabase.auth.signOut();
          setShowNonAdminDialog(true);
          setIsLoading(false);
          return;
        }
      }

      // Check if user has email 2FA enabled
      const { data: email2faData } = await supabase.functions.invoke("check-email-2fa", {
        body: { email: formData.email },
      });

      if (email2faData?.requires_email_2fa) {
        // Sign out and require 2FA verification
        await supabase.auth.signOut();
        setValidatedCredentials({ email: formData.email, password: formData.password });
        setTempUserId(email2faData.user_id);

        // Send verification email
        setEmail2FASending(true);
        const { data: sendResult } = await supabase.functions.invoke("send-email-2fa", {
          body: { email: formData.email },
        });
        setEmail2FASending(false);

        if (sendResult?.success) {
          setRequiresEmail2FA(true);
          setSuccessMessage("A verification code has been sent to your email.");
        } else {
          setErrors(["Failed to send verification code. Please try again."]);
        }
        return;
      }

      // No 2FA required - track login with user_id
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          await supabase.functions.invoke("track-login", {
            body: { user_id: sessionData.session.user.id },
          });
        }
      } catch (trackError) {
        console.error("Failed to track login:", trackError);
      }

      // Auth hook will handle redirection if they're an admin
    } catch (error) {
      console.error("Admin auth error:", error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmail2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserId || email2FACode.length !== 6 || !validatedCredentials) return;

    setIsLoading(true);
    setErrors([]);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-email-2fa", {
        body: { email: validatedCredentials.email, code: email2FACode },
      });

      // Handle invoke-level errors (network issues, etc.)
      if (invokeError && !data) {
        console.error("2FA verification invoke error:", invokeError);
        setErrors([invokeError.message || "Failed to verify code. Please try again."]);
        setIsLoading(false);
        return;
      }

      if (data?.success) {
        // Re-authenticate using direct Supabase call to avoid useAuth hook interference
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: validatedCredentials.email,
          password: validatedCredentials.password,
        });

        if (signInError) {
          setErrors([signInError.message]);
          return;
        }

        // Wait for session to be fully established before navigating
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session) {
          setErrors(["Failed to establish session. Please try again."]);
          return;
        }

        // Track login with user_id
        try {
          await supabase.functions.invoke("track-login", {
            body: { user_id: sessionData.session.user.id },
          });
        } catch (trackError) {
          console.error("Failed to track login:", trackError);
        }

        // Navigate to dashboard only after session is confirmed
        navigate("/admin-dashboard");
      } else {
        setEmail2FAAttempts((prev) => prev + 1);
        setEmail2FACode("");

        if (data?.locked) {
          setErrors(["Too many failed attempts. Please wait 15 minutes before trying again."]);
          // Reset to login form
          setRequiresEmail2FA(false);
          setValidatedCredentials(null);
          setTempUserId(null);
          setEmail2FAAttempts(0);
        } else if (data?.attempts_remaining !== undefined) {
          setErrors([`Invalid verification code. ${data.attempts_remaining} attempts remaining.`]);
        } else {
          setErrors([data?.error || "Invalid verification code. Please try again."]);
        }
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend2FACode = async () => {
    if (!validatedCredentials) return;

    setEmail2FASending(true);
    setErrors([]);

    try {
      const { data: sendResult } = await supabase.functions.invoke("send-email-2fa", {
        body: { email: validatedCredentials.email },
      });

      if (sendResult?.success) {
        setSuccessMessage("A new verification code has been sent to your email.");
        setEmail2FACode("");
      } else {
        setErrors([sendResult?.error || "Failed to resend verification code."]);
      }
    } catch (error) {
      console.error("Error resending 2FA code:", error);
      setErrors(["Failed to resend verification code. Please try again."]);
    } finally {
      setEmail2FASending(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresEmail2FA(false);
    setValidatedCredentials(null);
    setTempUserId(null);
    setEmail2FACode("");
    setEmail2FAAttempts(0);
    setErrors([]);
    setSuccessMessage("");
  };

  const handleForgotPassword = () => {
    setSuccessMessage("Please contact the system administrator for password reset assistance");
    setTimeout(() => setSuccessMessage(""), 7000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when admin starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header hideLanguageSelector useConsoleLogo />

      {/* Admin Auth Section */}
      <section className="py-20 theme-blue-banking">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center shadow-banking">
                  <Shield className="h-10 w-10 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-primary mb-4">Admin Console</h1>
              <p className="text-xl text-muted-foreground">Secure administrative access to {bankName} systems</p>

              <div className="flex items-center justify-center mt-4 space-x-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Enhanced Security Required</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Security Features */}
              <div className="order-2 lg:order-1 animate-slide-up">
                <div
                  className="w-full h-64 lg:h-80 rounded-lg bg-cover bg-center shadow-banking mb-6"
                  style={{ backgroundImage: `url(${securityImage})` }}
                />
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border">
                    <Shield className="h-6 w-6 text-primary" />
                    <div>
                      <span className="font-medium text-foreground">Multi-Factor Authentication</span>
                      <p className="text-xs text-muted-foreground">Enhanced security protocols</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border">
                    <Vault className="h-6 w-6 text-primary" />
                    <div>
                      <span className="font-medium text-foreground">Encrypted Access</span>
                      <p className="text-xs text-muted-foreground">Bank-grade encryption</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border">
                    <KeyRound className="h-6 w-6 text-primary" />
                    <div>
                      <span className="font-medium text-foreground">Admin Privileges</span>
                      <p className="text-xs text-muted-foreground">Restricted access control</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Login Form / 2FA Form */}
              <div className="order-1 lg:order-2 animate-fade-in">
                {requiresEmail2FA ? (
                  // Email 2FA Verification Form
                  <Card className="shadow-banking border-2">
                    <CardHeader className="text-center">
                      <CardTitle className="text-primary text-2xl flex items-center justify-center space-x-2">
                        <Mail className="h-6 w-6" />
                        <span>Email Verification</span>
                      </CardTitle>
                      <CardDescription>Enter the 6-digit code sent to your email address</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Success Message */}
                      {successMessage && (
                        <Alert className="mb-4 border-green-200 bg-green-50">
                          <AlertCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                        </Alert>
                      )}

                      {/* Error Messages */}
                      {errors.length > 0 && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            <ul className="list-disc pl-4 space-y-1">
                              {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleEmail2FASubmit} className="space-y-6">
                        <div className="flex justify-center">
                          <InputOTP value={email2FACode} onChange={setEmail2FACode} maxLength={6}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          type="submit"
                          variant="banking"
                          className="w-full hover-lift shadow-banking"
                          disabled={isLoading || email2FACode.length !== 6}
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Verifying...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4" />
                              <span>Verify Code</span>
                            </div>
                          )}
                        </Button>
                      </form>

                      <div className="mt-6 space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={handleResend2FACode}
                          disabled={email2FASending}
                        >
                          {email2FASending ? (
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Sending...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="h-4 w-4" />
                              <span>Resend Code</span>
                            </div>
                          )}
                        </Button>

                        <Button type="button" variant="ghost" className="w-full" onClick={handleBackToLogin}>
                          Back to Login
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Standard Login Form
                  <Card className="shadow-banking border-2">
                    <CardHeader className="text-center">
                      <CardTitle className="text-primary text-2xl flex items-center justify-center space-x-2">
                        <Shield className="h-6 w-6" />
                        <span>Admin Login</span>
                      </CardTitle>
                      <CardDescription>Enter your administrative credentials to access the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Success Message */}
                      {successMessage && (
                        <Alert className="mb-4 border-green-200 bg-green-50">
                          <AlertCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                        </Alert>
                      )}

                      {/* Error Messages */}
                      {errors.length > 0 && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700">
                            <ul className="list-disc pl-4 space-y-1">
                              {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="admin-email">Admin Email</Label>
                          <Input
                            id="admin-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            placeholder="Enter admin email"
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-2"
                            autoComplete="email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="admin-password">Admin Password</Label>
                          <Input
                            id="admin-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            placeholder="Enter admin password"
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-2"
                            autoComplete="current-password"
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-input" />
                            <span className="text-muted-foreground">Secure session</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-primary hover:text-primary-dark hover:underline transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>

                        <Button
                          type="submit"
                          variant="banking"
                          className="w-full hover-lift shadow-banking"
                          disabled={isLoading}
                          aria-describedby="admin-login-desc"
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Authenticating...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4" />
                              <span>Access Admin Console</span>
                            </div>
                          )}
                        </Button>
                        <p id="admin-login-desc" className="sr-only">
                          Click to access the {bankName} administrative console
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Need technical support?{" "}
                    <Link to="/contact" className="text-primary hover:text-primary-dark">
                      Contact IT Support
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Unauthorized access attempts are logged and monitored
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LoginFooter />

      {/* Non-Admin Warning Dialog */}
      <AlertDialog open={showNonAdminDialog} onOpenChange={setShowNonAdminDialog}>
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
              This login portal is reserved exclusively for authorized administrators.
              Regular user accounts cannot access the admin console.
              Please use the customer login page to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className="w-full sm:w-auto min-w-[200px] gradient-primary text-primary-foreground hover:opacity-90"
              onClick={() => {
                setShowNonAdminDialog(false);
                navigate("/auth");
              }}
            >
              Go to Customer Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuth;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Vault, AlertCircle, UserPlus, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const adminSignupSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password too long"),
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name too long"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const AdminSignup = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Redirect if not authenticated (admin access validated server-side)
    if (!user) {
      navigate("/admin-auth");
    }
    // Note: Admin access is validated server-side via RLS policies
    // If user reaches this page, they have proper permissions
  }, [user, profile, navigate]);

  const validateForm = () => {
    try {
      adminSignupSchema.parse(formData);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => err.message);
      }
      return ["Validation failed"];
    }
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
      // Use the secure admin-create-user edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          role: 'admin'
        }
      });

      if (error) {
        console.error('Admin creation error:', error);
        setErrors([error.message || "Failed to create admin account"]);
        return;
      }

      if (data.error) {
        setErrors([data.error]);
        return;
      }

      toast({
        title: "Success",
        description: "Admin account created successfully!",
      });

      setSuccessMessage("Admin account created successfully! The new admin can now log in.");
      setFormData({
        email: "",
        password: "",
        fullName: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error('Admin signup error:', error);
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Show loading while checking authentication
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Verifying permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">Create Admin Account</h1>
          <p className="text-xl text-muted-foreground">
            Securely add a new administrator
          </p>
        </div>

        <Card className="shadow-banking">
          <CardHeader className="text-center">
            <CardTitle className="text-primary text-2xl">
              New Administrator
            </CardTitle>
            <CardDescription>
              Only admins can create admin accounts via secure edge function
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Success Message */}
            {successMessage && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {successMessage}
                </AlertDescription>
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  value={formData.fullName} 
                  onChange={e => handleInputChange("fullName", e.target.value)} 
                  placeholder="Administrator Name" 
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
                  autoComplete="name" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={e => handleInputChange("email", e.target.value)} 
                  placeholder="admin@wyseforte.co.uk"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
                  autoComplete="email" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={e => handleInputChange("password", e.target.value)} 
                  placeholder="Create a secure password" 
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
                  autoComplete="new-password" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={formData.confirmPassword} 
                  onChange={e => handleInputChange("confirmPassword", e.target.value)} 
                  placeholder="Confirm your password" 
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20" 
                  autoComplete="new-password" 
                />
              </div>
              
              <Button type="submit" variant="banking" className="w-full hover-lift" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Create Admin Account</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSignup;
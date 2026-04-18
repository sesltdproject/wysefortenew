import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useSecureNavigation } from "@/hooks/useSecureNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminWelcome } from "@/components/admin/AdminWelcome";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { AdminFooter } from "@/components/admin/AdminFooter";
import { RefactoredAdminUserManagement } from "@/components/admin/users/RefactoredAdminUserManagement";
import { AdminTransactions } from "@/components/admin/AdminTransactions";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";

import { AdminSecurityCenter } from "@/components/admin/AdminSecurityCenter";
import { AdminDeposits } from "@/components/admin/AdminDeposits";
import { WebsiteSettings } from "@/components/admin/WebsiteSettings";
import { EmailTemplateManager } from "@/components/admin/email-templates/EmailTemplateManager";

const AdminDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [newOtp, setNewOtp] = useState("");
  const [confirmOtp, setConfirmOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [roleVerified, setRoleVerified] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/admin-auth");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/admin-auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Auto-logout functionality - only enable after profile is loaded and role verified
  useInactivityTimer({
    timeout: 15 * 60 * 1000, // 15 minutes (increased from 5)
    onTimeout: handleLogout,
    enabled: !!user && !!profile && !loading && roleVerified
  });

  // Secure navigation monitoring - only enable after profile is loaded and role verified
  useSecureNavigation({
    isAuthenticated: !!user,
    userRole: 'admin', // Server-side validation via RLS policies
    onLogout: handleLogout,
    enabled: !!user && !!profile && !loading && roleVerified
  });

  // Apply blue theme to body so portaled elements (dialogs, modals, toasts) inherit it
  useEffect(() => {
    document.body.classList.add('theme-blue-banking');
    return () => document.body.classList.remove('theme-blue-banking');
  }, []);

  // Strict role-based access control - verify user is an admin
  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!user?.id || loading) return;
      
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking role:', error);
        }
        
        // If user does not have admin role, sign them out and redirect to user auth
        if (!roleData || roleData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You do not have admin privileges. Redirecting to user login.",
            variant: "destructive",
          });
          await signOut();
          navigate('/auth');
          return;
        }
        
        setRoleVerified(true);
      } catch (error) {
        console.error('Error verifying admin role:', error);
        // On error, deny access to be safe
        await signOut();
        navigate('/auth');
      }
    };
    
    if (user && !loading) {
      verifyAdminRole();
    }
  }, [user, loading, signOut, navigate, toast]);

  useEffect(() => {
    // Redirect if not authenticated (admin check via server-side RLS)
    if (!loading && !user) {
      navigate("/admin-auth");
    }
  }, [user, loading, navigate]);


  const handleAdminOtpChange = () => {
    if (newOtp !== confirmOtp) {
      setOtpMessage("OTP codes do not match");
      return;
    }
    if (newOtp.length < 6 || newOtp.length > 10) {
      setOtpMessage("OTP must be 6-10 digits");
      return;
    }
    
    // Simulate OTP update
    setOtpMessage("Admin OTP updated successfully");
    setNewOtp("");
    setConfirmOtp("");
    setTimeout(() => {
      setShowOtpForm(false);
      setOtpMessage("");
    }, 2000);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "users":
        return <RefactoredAdminUserManagement />;
      case "transactions":
        return <AdminTransactions />;
      case "deposits":
        return <AdminDeposits />;
      case "reports":
        return <AdminReports />;
      case "website":
        return <WebsiteSettings />;
      case "email-templates":
        return <EmailTemplateManager />;
      case "settings":
        return <AdminSettingsPage />;
      case "system-settings":
        return (
          <AdminSettings
            showOtpForm={showOtpForm}
            newOtp={newOtp}
            confirmOtp={confirmOtp}
            otpMessage={otpMessage}
            onShowOtpForm={() => setShowOtpForm(true)}
            onNewOtpChange={setNewOtp}
            onConfirmOtpChange={setConfirmOtp}
            onOtpSubmit={handleAdminOtpChange}
            onCancelOtp={() => setShowOtpForm(false)}
          />
        );
      default:
        return <AdminOverview onSectionChange={setActiveSection} />;
    }
  };

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin console...</p>
        </div>
      </div>
    );
  }

  // Don't render until authenticated and role verified
  if (!user || !profile || !roleVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background theme-blue-banking">
      <AdminHeader onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      
      {/* Admin Dashboard Content */}
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="container mx-auto px-2 sm:px-4">
          <AdminWelcome 
            admin={{ 
              email: profile?.email || '',
              name: profile?.full_name || 'Admin',
              role: 'admin', // Server-validated via RLS
              avatar_url: profile?.avatar_url || undefined
            }}
            onLogout={handleLogout} 
            isLoggingOut={isLoggingOut}
            onSettingsClick={() => setActiveSection('settings')}
          />

          <AdminNavigation 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />

          {/* Page Content */}
          {renderSectionContent()}

          <AdminFooter />
        </div>
      </section>

    </div>
  );
};

export default AdminDashboard;

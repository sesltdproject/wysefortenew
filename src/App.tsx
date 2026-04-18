import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WebsiteSettingsProvider } from "@/hooks/useWebsiteSettings";
import { TranslationProvider } from "@/i18n";
import { DynamicHeadManager } from "@/components/DynamicHeadManager";
import { ProtectedPublicRoute } from "@/components/ProtectedPublicRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import Careers from "./pages/Careers";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import AdminSignup from "./pages/AdminSignup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AccountApplication from "./pages/AccountApplication";
import { KYC } from "./pages/user/KYC";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WebsiteSettingsProvider>
        <TranslationProvider>
          <DynamicHeadManager />
          <TooltipProvider>
            <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Protected public pages */}
              <Route path="/" element={
                <ProtectedPublicRoute>
                  <Home />
                </ProtectedPublicRoute>
              } />
              <Route path="/about" element={
                <ProtectedPublicRoute>
                  <About />
                </ProtectedPublicRoute>
              } />
              <Route path="/services" element={
                <ProtectedPublicRoute>
                  <Services />
                </ProtectedPublicRoute>
              } />
              <Route path="/contact" element={
                <ProtectedPublicRoute>
                  <Contact />
                </ProtectedPublicRoute>
              } />
              <Route path="/legal" element={
                <ProtectedPublicRoute>
                  <Legal />
                </ProtectedPublicRoute>
              } />
              <Route path="/careers" element={
                <ProtectedPublicRoute>
                  <Careers />
                </ProtectedPublicRoute>
              } />
              
              {/* Always accessible pages */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/account-application" element={<AccountApplication />} />
              <Route path="/admin-auth" element={<AdminAuth />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              
              {/* Protected authenticated pages (already have their own auth guards) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/kyc" element={<KYC />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              {/* 404 - also protected */}
              <Route path="*" element={
                <ProtectedPublicRoute>
                  <NotFound />
                </ProtectedPublicRoute>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TranslationProvider>
      </WebsiteSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

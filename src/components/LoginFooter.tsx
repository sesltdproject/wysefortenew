import { MapPin, Phone, Mail, Shield, Clock, CreditCard, Vault } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

const LoginFooter = () => {
  const { settings, isLoading } = useWebsiteSettings();

  return (
    <footer style={{ backgroundColor: "hsl(214 100% 25%)" }} className="text-white">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            {!isLoading && settings && (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  {settings.footerLogoUrl ? (
                    <img
                      src={settings.footerLogoUrl}
                      alt={`${settings.bankName} logo`}
                      className="h-12 lg:h-16 w-auto object-contain max-w-[240px] lg:max-w-[300px]"
                    />
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(214 100% 35%)" }}>
                        <Vault className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-base lg:text-lg font-bold text-white">
                        {settings.bankName}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-white/60 text-xs lg:text-sm max-w-xs mb-2">
                  Your trusted partner in secure digital banking. We provide innovative financial solutions with the highest standards of security and customer service.
                </p>
              </>
            )}
          </div>

          {/* Digital Banking Features */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold mb-2 text-[hsl(42,87%,55%)] text-xs lg:text-sm">Digital Banking Features</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start space-x-2">
                <Shield className="h-3 w-3 text-[hsl(42,87%,55%)] mt-0.5 flex-shrink-0" />
                <p className="font-medium text-white/80 text-xs">Bank-Grade Security</p>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-3 w-3 text-[hsl(42,87%,55%)] mt-0.5 flex-shrink-0" />
                <p className="font-medium text-white/80 text-xs">24/7 Access</p>
              </div>
              <div className="flex items-start space-x-2">
                <CreditCard className="h-3 w-3 text-[hsl(42,87%,55%)] mt-0.5 flex-shrink-0" />
                <p className="font-medium text-white/80 text-xs">Instant Transfers</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold mb-2 text-[hsl(42,87%,55%)] text-xs lg:text-sm">Contact Info</h3>
            {!isLoading && settings && (
              <div className="space-y-2 text-white/60 text-xs">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-3 w-3 text-[hsl(42,87%,55%)] mt-0.5 flex-shrink-0" />
                  <p className="break-words">{settings.bankAddress}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3 text-[hsl(42,87%,55%)] flex-shrink-0" />
                  <p>{settings.bankPhone}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-[hsl(42,87%,55%)] flex-shrink-0" />
                  <p className="break-words">{settings.contactEmail}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-3 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
            <div className="flex flex-wrap gap-3">
              <span>FDIC Insured</span>
              <span>SSL Secured</span>
              <span>PCI Compliant</span>
            </div>
            <div className="flex items-center gap-4">
              <span>© 2026 {!isLoading && settings?.bankName}. All rights reserved.</span>
              <span className="text-[hsl(42,87%,55%)]">|</span>
              <span>Member FDIC</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LoginFooter;

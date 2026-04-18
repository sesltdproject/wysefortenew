import { Link, useLocation } from "react-router-dom";
import { Vault, MapPin, Phone, Mail, Shield, CreditCard, Clock, Headphones } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTranslation } from "@/i18n";

interface FooterProps {
  variant?: 'default' | 'banking';
}

const Footer = ({ variant = 'default' }: FooterProps) => {
  const { settings, isLoading } = useWebsiteSettings();
  const { t } = useTranslation();
  const location = useLocation();
  
  const hideQuickLinks = !isLoading && settings?.showNavigationMenu === false;
  const isBanking = variant === 'banking';
  const accentColor = isBanking ? 'text-[hsl(42,87%,55%)]' : 'text-primary';
  const hoverColor = isBanking ? 'hover:text-[hsl(42,87%,55%)]' : 'hover:text-primary';
  
  return (
    <footer className={isBanking ? "bg-[hsl(220,60%,12%)] text-white" : "bg-[hsl(220,10%,15%)] text-white"}>
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {hideQuickLinks ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isBanking ? 'bg-[hsl(220,60%,30%)]' : 'bg-primary'}`}>
                            <Vault className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-base lg:text-lg font-bold text-white">
                            {settings.bankName}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-white/60 text-xs lg:text-sm max-w-xs mb-2">
                      {t('footer.description')}
                    </p>
                  </>
                )}
              </div>

              <div className="lg:col-span-1">
                <h3 className={`font-semibold mb-2 ${accentColor} text-xs lg:text-sm`}>{t('footer.digitalBankingFeatures')}</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start space-x-2">
                    <Shield className={`h-3 w-3 ${accentColor} mt-0.5 flex-shrink-0`} />
                    <p className="font-medium text-white/80 text-xs">{t('footer.bankGradeSecurity')}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className={`h-3 w-3 ${accentColor} mt-0.5 flex-shrink-0`} />
                    <p className="font-medium text-white/80 text-xs">{t('footer.access24x7')}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CreditCard className={`h-3 w-3 ${accentColor} mt-0.5 flex-shrink-0`} />
                    <p className="font-medium text-white/80 text-xs">{t('footer.instantTransfers')}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <h3 className={`font-semibold mb-2 ${accentColor} text-xs lg:text-sm`}>{t('footer.contactInfo')}</h3>
                {!isLoading && settings && (
                  <div className="space-y-2 text-white/60 text-xs">
                    <div className="flex items-start space-x-2">
                      <MapPin className={`h-3 w-3 ${accentColor} mt-0.5 flex-shrink-0`} />
                      <p className="break-words">{settings.bankAddress}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className={`h-3 w-3 ${accentColor} flex-shrink-0`} />
                      <p>{settings.bankPhone}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className={`h-3 w-3 ${accentColor} flex-shrink-0`} />
                      <p className="break-words">{settings.contactEmail}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
                <div className="flex flex-wrap gap-3">
                  <span>{t('footer.fdicInsured')}</span>
                  <span>{t('footer.sslSecured')}</span>
                  <span>{t('footer.pciCompliant')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>© 2026 {!isLoading && settings?.bankName}. {t('footer.allRightsReserved')}</span>
                  <span className={accentColor}>|</span>
                  <span>{t('footer.memberFDIC')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              {!isLoading && settings && (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    {settings.footerLogoUrl ? (
                      <img 
                        src={settings.footerLogoUrl} 
                        alt={`${settings.bankName} logo`}
                        className="h-12 lg:h-16 w-auto object-contain max-w-[240px] lg:max-w-[300px]"
                      />
                    ) : (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isBanking ? 'bg-[hsl(220,60%,30%)]' : 'bg-primary'}`}>
                          <Vault className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <span className="text-lg lg:text-xl font-bold text-white">
                            {settings.bankName}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-white/60 mb-4 max-w-md text-sm lg:text-base">
                    {t('footer.description')}
                  </p>
                  <p className="text-xs lg:text-sm text-white/40">
                    © 2026 {settings.bankName}. {t('footer.allRightsReserved')} | {t('footer.memberFDIC')} | FCA Authorised | VISA · MasterCard · LINK Member
                  </p>
                </>
              )}
            </div>

            <div className="col-span-1">
              <h3 className={`font-semibold mb-3 lg:mb-4 ${accentColor} text-sm lg:text-base`}>{t('footer.quickLinks')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.aboutUs')}
                  </Link>
                </li>
                <li>
                  <Link to="/services" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.services')}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.contact')}
                  </Link>
                </li>
                <li>
                  <Link to="/legal" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.legal')}
                  </Link>
                </li>
                <li>
                  <Link to="/careers" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.careers')}
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className={`text-white/60 ${hoverColor} transition-colors text-sm lg:text-base`}>
                    {t('footer.customerLogin')}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1">
              <h3 className={`font-semibold mb-3 lg:mb-4 ${accentColor} text-sm lg:text-base`}>{t('footer.contactInfo')}</h3>
              {!isLoading && settings && (
                <div className="space-y-3 text-white/60 text-sm lg:text-base">
                  <div className="flex items-start space-x-3">
                    <MapPin className={`h-4 w-4 ${accentColor} mt-0.5 flex-shrink-0`} />
                    <p className="break-words">{settings.bankAddress}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className={`h-4 w-4 ${accentColor} flex-shrink-0`} />
                    <p>{settings.bankPhone}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className={`h-4 w-4 ${accentColor} flex-shrink-0`} />
                    <p className="break-words">{settings.contactEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;

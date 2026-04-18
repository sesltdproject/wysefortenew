import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Vault, Lock, ChevronDown, Menu } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { LanguageSelector } from "./LanguageSelector";

interface HeaderProps {
  hideLanguageSelector?: boolean;
  transparent?: boolean;
  useConsoleLogo?: boolean;
}

const Header = ({ hideLanguageSelector = false, transparent = false, useConsoleLogo = false }: HeaderProps) => {
  const location = useLocation();
  const { settings, isLoading } = useWebsiteSettings();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const effectiveLogoUrl = useConsoleLogo
    ? (settings?.consoleLogoUrl || settings?.logoUrl)
    : settings?.logoUrl;

  useEffect(() => {
    if (effectiveLogoUrl) {
      const img = new Image();
      img.onload = () => setLogoLoaded(true);
      img.onerror = () => setLogoLoaded(true);
      img.src = effectiveLogoUrl;
    } else if (!isLoading && settings) {
      setLogoLoaded(true);
    }
  }, [effectiveLogoUrl, isLoading, settings]);
  
  const hideNavigation = !isLoading && settings?.showNavigationMenu === false;

  const navLinks = [
    { path: "/", label: t('nav.home') },
    { path: "/about", label: t('nav.about') },
    { path: "/contact", label: t('nav.contact') },
    { path: "/legal", label: t('nav.legal') },
    { path: "/careers", label: t('nav.careers') },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className={`z-50 transition-all duration-300 ${transparent ? 'absolute top-0 left-0 w-full bg-transparent border-b border-transparent' : 'sticky top-0 bg-white border-b border-border'}`}>
      <div className="container mx-auto px-4 py-3 lg:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 lg:space-x-3 group">
            {!isLoading && logoLoaded && (
              <>
                {effectiveLogoUrl ? (
                  <img 
                    src={effectiveLogoUrl} 
                    alt={`${settings.bankName} logo`}
                    className="h-[45px] lg:h-[63px] w-auto object-contain max-w-[200px] lg:max-w-[315px]"
                  />
                ) : (
                  <>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Vault className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <div className="hidden sm:block">
                      <span className={`text-lg lg:text-2xl font-bold ${transparent ? 'text-white' : 'text-foreground'}`}>
                        {settings?.bankName}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          {!hideNavigation && (
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList className="flex items-center space-x-1">
                <NavigationMenuItem>
                  <Link 
                    to="/" 
                    className={`relative px-4 py-2 font-medium transition-colors ${
                      isActive("/") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.home')}
                    {isActive("/") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link 
                    to="/about" 
                    className={`relative px-4 py-2 font-medium transition-colors ${
                      isActive("/about") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.about')}
                    {isActive("/about") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={`relative px-4 py-2 font-medium transition-colors bg-transparent border-none shadow-none ${
                      isActive("/services") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.services')}
                    <ChevronDown className="ml-1 h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    {isActive("/services") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-80 p-6 bg-white border border-border rounded-xl shadow-lg">
                      <div className="grid gap-4">
                        <div className="space-y-1">
                          <Link to="/services" className="block p-3 rounded-lg hover:bg-secondary text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                            <span className="font-semibold text-foreground">Savings</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Fixed Rate Bonds, Sapphire Account, Notice Accounts</p>
                          </Link>
                          <Link to="/services" className="block p-3 rounded-lg hover:bg-secondary text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                            <span className="font-semibold text-foreground">Lending</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Motor Finance, Asset Finance, Specialist Vehicles</p>
                          </Link>
                          <Link to="/services" className="block p-3 rounded-lg hover:bg-secondary text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                            <span className="font-semibold text-foreground">Payments</span>
                            <p className="text-xs text-muted-foreground mt-0.5">Apple Pay, NFC, Faster Payments, Mobile Wallets</p>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link 
                    to="/contact" 
                    className={`relative px-4 py-2 font-medium transition-colors ${
                      isActive("/contact") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.contact')}
                    {isActive("/contact") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link 
                    to="/legal" 
                    className={`relative px-4 py-2 font-medium transition-colors ${
                      isActive("/legal") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.legal')}
                    {isActive("/legal") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link 
                    to="/careers" 
                    className={`relative px-4 py-2 font-medium transition-colors ${
                      isActive("/careers") 
                        ? (transparent ? "text-white bg-primary" : "text-primary")
                        : (transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-primary")
                    }`}
                  >
                    {t('nav.careers')}
                    {isActive("/careers") && !transparent && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}

          {/* Mobile Navigation & Auth Buttons */}
          <div className="flex items-center space-x-2">
            {!hideLanguageSelector && (
              <div className="hidden md:block">
                <LanguageSelector variant="header" transparent={transparent} />
              </div>
            )}

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                asChild
                className="px-4 lg:px-6"
              >
                <Link to="/account-application" className="flex items-center space-x-2">
                  <span className="font-medium">{t('nav.openAccount')}</span>
                </Link>
              </Button>
              <Button 
                variant="default" 
                size="sm"
                asChild
                className="px-4 lg:px-6"
              >
                <Link to="/auth" className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">{t('common.login')}</span>
                </Link>
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-4">
                  {!isLoading && settings && (
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Vault className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-foreground">
                        {settings.bankName}
                      </span>
                    </div>
                  )}

                  {!hideLanguageSelector && (
                    <div className="pb-4 border-b">
                      <LanguageSelector variant="full" />
                    </div>
                  )}

                  {!hideNavigation && (
                    <div className="space-y-2">
                      {navLinks.map((link) => (
                        <Link 
                          key={link.path}
                          to={link.path} 
                          onClick={() => setIsOpen(false)}
                          className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                            isActive(link.path) 
                              ? "text-primary bg-primary/5 border-l-2 border-primary" 
                              : "text-foreground/70 hover:text-primary hover:bg-secondary"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <Link 
                        to="/services" 
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                          isActive("/services") 
                            ? "text-primary bg-primary/5 border-l-2 border-primary" 
                            : "text-foreground/70 hover:text-primary hover:bg-secondary"
                        }`}
                      >
                        {t('nav.services')}
                      </Link>
                    </div>
                  )}

                  {/* Mobile Auth Buttons */}
                  <div className="space-y-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="lg"
                      asChild
                      className="w-full"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to="/account-application" className="flex items-center justify-center space-x-2">
                        <span className="font-medium">{t('nav.openAccount')}</span>
                      </Link>
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg"
                      asChild
                      className="w-full"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to="/auth" className="flex items-center justify-center space-x-2">
                        <Lock className="h-4 w-4" />
                        <span className="font-medium">{t('common.login')}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

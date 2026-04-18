import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation } from "@/components/ScrollAnimations";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Shield, FileText, Scale, Cookie, Lock, Globe } from "lucide-react";
import heroLegal from "@/assets/hero-legal.jpg";
import ParallaxSection from "@/components/ParallaxSection";

const Legal = () => {
  const { settings } = useWebsiteSettings();
  const bankName = settings?.bankName || "Wyseforte Bank";

  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={heroLegal} alt="Legal & Privacy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center pt-16">
          <ScrollAnimation direction="up">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Legal & Privacy</h1>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={0.15}>
            <p className="text-xl max-w-3xl mx-auto text-white/80">
              Transparency, compliance and your rights
            </p>
          </ScrollAnimation>
        </div>
      </section>

      <ParallaxSection variant="subtle" className="py-16 lg:py-20">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">

          <ScrollAnimation direction="left">
            <Card className="border border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-2xl">Privacy & Data Handling Policy</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 text-muted-foreground text-sm leading-relaxed">
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Cookie className="h-4 w-4 text-primary" /> Cookies
                  </h3>
                  <p>
                    Our website uses cookies to ensure functionality, analyse usage patterns, and improve your experience. Essential cookies are required for the site to function; analytics cookies help us understand how visitors use the platform. You can manage your cookie preferences at any time through your browser settings.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Your Rights Under GDPR & DPA 2018</h3>
                  <p className="mb-3">Under the UK General Data Protection Regulation and the Data Protection Act 2018, you have the following rights:</p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to access your personal data</li>
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to rectification of inaccurate data</li>
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to erasure ("right to be forgotten")</li>
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to restrict processing</li>
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to data portability</li>
                    <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Right to object to processing</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Data Collection</h3>
                  <p>
                    We collect personal data necessary for account opening, regulatory compliance (KYC/AML), and service delivery. This includes identity information, contact details, financial data, and transaction records. We do not sell your data to third parties. Data is processed in accordance with our lawful basis under GDPR.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  To exercise any of your data rights, contact our Data Protection Officer at {settings?.contactEmail || "info@yourbank.com"}.
                </p>
              </CardContent>
            </Card>
          </ScrollAnimation>

          <ScrollAnimation direction="right" delay={0.1}>
            <Card className="border border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-2xl">Terms of Relationship</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                <p>
                  Our Terms of Relationship govern the agreement between you and {bankName} for the provision of banking services. These terms cover account operation, interest rates, fees and charges, communication preferences, and the responsibilities of both parties.
                </p>
                <p>
                  By opening an account with {bankName}, you agree to be bound by these terms. We recommend reviewing the full document before applying.
                </p>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Terms of Relationship (PDF)
                </Button>
              </CardContent>
            </Card>
          </ScrollAnimation>

          <ScrollAnimation direction="left" delay={0.2}>
            <Card className="border border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-2xl">Regulatory Disclosures</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> FCA Authorisation
                  </h3>
                  <p>
                    {bankName} is authorised by the Prudential Regulation Authority (PRA) and regulated by the Financial Conduct Authority (FCA) and the PRA. Our Financial Services Register number can be found on the FCA Register at register.fca.org.uk.
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> PSD2 Compliance
                  </h3>
                  <p>
                    We are fully compliant with the Payment Services Directive 2 (PSD2), providing strong customer authentication, secure API access for authorised third-party providers, and transparent payment processing. This enables Open Banking functionality for eligible accounts.
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> FSCS Protection
                  </h3>
                  <p>
                    Eligible deposits with {bankName} are protected by the Financial Services Compensation Scheme (FSCS) up to £85,000 per depositor. For more information visit www.fscs.org.uk.
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollAnimation>
        </div>
      </ParallaxSection>

      <Footer />
    </div>
  );
};

export default Legal;

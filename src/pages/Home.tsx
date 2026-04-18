import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Award, CheckCircle, Bell, PieChart, Clock, Zap, CreditCard, Fingerprint, ShieldCheck, Lock, Activity, Headphones } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation, StaggerChildren, CountUpAnimation } from "@/components/ScrollAnimations";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTranslation } from "@/i18n";
import HeroSlider from "@/components/HeroSlider";
import ParallaxSection from "@/components/ParallaxSection";
import cardSecurity from "@/assets/card-security.jpg";
import cardDigital from "@/assets/card-digital.jpg";
import cardAuthorised from "@/assets/card-authorised.jpg";
import cardSavings from "@/assets/card-savings.jpg";
import cardLending from "@/assets/card-lending.jpg";
import cardPayments from "@/assets/card-payments.jpg";

const Home = () => {
  const { settings, isLoading } = useWebsiteSettings();
  const { t } = useTranslation();

  const serviceTeasers = [
    {
      image: cardSavings,
      title: "Savings",
      description: "Fixed Rate Bonds, Sapphire Accounts, and 60-Day Notice accounts with competitive rates. Your deposits are protected under the FSCS.",
      link: "/services"
    },
    {
      image: cardLending,
      title: "Lending",
      description: "Motor Finance, Asset Finance, and specialist Wheelchair Adapted Vehicle Finance. Flexible terms tailored to your needs.",
      link: "/services"
    },
    {
      image: cardPayments,
      title: "Payments",
      description: "Apple Pay, NFC contactless, Faster Payments and mobile wallets. Modern payment innovation at your fingertips.",
      link: "/services"
    }
  ];

  const trustBadges = [
    { icon: Shield, label: "FCA Authorised" },
    { icon: Award, label: "VISA Member" },
    { icon: Award, label: "MasterCard Member" },
    { icon: CheckCircle, label: "LINK Network" },
    { icon: Shield, label: "FSCS Protected" }
  ];

  const whyChooseCards = [
    { image: cardSecurity, title: t("home.bankGradeSecurity"), desc: "Advanced encryption, multi-factor authentication, and FSCS deposit protection up to £85,000 per depositor." },
    { image: cardDigital, title: "Digital First", desc: "Manage your accounts 24/7 from any device. Apple Pay, contactless NFC, Faster Payments and mobile wallets built in." },
    { image: cardAuthorised, title: "FCA Authorised", desc: "Authorised by the Financial Conduct Authority. VISA, MasterCard & LINK network member. Fully regulated and compliant." },
  ];

  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />
      <HeroSlider />

      {/* Introduction */}
      <section className="py-12 lg:py-20 bg-gradient-to-b from-secondary/60 to-background">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-12 h-1 bg-primary mx-auto mb-6 rounded-full" />
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Digital Premium Bank
              </h2>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                {!isLoading && settings?.bankName} is a premium digital bank specialising in savings, lending and payments. FCA authorised, we combine modern technology with specialist expertise to serve individuals and businesses across the UK.
              </p>
            </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Trust & Compliance Badges */}
      <section className="py-6 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <StaggerChildren className="flex flex-wrap items-center justify-center gap-6 lg:gap-10" staggerDelay={0.08}>
            {trustBadges.map((badge, index) =>
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <badge.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            )}
          </StaggerChildren>
        </div>
      </section>

      {/* Why Choose Us */}
      <ParallaxSection className="py-12 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 lg:mb-4">
                {t("home.whyChooseUs")} {!isLoading && settings?.bankName}
              </h2>
              <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                We combine digital innovation with trusted banking standards to deliver a secure and modern banking experience.
              </p>
            </div>
          </ScrollAnimation>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {whyChooseCards.map((card, index) => (
              <Card key={index} className="hover-lift text-center border border-border overflow-hidden">
                <div className="w-full h-40 overflow-hidden">
                  <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
                </div>
                <CardHeader className="pt-4">
                  <CardTitle className="text-foreground">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </StaggerChildren>
        </div>
      </ParallaxSection>

      {/* Manage Your Money Smarter */}
      <section className="py-12 lg:py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 lg:mb-4">
                Manage Your Money Smarter
              </h2>
              <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful tools designed to keep you in control of your finances, every day.
              </p>
            </div>
          </ScrollAnimation>

          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" staggerDelay={0.08}>
            {[
              { icon: Bell, title: "Instant Notifications", desc: "Get notified the second you spend, so you always know where your money goes." },
              { icon: PieChart, title: "Spending Insights", desc: "See exactly where your money goes with automatic categorisation and monthly reports." },
              { icon: Clock, title: "24/7 Online Banking", desc: "Access your accounts anytime, anywhere — from desktop, tablet, or mobile." },
              { icon: Zap, title: "Faster Payments", desc: "Send and receive money in seconds, not days. Payments processed around the clock." },
              { icon: CreditCard, title: "Card Controls", desc: "Instantly freeze your card if it's lost or stolen. Unfreeze it just as quickly." },
              { icon: Fingerprint, title: "Multi-Factor Security", desc: "Biometric login, one-time codes, and encryption keep your accounts protected." },
            ].map((feature, index) => (
              <Card key={index} className="hover-lift border border-border p-6 text-center">
                <feature.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Service Teasers */}
      <ParallaxSection variant="dense" className="py-12 lg:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 lg:mb-4">
                {t("home.ourServices")}
              </h2>
              <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                Three core pillars powering your financial life
              </p>
            </div>
          </ScrollAnimation>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {serviceTeasers.map((service, index) =>
              <Card key={index} className="hover-lift border border-border overflow-hidden">
                <div className="w-full h-40 overflow-hidden">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                </div>
                <CardHeader className="text-center pt-4">
                  <CardTitle className="text-foreground text-xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">{service.description}</CardDescription>
                  <div className="text-center mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={service.link}>Learn More</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </StaggerChildren>

          <ScrollAnimation direction="scale" delay={0.3}>
            <div className="text-center mt-8 lg:mt-12">
              <Button variant="default" size="lg" asChild>
                <Link to="/services">{t("home.exploreServices")}</Link>
              </Button>
            </div>
          </ScrollAnimation>
        </div>
      </ParallaxSection>

      {/* Your Money Is Safe With Us */}
      <section className="py-12 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <ScrollAnimation direction="left">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Your Money Is Safe With Us
                </h2>
                <p className="text-base lg:text-lg text-muted-foreground">
                  Security isn't an afterthought — it's the foundation everything at {!isLoading && settings?.bankName} is built on. From regulation to encryption, your money and data are protected at every level.
                </p>
              </div>
            </ScrollAnimation>

            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-4" staggerDelay={0.1}>
              {[
                { icon: ShieldCheck, title: "FSCS Protected", desc: "Your eligible deposits are protected up to £85,000 by the Financial Services Compensation Scheme." },
                { icon: Award, title: "FCA Authorised", desc: "We are authorised and regulated by the Financial Conduct Authority." },
                { icon: Lock, title: "Advanced Encryption", desc: "Your data is protected with bank-grade 256-bit encryption at rest and in transit." },
                { icon: Activity, title: "Fraud Monitoring", desc: "Our systems monitor transactions around the clock to detect and prevent suspicious activity." },
              ].map((item, index) => (
                <Card key={index} className="hover-lift border border-border p-5">
                  <item.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* Did You Know? Stats */}
      <section className="py-12 lg:py-16 bg-secondary/50 border-y border-border">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
              Did You Know?
            </h2>
          </ScrollAnimation>
          <StaggerChildren className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-center" staggerDelay={0.12}>
            {[
              { value: "24/7", label: "Online banking available around the clock" },
              { value: "85000", label: "FSCS deposit protection per depositor (£)", prefix: "£" },
              { value: "< 2 hrs", label: "Average support response time" },
              { value: "99.9%", label: "Platform uptime over the last 12 months" },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                  {stat.prefix ? (
                    <><span>{stat.prefix}</span><CountUpAnimation value={stat.value.replace(stat.prefix, "")} className="" /></>
                  ) : (
                    <CountUpAnimation value={stat.value} className="" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Here When You Need Us */}
      <ParallaxSection variant="subtle" className="py-12 lg:py-20 bg-background">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <ScrollAnimation direction="up">
            <Headphones className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Here When You Need Us
            </h2>
            <p className="text-base lg:text-lg text-muted-foreground mb-8">
              Our UK-based support team is ready to help. Reach us by phone, email, or through your online banking secure messaging — whenever you need assistance.
            </p>
            <Button variant="default" size="lg" asChild>
              <Link to="/contact">Get in Touch</Link>
            </Button>
          </ScrollAnimation>
        </div>
      </ParallaxSection>

      {/* CTA Section */}
      <section className="py-12 lg:py-20 bg-primary">
        <ScrollAnimation direction="up">
          <div className="container mx-auto px-4 text-center text-white">
            <ScrollAnimation direction="up" delay={0.1}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 lg:mb-4">
                Get Started Today
              </h2>
            </ScrollAnimation>
            <ScrollAnimation direction="up" delay={0.2}>
              <p className="text-base lg:text-xl mb-6 lg:mb-8 max-w-2xl mx-auto text-white/80">
                Apply online or log in to our digital platform. Join thousands of customers who trust {!isLoading && settings?.bankName} with their financial future.
              </p>
            </ScrollAnimation>
            <ScrollAnimation direction="scale" delay={0.35}>
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center max-w-lg mx-auto">
                <Button variant="gold" size="lg" asChild>
                  <Link to="/account-application">Apply Online</Link>
                </Button>
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold">
                  <Link to="/auth">{t("nav.customerLogin")}</Link>
                </Button>
              </div>
            </ScrollAnimation>
          </div>
        </ScrollAnimation>
      </section>

      <Footer />
    </div>
  );
};

export default Home;

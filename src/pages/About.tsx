import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation, StaggerChildren, CountUpAnimation } from "@/components/ScrollAnimations";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTranslation } from "@/i18n";
import { Newspaper, Calendar, Mail } from "lucide-react";
import heroAbout from "@/assets/hero-about.jpg";
import ParallaxSection from "@/components/ParallaxSection";
import cardMission from "@/assets/card-mission.jpg";
import cardVision from "@/assets/card-vision.jpg";

const About = () => {
  const { settings } = useWebsiteSettings();
  const { t } = useTranslation();
  const bankName = settings?.bankName || "Wyseforte Bank";

  const milestones = [
  { year: "2005", title: "Foundation", description: "Established as a niche financial services provider with a focus on specialist lending." },
  { year: "2014", title: "Banking Licence", description: "Authorised by the FCA and granted full UK banking licence, expanding into savings products." },
  { year: "2015", title: "Digital Platform", description: "Launched our digital banking platform, bringing 24/7 account access to all customers." },
  { year: "2016", title: "Payments Innovation", description: "Became a principal member of VISA and MasterCard, joined the LINK ATM network." }];


  const newsItems = [
  { date: "2024", title: "New Savings Range Launched", summary: "Introducing our Sapphire Account and enhanced Fixed Rate Bonds with market-leading rates." },
  { date: "2024", title: "Apple Pay Integration", summary: `All ${bankName} debit cards now support Apple Pay for seamless contactless payments.` },
  { date: "2024", title: "Motor Finance Expansion", summary: "Expanded our motor finance division with new specialist vehicle finance options." },
  { date: "2024", title: "PSD2 Compliance", summary: "Full compliance with PSD2 regulations, enabling Open Banking capabilities." }];


  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={heroAbout} alt="About Us" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center pt-16">
          <ScrollAnimation direction="up">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
              {t("about.title")} {bankName}
            </h1>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={0.15}>
            <p className="text-xl max-w-3xl mx-auto text-white/80">A premium digital bank and principal member of VISA, MasterCard & LINK — authorised by the FCA

            </p>
          </ScrollAnimation>
        </div>
      </section>

      {/* Company Overview */}
      <ParallaxSection className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <ScrollAnimation direction="up">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">{t("about.ourStory")}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {bankName} is a premium digital bank specialising in savings, lending and payments. Authorised and regulated by the Financial Conduct Authority, we combine modern technology with specialist financial expertise to deliver products that meet the real needs of individuals and businesses across the UK.
                </p>
              </div>
            </ScrollAnimation>

            {/* Mission & Vision */}
            <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <Card className="hover-lift border border-border overflow-hidden">
                <div className="w-full h-40 overflow-hidden">
                  <img src={cardMission} alt="Our Mission" className="w-full h-full object-cover" />
                </div>
                <CardHeader className="pt-4">
                  <CardTitle className="text-foreground text-2xl">{t("about.ourMission")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    To provide innovative, accessible and secure financial products that empower our customers to save, borrow and pay with confidence in a digital world.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-lift border border-border overflow-hidden">
                <div className="w-full h-40 overflow-hidden">
                  <img src={cardVision} alt="Our Vision" className="w-full h-full object-cover" />
                </div>
                <CardHeader className="pt-4">
                  <CardTitle className="text-foreground text-2xl">{t("about.ourVision")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    To be the UK's leading niche digital bank — trusted by customers for specialist products, recognised by industry for innovation and compliance excellence.
                  </CardDescription>
                </CardContent>
              </Card>
            </StaggerChildren>

            {/* Core Values */}
            <ScrollAnimation direction="up">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-12">{t("about.coreValues")}</h2>
                <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.15}>
                  {[
                  { letter: "S", title: t("about.securityValue"), desc: "Your deposits are FSCS protected. We employ bank-grade encryption and multi-factor authentication." },
                  { letter: "T", title: t("about.trustValue"), desc: "FCA authorised and fully regulated. Transparent pricing with no hidden charges." },
                  { letter: "E", title: t("about.excellenceValue"), desc: "Continuously improving our digital platform and products to exceed customer expectations." }].
                  map((value, index) =>
                  <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-white">{value.letter}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{value.title}</h3>
                      <p className="text-muted-foreground">{value.desc}</p>
                    </div>
                  )}
                </StaggerChildren>
              </div>
            </ScrollAnimation>

            {/* Digital Milestones Timeline */}
            <div className="mb-16">
              <ScrollAnimation direction="up">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">Digital Milestones</h2>
              </ScrollAnimation>
              <div className="relative">
                <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-10">
                  {milestones.map((milestone, index) =>
                  <ScrollAnimation key={index} direction={index % 2 === 0 ? "left" : "right"} delay={index * 0.1}>
                      <div className={`relative flex items-start gap-6 md:gap-0 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                        <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background z-10" />
                        <div className={`ml-12 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                          <Card className="hover-lift inline-block text-left border border-border">
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold text-primary">{milestone.year}</span>
                              </div>
                              <CardTitle className="text-foreground text-lg">{milestone.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <CardDescription className="text-sm">{milestone.description}</CardDescription>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </ScrollAnimation>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <ScrollAnimation direction="up">
              <div className="bg-secondary rounded-lg p-8 mb-16">
                <h2 className="text-3xl font-bold text-foreground text-center mb-8">
                  {bankName} By the Numbers
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  {[
                  { value: "19+", label: "Years in Financial Services" },
                  { value: "FCA", label: "Authorised & Regulated" },
                  { value: "3", label: "Card Network Memberships" },
                  { value: "24/7", label: "Digital Access" }].
                  map((stat, index) =>
                  <ScrollAnimation key={index} direction="up" delay={index * 0.1}>
                      <div>
                        <div className="text-3xl font-bold text-primary mb-2">
                          <CountUpAnimation value={stat.value} />
                        </div>
                        <div className="text-muted-foreground">{stat.label}</div>
                      </div>
                    </ScrollAnimation>
                  )}
                </div>
              </div>
            </ScrollAnimation>

            {/* Recent News Highlights */}
            <div className="mb-16">
              <ScrollAnimation direction="up">
                <div className="flex items-center gap-3 mb-8">
                  <Newspaper className="h-6 w-6 text-primary" />
                  <h2 className="text-3xl font-bold text-foreground">Recent News</h2>
                </div>
              </ScrollAnimation>
              <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={0.12}>
                {newsItems.map((news, index) =>
                <Card key={index} className="hover-lift border border-border">
                    <CardHeader className="pb-2">
                      <span className="text-xs font-semibold text-primary">{news.date}</span>
                      <CardTitle className="text-foreground text-base">{news.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">{news.summary}</CardDescription>
                    </CardContent>
                  </Card>
                )}
              </StaggerChildren>
            </div>

            {/* Newsletter CTA */}
            <ScrollAnimation direction="scale">
              <Card className="bg-primary text-white border-none">
                <CardContent className="p-8 text-center">
                  <Mail className="h-10 w-10 mx-auto mb-4 text-white/80" />
                  <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
                  <p className="text-white/70 mb-6 max-w-md mx-auto">
                    Subscribe to receive the latest news, product updates and financial insights from {bankName}.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <Input placeholder="Enter your email" className="bg-white/10 border-white/30 text-white placeholder:text-white/50" />
                    <Button className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold">Subscribe</Button>
                  </div>
                </CardContent>
              </Card>
            </ScrollAnimation>
          </div>
        </div>
      </ParallaxSection>

      <Footer />
    </div>);

};

export default About;
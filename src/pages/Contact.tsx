import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation } from "@/components/ScrollAnimations";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useTranslation } from "@/i18n";
import { Phone, Mail, Clock, AlertTriangle, Shield } from "lucide-react";
import heroContact from "@/assets/hero-contact.jpg";
import ParallaxSection from "@/components/ParallaxSection";

const Contact = () => {
  const { settings } = useWebsiteSettings();
  const { t } = useTranslation();

  const faqs = [
    {
      question: "How do I open an account?",
      answer: "You can apply online through our digital platform. Click 'Open Account' in the navigation and complete the application form. You'll need a valid ID and proof of address. Most applications are reviewed within 1-3 business days.",
    },
    {
      question: "Are my deposits protected?",
      answer: `Yes. All eligible deposits with ${settings?.bankName || "our bank"} are protected by the Financial Services Compensation Scheme (FSCS) up to £85,000 per depositor. This applies to all our savings products including Fixed Rate Bonds and the Sapphire Account.`,
    },
    {
      question: "How do I contact you about a complaint?",
      answer: `You can submit a complaint through the contact form below, by email to ${settings?.contactEmail || "info@yourbank.com"}, or by phone. We aim to acknowledge all complaints within 3 business days and resolve within 8 weeks. If you're unsatisfied with our response, you can refer your complaint to the Financial Ombudsman Service (FOS).`,
    },
  ];

  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={heroContact} alt="Contact Us" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center pt-16">
          <ScrollAnimation direction="up">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">{t("contact.title")}</h1>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={0.15}>
            <p className="text-xl max-w-3xl mx-auto text-white/80">
              We're a digital-first bank — reach us online, by email or by phone
            </p>
          </ScrollAnimation>
        </div>
      </section>

      {/* FAQ Section */}
      <ParallaxSection variant="subtle" className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-16">
            <ScrollAnimation direction="up">
              <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
            </ScrollAnimation>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <ScrollAnimation key={index} direction="up" delay={index * 0.1}>
                  <AccordionItem value={`faq-${index}`}>
                    <AccordionTrigger className="text-left font-semibold text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </ScrollAnimation>
              ))}
            </Accordion>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <ScrollAnimation direction="left">
              <Card className="hover-lift border border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-2xl">{t("contact.sendMessage")}</CardTitle>
                  <CardDescription>{t("contact.sendMessageDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t("contact.firstName")}</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t("contact.lastName")}</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("contact.email")}</Label>
                    <Input id="email" type="email" placeholder="john.doe@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("contact.phone")}</Label>
                    <Input id="phone" type="tel" placeholder="+44 7xxx xxx xxx" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="queryType">Query Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select query type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="lending">Lending</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="complaints">Complaints</SelectItem>
                        <SelectItem value="general">General Enquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("contact.subject")}</Label>
                    <Input id="subject" placeholder="Subject" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("contact.message")}</Label>
                    <Textarea id="message" placeholder={t("contact.messagePlaceholder")} className="min-h-[120px]" />
                  </div>

                  <Button variant="default" className="w-full">
                    {t("contact.sendButton")}
                  </Button>
                </CardContent>
              </Card>
            </ScrollAnimation>

            <div className="space-y-8">
              <ScrollAnimation direction="right">
                <Card className="hover-lift border border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-2xl">{t("contact.getInTouch")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                      <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t("contact.customerService")}</h3>
                        <p className="text-muted-foreground text-sm">{settings?.bankPhone || "+44 (0) 203 xxx xxxx"}</p>
                        <p className="text-muted-foreground text-sm">Mon-Fri: 9AM-5PM GMT</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Email</h3>
                        <p className="text-muted-foreground text-sm">General: {settings?.contactEmail || "info@wyseforte.co.uk"}</p>
                        <p className="text-muted-foreground text-sm">Savings: savings@wyseforte.co.uk</p>
                        <p className="text-muted-foreground text-sm">Lending: lending@wyseforte.co.uk</p>
                        <p className="text-muted-foreground text-sm">Complaints: complaints@wyseforte.co.uk</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Digital Banking</h3>
                        <p className="text-muted-foreground text-sm">Online platform available 24/7</p>
                        <p className="text-muted-foreground text-sm">No physical branches — we're digital-first</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              <ScrollAnimation direction="right" delay={0.2}>
                <Card className="hover-lift border border-border">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      <CardTitle className="text-foreground text-xl">Complaints Procedure</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {[
                        { num: "1", text: <>We'll acknowledge your complaint within <strong>3 business days</strong>.</> },
                        { num: "2", text: <>We aim to resolve all complaints within <strong>8 weeks</strong>.</> },
                        { num: "3", text: <>If unsatisfied, you may escalate to the <strong>Financial Ombudsman Service (FOS)</strong> or use the EU Online Dispute Resolution (ODR) platform.</> },
                      ].map((step, index) => (
                        <ScrollAnimation key={index} direction="up" delay={index * 0.1}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-white">{step.num}</span>
                            </div>
                            <p>{step.text}</p>
                          </div>
                        </ScrollAnimation>
                      ))}
                    </div>
                    <div className="p-3 bg-secondary rounded-lg text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p>Financial Ombudsman Service: <strong>0800 023 4567</strong> | www.financial-ombudsman.org.uk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimation>
            </div>
          </div>
        </div>
      </ParallaxSection>

      <Footer />
    </div>
  );
};

export default Contact;

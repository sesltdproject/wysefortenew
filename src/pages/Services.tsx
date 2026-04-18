import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation, StaggerChildren } from "@/components/ScrollAnimations";
import { PiggyBank, Car, Smartphone, Wallet, CreditCard, Zap, Shield, CheckCircle } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import heroServices from "@/assets/hero-services.jpg";
import ParallaxSection from "@/components/ParallaxSection";
import cardFixedRate from "@/assets/card-fixed-rate.jpg";
import cardSapphire from "@/assets/card-sapphire.jpg";
import cardNoticeAccount from "@/assets/card-notice-account.jpg";
import cardMotorFinance from "@/assets/card-motor-finance.jpg";
import cardAssetFinance from "@/assets/card-asset-finance.jpg";
import cardWheelchairFinance from "@/assets/card-wheelchair-finance.jpg";
import cardApplePay from "@/assets/card-apple-pay.jpg";
import cardNfc from "@/assets/card-nfc.jpg";
import cardFasterPayments from "@/assets/card-faster-payments.jpg";
import cardMobileWallets from "@/assets/card-mobile-wallets.jpg";

const Services = () => {
  const { settings } = useWebsiteSettings();

  const savingsProducts = [
    { name: "Fixed Rate Bonds", rate: "Competitive fixed rates", term: "1-5 years", minDeposit: "£1,000", features: ["Guaranteed returns", "FSCS protected", "Choice of terms"] },
    { name: "Sapphire Account", rate: "Variable rate", term: "Instant access", minDeposit: "£1", features: ["Easy access savings", "Online management", "No notice period"] },
    { name: "60-Day Notice Account", rate: "Enhanced rate", term: "60-day notice", minDeposit: "£500", features: ["Higher interest", "Planned withdrawals", "Online access"] },
  ];

  const lendingProducts = [
    { icon: Car, title: "Motor Finance", description: "Competitive finance for new and used vehicles. Flexible repayment terms and quick decisions to get you on the road faster.", features: ["Hire Purchase", "Personal Contract Purchase", "Flexible terms up to 60 months"] },
    { icon: Shield, title: "Asset Finance", description: "Finance for business equipment, machinery, and commercial assets. Spread the cost of essential investments.", features: ["Equipment leasing", "Hire purchase agreements", "Sale and leaseback"] },
    { icon: CheckCircle, title: "Wheelchair Adapted Vehicle Finance", description: "Specialist finance for wheelchair adapted vehicles. Dedicated support and understanding of specialist vehicle requirements.", features: ["Specialist knowledge", "Competitive rates", "Tailored repayment plans"] },
  ];

  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={heroServices} alt="Our Services" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center pt-16">
          <ScrollAnimation direction="up">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Our Services</h1>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={0.15}>
            <p className="text-xl max-w-3xl mx-auto text-white/80">
              Savings, Lending & Payments — three pillars of modern banking, delivered digitally
            </p>
          </ScrollAnimation>
        </div>
      </section>

      {/* Tabbed Services */}
      <ParallaxSection className="py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="savings" className="w-full">
            <ScrollAnimation direction="scale">
              <div className="flex justify-center mb-10">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="savings" className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    <span className="hidden sm:inline">Savings</span>
                  </TabsTrigger>
                  <TabsTrigger value="lending" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span className="hidden sm:inline">Lending</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="hidden sm:inline">Payments</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </ScrollAnimation>

            {/* Savings Tab */}
            <TabsContent value="savings">
              <ScrollAnimation direction="up">
                <div className="text-center mb-10">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Savings Products</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Grow your money with our range of FSCS-protected savings accounts
                  </p>
                </div>
              </ScrollAnimation>

              <ScrollAnimation direction="left" delay={0.1}>
                <Card className="mb-10 overflow-hidden border border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Product Comparison</CardTitle>
                    <CardDescription>Compare our savings products to find the right fit</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Min. Deposit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {savingsProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-primary">{product.name}</TableCell>
                              <TableCell>{product.rate}</TableCell>
                              <TableCell>{product.term}</TableCell>
                              <TableCell>{product.minDeposit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {savingsProducts.map((product, index) => {
                  const images = [cardFixedRate, cardSapphire, cardNoticeAccount];
                  return (
                  <Card key={index} className="hover-lift border border-border overflow-hidden">
                    <div className="w-full h-40 overflow-hidden">
                      <img src={images[index]} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-foreground text-lg">{product.name}</CardTitle>
                      <CardDescription>{product.rate} · {product.term}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {product.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  );
                })}
              </StaggerChildren>

              <ScrollAnimation direction="fade" delay={0.2}>
                <Card className="bg-secondary mb-8 border border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Tariffs & Charges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> No account opening fees</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> No monthly maintenance charges</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Free online account management</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Early withdrawal terms may apply</li>
                    </ul>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              <ScrollAnimation direction="scale" delay={0.1}>
                <div className="text-center">
                  <Button variant="default" size="lg" asChild>
                    <Link to="/account-application">Apply Online</Link>
                  </Button>
                </div>
              </ScrollAnimation>
            </TabsContent>

            {/* Lending Tab */}
            <TabsContent value="lending">
              <ScrollAnimation direction="up">
                <div className="text-center mb-10">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Lending Solutions</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Specialist finance products designed for vehicles and business assets
                  </p>
                </div>
              </ScrollAnimation>

              <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                {lendingProducts.map((product, index) => {
                  const images = [cardMotorFinance, cardAssetFinance, cardWheelchairFinance];
                  return (
                  <Card key={index} className="hover-lift border border-border overflow-hidden">
                    <div className="w-full h-40 overflow-hidden">
                      <img src={images[index]} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-foreground text-lg">{product.title}</CardTitle>
                      <CardDescription className="text-base">{product.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {product.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  );
                })}
              </StaggerChildren>

              <ScrollAnimation direction="scale">
                <div className="text-center">
                  <Button variant="default" size="lg" asChild>
                    <Link to="/contact">Enquire About Lending</Link>
                  </Button>
                </div>
              </ScrollAnimation>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <ScrollAnimation direction="up">
                <div className="text-center mb-10">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Payment Innovation</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Modern payment technology built into every account
                  </p>
                </div>
              </ScrollAnimation>

              <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { image: cardApplePay, title: "Apple Pay", desc: "Pay with your iPhone, Apple Watch or iPad" },
                  { image: cardNfc, title: "NFC Contactless", desc: "Tap to pay with contactless technology" },
                  { image: cardFasterPayments, title: "Faster Payments", desc: "Near-instant UK bank transfers 24/7" },
                  { image: cardMobileWallets, title: "Mobile Wallets", desc: "Google Pay, Samsung Pay and more" },
                ].map((item, index) => (
                  <Card key={index} className="hover-lift text-center border border-border overflow-hidden">
                    <div className="w-full h-32 overflow-hidden">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-foreground text-base">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{item.desc}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </StaggerChildren>

              <ScrollAnimation direction="up">
                <Card className="mb-10 border border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Account Features</CardTitle>
                    <CardDescription>Every account comes with these digital capabilities built in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        "Real-time budgeting tools",
                        "Virtual card numbers (PANs)",
                        "Instant spending notifications",
                        "Spending category insights",
                        "Freeze & unfreeze card",
                        "Multi-currency support",
                      ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimation>

              <StaggerChildren className="flex flex-wrap items-center justify-center gap-8 py-8 px-4 bg-secondary rounded-lg" staggerDelay={0.1}>
                {["VISA", "MasterCard", "LINK", "Faster Payments", "Apple Pay"].map((partner, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{partner}</span>
                  </div>
                ))}
              </StaggerChildren>
            </TabsContent>
          </Tabs>
        </div>
      </ParallaxSection>

      {/* CTA */}
      <section className="py-12 lg:py-16 bg-primary">
        <ScrollAnimation direction="up">
          <div className="container mx-auto px-4 text-center text-white">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Bank Differently?</h2>
            <p className="text-lg mb-6 text-white/80 max-w-xl mx-auto">
              Open an account online in minutes or get in touch with our team
            </p>
            <ScrollAnimation direction="scale" delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="gold" size="lg" asChild>
                  <Link to="/account-application">Apply Online</Link>
                </Button>
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold">
                  <Link to="/contact">Contact Us</Link>
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

export default Services;

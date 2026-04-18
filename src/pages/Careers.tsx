import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollAnimation, StaggerChildren } from "@/components/ScrollAnimations";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Users, Lightbulb, Heart, Briefcase, MapPin, Mail } from "lucide-react";
import heroCareers from "@/assets/hero-careers.jpg";
import ParallaxSection from "@/components/ParallaxSection";
import cardInnovation from "@/assets/card-innovation.jpg";
import cardCollaboration from "@/assets/card-collaboration.jpg";
import cardPurpose from "@/assets/card-purpose.jpg";

const Careers = () => {
  const { settings } = useWebsiteSettings();
  const bankName = settings?.bankName || "Wyseforte Bank";

  const jobs = [
    {
      title: "Business Development Manager",
      department: "Commercial",
      location: "London / Remote",
      type: "Full-time",
      description: "Drive new business acquisition across savings and lending products. Build and maintain relationships with intermediaries and direct clients.",
    },
    {
      title: "Risk Manager",
      department: "Risk & Compliance",
      location: "London",
      type: "Full-time",
      description: "Oversee the bank's risk management framework including credit risk, operational risk, and regulatory compliance. Report directly to the Board Risk Committee.",
    },
  ];

  const cultureValues = [
    { icon: Lightbulb, title: "Innovation", description: "We embrace new ideas and technology. Every team member has the opportunity to shape the future of digital banking." },
    { icon: Users, title: "Collaboration", description: "We work as one team across departments. Our flat structure means your ideas are heard at every level." },
    { icon: Heart, title: "Purpose", description: `We exist to serve our customers. Every role at ${bankName} connects directly to the financial wellbeing of real people.` },
  ];

  return (
    <div className="min-h-screen bg-public-page">
      <Header transparent />

      {/* Hero Section */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={heroCareers} alt="Careers" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 container mx-auto px-4 text-center pt-16">
          <ScrollAnimation direction="up">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Careers at {bankName}</h1>
          </ScrollAnimation>
          <ScrollAnimation direction="up" delay={0.15}>
            <p className="text-xl max-w-3xl mx-auto text-white/80">
              Join a growing digital bank and help shape the future of financial services
            </p>
          </ScrollAnimation>
        </div>
      </section>

      {/* Company Culture */}
      <ParallaxSection className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <ScrollAnimation direction="up">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Why Work With Us</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                At {bankName}, you'll work at the intersection of finance and technology in a fast-moving, FCA-regulated environment
              </p>
            </div>
          </ScrollAnimation>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {cultureValues.map((value, index) => {
              const images = [cardInnovation, cardCollaboration, cardPurpose];
              return (
              <Card key={index} className="hover-lift text-center border border-border overflow-hidden">
                <div className="w-full h-40 overflow-hidden">
                  <img src={images[index]} alt={value.title} className="w-full h-full object-cover" />
                </div>
                <CardHeader>
                  <CardTitle className="text-foreground text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{value.description}</CardDescription>
                </CardContent>
              </Card>
              );
            })}
          </StaggerChildren>

          {/* Current Openings */}
          <ScrollAnimation direction="up">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">Current Openings</h2>
              </div>

              <Card className="overflow-hidden mb-10 border border-border">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Role</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-primary">{job.title}</TableCell>
                            <TableCell>{job.department}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {job.location}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{job.type}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Job Details */}
              <div className="space-y-6 mb-12">
                {jobs.map((job, index) => (
                  <ScrollAnimation key={index} direction="up" delay={index * 0.1}>
                    <Card className="hover-lift border border-border">
                      <CardHeader>
                        <CardTitle className="text-foreground text-lg">{job.title}</CardTitle>
                        <CardDescription className="flex items-center gap-3 flex-wrap">
                          <span>{job.department}</span>
                          <span className="text-primary">·</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                          <span className="text-primary">·</span>
                          <Badge variant="outline" className="text-xs">{job.type}</Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm mb-4">{job.description}</p>
                        <Button variant="default" size="sm" asChild>
                          <a href={`mailto:${settings?.contactEmail || "info@yourbank.com"}?subject=Application: ${job.title}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Apply Now
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </ScrollAnimation>
                ))}
              </div>
            </div>
          </ScrollAnimation>

          {/* Application CTA */}
          <ScrollAnimation direction="scale">
            <Card className="bg-primary text-white max-w-3xl mx-auto border-none">
              <CardContent className="p-8 text-center">
                <Mail className="h-10 w-10 mx-auto mb-4 text-white/80" />
                <h3 className="text-2xl font-bold mb-2">Don't See Your Role?</h3>
                <p className="text-white/70 mb-6 max-w-md mx-auto">
                  We're always looking for talented individuals. Send your CV and a covering letter to our recruitment team.
                </p>
                <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold">
                  <a href={`mailto:${settings?.contactEmail || "info@yourbank.com"}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {settings?.contactEmail || "info@yourbank.com"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </ScrollAnimation>
        </div>
      </ParallaxSection>

      <Footer />
    </div>
  );
};

export default Careers;

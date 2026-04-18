import { cn } from "@/lib/utils";

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "dense" | "subtle";
}

const patterns = {
  default: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23dc2626' stroke-width='0.5' opacity='0.06'/%3E%3C/svg%3E")`,
  dense: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='%23dc2626' stroke-width='0.4' opacity='0.05'/%3E%3Cpath d='M20 10L30 20L20 30L10 20Z' fill='none' stroke='%23dc2626' stroke-width='0.3' opacity='0.03'/%3E%3C/svg%3E")`,
  subtle: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23dc2626' opacity='0.04'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23dc2626' opacity='0.04'/%3E%3Ccircle cx='80' cy='0' r='1.5' fill='%23dc2626' opacity='0.04'/%3E%3Ccircle cx='0' cy='80' r='1.5' fill='%23dc2626' opacity='0.04'/%3E%3Ccircle cx='80' cy='80' r='1.5' fill='%23dc2626' opacity='0.04'/%3E%3C/svg%3E")`,
};

const ParallaxSection = ({ children, className, variant = "default" }: ParallaxSectionProps) => {
  return (
    <section
      className={cn("relative", className)}
      style={{
        backgroundImage: patterns[variant],
        backgroundAttachment: "fixed",
        backgroundRepeat: "repeat",
        backgroundSize: variant === "subtle" ? "80px 80px" : variant === "dense" ? "40px 40px" : "60px 60px",
      }}
    >
      {children}
    </section>
  );
};

export default ParallaxSection;

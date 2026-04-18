import { motion, Variants, useMotionValue, useTransform, animate } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect } from "react";

interface ScrollAnimationProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "fade" | "scale";
  delay?: number;
  className?: string;
}

export const ScrollAnimation = ({ 
  children, 
  direction = "up", 
  delay = 0,
  className = ""
}: ScrollAnimationProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
      scale: direction === "scale" ? 0.85 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerChildren = ({ 
  children, 
  className = "",
  staggerDelay = 0.1 
}: { 
  children: React.ReactNode; 
  className?: string;
  staggerDelay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <motion.div key={index} variants={childVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={childVariants}>{children}</motion.div>
      }
    </motion.div>
  );
};

interface CountUpAnimationProps {
  value: string;
  duration?: number;
  className?: string;
}

export const CountUpAnimation = ({ value, duration = 2, className = "" }: CountUpAnimationProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  
  // Extract numeric part and suffix
  const numericMatch = value.match(/^(\d+)/);
  const numericPart = numericMatch ? parseInt(numericMatch[1]) : 0;
  const suffix = numericMatch ? value.slice(numericMatch[1].length) : value;
  const isNumeric = numericMatch !== null;

  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView && isNumeric) {
      animate(motionValue, numericPart, { duration, ease: "easeOut" });
    }
  }, [isInView, isNumeric, numericPart, duration, motionValue]);

  if (!isNumeric) {
    return (
      <ScrollAnimation direction="scale">
        <span ref={ref} className={className}>{value}</span>
      </ScrollAnimation>
    );
  }

  return (
    <span ref={ref} className={className}>
      <motion.span>{rounded}</motion.span>{suffix}
    </span>
  );
};

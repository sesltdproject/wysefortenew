import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import heroSlide1 from "@/assets/hero-slide-1.jpg";
import heroSlide2 from "@/assets/hero-slide-2.jpg";
import heroSlide3 from "@/assets/hero-slide-3.jpg";
import heroSlide4 from "@/assets/hero-slide-4.jpg";
import heroSlide5 from "@/assets/hero-slide-5.jpg";

const slides = [
  { image: heroSlide1, label: "Online Banking", link: "/auth" },
  { image: heroSlide2, label: "Savings", link: "/services" },
  { image: heroSlide3, label: "Lending", link: "/services" },
  { image: heroSlide4, label: "Payment Services", link: "/services" },
  { image: heroSlide5, label: "ATMs", link: "/services" },
];

const HeroSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setActiveIndex((prev) => (prev + 1) % slides.length);
      }
    }, 5000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoPlay]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    startAutoPlay();
  };

  const goPrev = () => goTo((activeIndex - 1 + slides.length) % slides.length);
  const goNext = () => goTo((activeIndex + 1) % slides.length);

  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section
      className="relative w-full h-screen min-h-[500px] overflow-hidden"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      {/* Background images */}
      {slides.map((slide, i) => (
        <img
          key={i}
          src={slide.image}
          alt={slide.label}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Left chevron */}
      <button
        onClick={goPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 p-2 hover:opacity-80 transition-opacity"
        aria-label="Previous slide"
      >
        <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className="drop-shadow-lg">
          <line x1="30" y1="5" x2="10" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="30" x2="30" y2="55" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Right chevron */}
      <button
        onClick={goNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 p-2 hover:opacity-80 transition-opacity"
        aria-label="Next slide"
      >
        <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className="drop-shadow-lg">
          <line x1="10" y1="5" x2="30" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="30" y1="30" x2="10" y2="55" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Center content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">
        {/* Circular thumbnails */}
        <div className="flex items-center gap-4 md:gap-24 lg:gap-32">
          {slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-[3px] transition-all duration-300 ${
                  i === activeIndex
                    ? "border-primary scale-110 shadow-lg"
                    : "border-white/50 hover:border-white"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`text-sm md:text-base lg:text-lg font-medium transition-colors duration-300 drop-shadow-md ${
                  i === activeIndex ? "text-white" : "text-white/70 group-hover:text-white"
                }`}
              >
                {slide.label}
              </span>
            </button>
          ))}
        </div>

        {/* CTA Circle - only visible when Online Banking (index 0) is active */}
        {activeIndex === 0 && (
          <Link
            to="/auth"
            className="mt-4 w-36 h-36 md:w-44 md:h-44 rounded-full bg-foreground/80 border-[3px] border-primary flex items-center justify-center text-white text-center text-sm md:text-base font-semibold tracking-wider uppercase leading-tight hover:bg-foreground/90 transition-colors duration-300 shadow-xl"
          >
            Access<br />Online Banking
          </Link>
        )}
      </div>

      {/* Scroll down indicator */}
      <button
        onClick={scrollDown}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-white/70 hover:text-white transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};

export default HeroSlider;

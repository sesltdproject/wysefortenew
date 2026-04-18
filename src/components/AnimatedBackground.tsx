import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  type: 'circle' | 'square' | 'diamond';
}

const AnimatedBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate initial particles
    const initialParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      opacity: Math.random() * 0.1 + 0.05,
      speed: Math.random() * 0.5 + 0.2,
      type: ['circle', 'square', 'diamond'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'diamond'
    }));
    
    setParticles(initialParticles);

    // Animate particles
    const animateParticles = () => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y <= -10 ? 110 : particle.y - particle.speed * 0.05,
        x: particle.x + Math.sin(Date.now() * 0.001 + particle.id) * 0.02
      })));
    };

    const interval = setInterval(animateParticles, 50);
    return () => clearInterval(interval);
  }, []);

  const getShapeClasses = (type: string) => {
    switch (type) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-lg';
      case 'diamond':
        return 'rounded-lg transform rotate-45';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-gold/3" />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute transition-all duration-1000 ease-linear ${getShapeClasses(particle.type)}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            background: particle.id % 3 === 0 
              ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)'
              : particle.id % 3 === 1
              ? 'linear-gradient(135deg, hsl(var(--gold)) 0%, hsl(var(--gold)) 100%)'
              : 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted)) 100%)',
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      
      {/* Floating geometric shapes */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-primary/20 rounded-full animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }} />
      <div className="absolute top-40 right-20 w-1 h-1 bg-gold/30 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '2s' }} />
      <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-primary/15 rounded-full animate-bounce" style={{ animationDuration: '5s' }} />
      <div className="absolute bottom-20 right-10 w-2.5 h-2.5 bg-gold/20 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }} />
    </div>
  );
};

export default AnimatedBackground;
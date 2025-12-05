
import React, { useRef, useState } from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  variant?: 'default' | 'dark' | 'darker' | 'light' | 'cyan';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  borderGradient?: string; // "blue" | "red" | "gold" etc
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(({ 
  children, 
  interactive = false, 
  variant = 'default',
  intensity = 'medium',
  className = '',
  borderGradient,
  ...props 
}, ref) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  // Base layout and transition styles
  const baseStyles = "relative transition-all duration-300 overflow-hidden backdrop-filter group";
  
  const blurIntensity = {
      low: 'backdrop-blur-sm',
      medium: 'backdrop-blur-md',
      high: 'backdrop-blur-xl',
  };

  const variants = {
    default: "bg-gray-900/40 border border-white/10 border-t-white/20 rounded-2xl shadow-lg", 
    dark: "bg-gray-950/60 border border-white/5 border-t-white/10 rounded-xl shadow-xl", 
    darker: "bg-black/80 border border-white/10 border-t-white/20 rounded-2xl shadow-2xl", 
    light: "bg-gray-800/40 border border-white/20 border-t-white/30 rounded-lg",
    cyan: "bg-cyan-950/40 border border-cyan-500/30 border-t-cyan-400/40 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)]",
  };

  const interactiveStyles = interactive 
    ? "hover:bg-gray-900/60 hover:border-white/20 hover:scale-[1.01] cursor-default select-none hover:shadow-2xl active:scale-[0.99]" 
    : "";

  const borderGlowStyles = borderGradient 
    ? "before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-b before:from-transparent before:to-transparent before:content-[''] after:absolute after:inset-[1px] after:bg-gray-900/90 after:rounded-[inherit] after:-z-10"
    : "";
    
  let customBorder = {};
  if (borderGradient === 'gold') customBorder = { borderColor: 'rgba(255, 215, 0, 0.5)', boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)' };
  if (borderGradient === 'red') customBorder = { borderColor: 'rgba(239, 68, 68, 0.6)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' };
  if (borderGradient === 'blue') customBorder = { borderColor: 'rgba(6, 182, 212, 0.5)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)' };

  const reactiveStyle = {
      ...customBorder,
      borderColor: `rgba(255, 255, 255, calc(0.1 + var(--audio-energy, 0) * 0.2))`,
      boxShadow: `0 0 calc(10px + var(--audio-energy, 0) * 10px) rgba(6, 182, 212, calc(var(--audio-energy, 0) * 0.15))`
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setOpacity(1);
  };

  const handleMouseLeave = () => {
      setOpacity(0);
  };

  return (
    <div 
      ref={element => {
          // Handle both local ref and forwarded ref
          // @ts-ignore
          panelRef.current = element;
          if (typeof ref === 'function') ref(element);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
      }}
      className={`${baseStyles} ${blurIntensity[intensity]} ${variants[variant]} ${interactiveStyles} ${borderGlowStyles} ${className}`}
      style={reactiveStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Spotlight Effect Layer */}
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 rounded-[inherit] z-0"
        style={{
            opacity,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`
        }}
        aria-hidden="true"
      />
      {/* Border Spotlight */}
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 rounded-[inherit] z-0"
        style={{
            opacity,
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.15), transparent 40%)`,
            maskImage: 'linear-gradient(black, black), content-box',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px' // Border width
        }}
        aria-hidden="true"
      />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
});

export default GlassPanel;

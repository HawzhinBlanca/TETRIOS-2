
import React from 'react';

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
  // Base layout and transition styles
  const baseStyles = "relative transition-all duration-300 overflow-hidden backdrop-filter";
  
  const blurIntensity = {
      low: 'backdrop-blur-sm',
      medium: 'backdrop-blur-md',
      high: 'backdrop-blur-xl',
  };

  // Visual variants - Added border-t for bevel effect
  const variants = {
    default: "bg-gray-900/40 border border-white/10 border-t-white/20 rounded-2xl shadow-lg", 
    dark: "bg-gray-950/60 border border-white/5 border-t-white/10 rounded-xl shadow-xl", 
    darker: "bg-black/80 border border-white/10 border-t-white/20 rounded-2xl shadow-2xl", 
    light: "bg-gray-800/40 border border-white/20 border-t-white/30 rounded-lg",
    cyan: "bg-cyan-950/40 border border-cyan-500/30 border-t-cyan-400/40 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)]",
  };

  // Interactive hover effects
  const interactiveStyles = interactive 
    ? "hover:bg-gray-900/60 hover:border-white/20 hover:scale-[1.02] cursor-default group select-none hover:shadow-2xl active:scale-[0.99]" 
    : "";

  // Living Border Logic
  const borderGlowStyles = borderGradient 
    ? "before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-b before:from-transparent before:to-transparent before:content-[''] after:absolute after:inset-[1px] after:bg-gray-900/90 after:rounded-[inherit] after:-z-10"
    : "";
    
  let customBorder = {};
  if (borderGradient === 'gold') customBorder = { borderColor: 'rgba(255, 215, 0, 0.5)', boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)' };
  if (borderGradient === 'red') customBorder = { borderColor: 'rgba(239, 68, 68, 0.6)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' };
  if (borderGradient === 'blue') customBorder = { borderColor: 'rgba(6, 182, 212, 0.5)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)' };

  return (
    <div 
      ref={ref}
      className={`${baseStyles} ${blurIntensity[intensity]} ${variants[variant]} ${interactiveStyles} ${borderGlowStyles} ${className}`}
      style={customBorder}
      {...props}
    >
      {children}
    </div>
  );
});

export default GlassPanel;

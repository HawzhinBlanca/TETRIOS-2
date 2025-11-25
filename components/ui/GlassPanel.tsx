
import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  variant?: 'default' | 'dark' | 'darker' | 'light' | 'cyan';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(({ 
  children, 
  interactive = false, 
  variant = 'default',
  intensity = 'medium',
  className = '',
  ...props 
}, ref) => {
  // Base layout and transition styles
  const baseStyles = "relative border transition-all duration-300 overflow-hidden";
  
  const blurIntensity = {
      low: 'backdrop-blur-sm',
      medium: 'backdrop-blur-md',
      high: 'backdrop-blur-xl',
  };

  // Visual variants - Adjusted for clearer text but maintaining glass effect
  const variants = {
    default: "bg-gray-900/40 border-white/10 rounded-2xl", // Reduced opacity from 0.5
    dark: "bg-gray-950/60 border-white/5 rounded-xl", 
    darker: "bg-black/70 border-white/10 rounded-2xl shadow-2xl", // Slightly reduced from 0.8
    light: "bg-gray-800/40 border-white/20 rounded-lg",
    cyan: "bg-cyan-950/40 border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)]",
  };

  // Interactive hover effects
  const interactiveStyles = interactive 
    ? "hover:bg-gray-900/60 hover:border-white/20 hover:scale-[1.02] cursor-default group select-none shadow-lg hover:shadow-xl" 
    : "shadow-md";

  return (
    <div 
      ref={ref}
      className={`${baseStyles} ${blurIntensity[intensity]} ${variants[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default GlassPanel;

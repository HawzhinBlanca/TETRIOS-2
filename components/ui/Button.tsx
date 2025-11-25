
import React from 'react';
import { audioManager } from '../../utils/audioManager';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ElementType;
  isLoading?: boolean;
  soundEnabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  isLoading, 
  className = '', 
  onClick, 
  onMouseEnter,
  soundEnabled = true,
  disabled,
  ...props 
}, ref) => {

  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#030712] disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    // Stronger neon glow for primary button
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] active:scale-[0.98]",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 hover:border-gray-600",
    outline: "bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800/50",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]",
    icon: "p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-transparent hover:border-white/10 rounded-lg",
    glass: "bg-black/40 hover:bg-cyan-900/30 text-gray-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/50 backdrop-blur-md shadow-lg",
  };

  const sizes = {
    sm: "text-[10px] px-3 py-1.5 gap-1.5",
    md: "text-xs px-4 py-2.5 gap-2",
    lg: "text-sm px-6 py-3 gap-2.5",
    xl: "text-base px-8 py-4 gap-3",
  };

  // Override size for icon variant
  const sizeStyles = variant === 'icon' ? '' : sizes[size];

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundEnabled) {
      audioManager.playUiHover();
    }
    onMouseEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundEnabled) {
        if (variant === 'ghost' || variant === 'icon') {
             // Softer sound for lighter interactions
        } else if (variant === 'primary' || variant === 'danger') {
             audioManager.playUiSelect();
        } else {
             audioManager.playUiClick();
        }
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizeStyles} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={variant === 'icon' ? 16 : 18} />
      ) : (
        <>
          {Icon && <Icon size={variant === 'icon' ? 20 : 18} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;

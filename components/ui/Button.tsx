
import React from 'react';
import { audioManager } from '../../utils/audioManager';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon' | 'glass' | 'neon';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  icon?: React.ElementType;
  isLoading?: boolean;
  soundEnabled?: boolean;
  pressed?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  isLoading = false, 
  className = '', 
  onClick, 
  onMouseEnter,
  soundEnabled = true,
  disabled,
  pressed,
  type = 'button',
  ...props 
}, ref) => {

  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold uppercase tracking-widest transition-all duration-200 relative overflow-hidden select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712] hover:scale-[1.02] hover:brightness-110";
  
  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] active:scale-[0.98] focus-visible:ring-cyan-500 border border-transparent",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 hover:border-gray-600 active:bg-gray-600 focus-visible:ring-gray-500",
    outline: "bg-transparent border-2 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800/50 active:bg-gray-800 focus-visible:ring-gray-400",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white active:bg-white/10 focus-visible:ring-gray-400 border border-transparent",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] active:scale-[0.98] focus-visible:ring-red-500 border border-transparent",
    icon: "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-transparent hover:border-white/10 active:scale-95 focus-visible:ring-white",
    glass: "bg-black/40 hover:bg-cyan-900/30 text-gray-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/50 backdrop-blur-md shadow-lg active:scale-[0.98] focus-visible:ring-cyan-500",
    neon: "bg-transparent border border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3),inset_0_0_10px_rgba(6,182,212,0.1)] hover:bg-cyan-500 hover:text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-[0.98] focus-visible:ring-cyan-400"
  };

  const sizes = {
    sm: "text-[10px] px-3 py-1.5 gap-1.5 h-8 min-w-[2rem]",
    md: "text-xs px-4 py-2.5 gap-2 h-10 min-w-[2.5rem]",
    lg: "text-sm px-6 py-3 gap-2.5 h-12 min-w-[3rem]",
    xl: "text-base px-8 py-4 gap-3 h-14 min-w-[3.5rem]",
    icon: "p-2 h-10 w-10", 
  };

  // Manual pressed state styling (useful for toggle buttons)
  // Overrides standard variant styles to show 'active' state persistently
  const pressedStyles = pressed 
    ? "ring-2 ring-offset-2 ring-offset-[#030712] bg-opacity-80 scale-[0.98] brightness-110 border-transparent" 
    : "";

  const sizeStyles = variant === 'icon' ? sizes.icon : (sizes[size as keyof typeof sizes] || sizes.md);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && soundEnabled) {
      audioManager.playUiHover();
    }
    onMouseEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
        if (soundEnabled) {
            if (variant === 'ghost' || variant === 'icon') {
                 // Softer sound for lighter interactions
            } else if (variant === 'primary' || variant === 'danger' || variant === 'neon') {
                 audioManager.playUiSelect();
            } else {
                 audioManager.playUiClick();
            }
        }
        onClick?.(e);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizeStyles} ${pressedStyles} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      data-loading={isLoading ? 'true' : undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="opacity-0 flex items-center gap-2" aria-hidden="true">
             {Icon && <Icon size={variant === 'icon' ? 20 : 18} />}
             {children}
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin" size={variant === 'icon' ? 16 : 18} />
          </div>
        </>
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

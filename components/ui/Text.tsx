
import React from 'react';

interface TextProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export const Label: React.FC<TextProps> = ({ children, className = '', ...props }) => (
    <div className={`text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 select-none ${className}`} {...props}>
        {children}
    </div>
);

interface ValueProps extends TextProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
    variant?: 'default' | 'gradient';
    glow?: boolean;
}

export const Value: React.FC<ValueProps> = ({ children, className = '', size = 'md', variant = 'default', glow = false, ...props }) => {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
        '5xl': 'text-5xl',
    };
    
    const variantClasses = variant === 'gradient' 
        ? 'bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'
        : 'text-white';

    const glowClass = glow ? '[text-shadow:0_0_5px_currentColor,0_0_15px_currentColor]' : '';

    return (
        <div className={`font-mono font-bold tabular-nums leading-none tracking-tight ${sizeClasses[size]} ${variantClasses} ${glowClass} ${className}`} {...props}>
            {children}
        </div>
    );
};

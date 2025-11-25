
import React from 'react';
import { Label } from './Text';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'cyan' | 'yellow' | 'red' | 'green' | 'purple';
    className?: string;
    icon?: React.ElementType;
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', className = '', icon: Icon }) => {
    const variants = {
        default: 'bg-gray-800/50 border-gray-700 text-gray-300',
        cyan: 'bg-cyan-950/50 border-cyan-900/50 text-cyan-400',
        yellow: 'bg-yellow-900/40 border-yellow-700/50 text-yellow-400',
        red: 'bg-red-900/40 border-red-700/50 text-red-400',
        green: 'bg-green-900/40 border-green-700/50 text-green-400',
        purple: 'bg-purple-900/40 border-purple-700/50 text-purple-400',
    };

    return (
        <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded border ${variants[variant]} ${className}`}>
            {Icon && <Icon size={12} className="opacity-80" />}
            <Label className={`tracking-[0.15em] ${variants[variant].split(' ').pop()}`}>{label}</Label>
        </div>
    );
};

export default Badge;

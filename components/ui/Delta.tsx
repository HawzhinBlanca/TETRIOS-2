
import React from 'react';

interface DeltaProps {
    value: string | null;
    className?: string;
}

export const Delta: React.FC<DeltaProps> = ({ value, className = '' }) => {
    if (!value) return null;
    return (
        <span className={`text-xs font-bold text-emerald-400 font-mono animate-in fade-in slide-in-from-bottom-1 duration-500 ${className}`} aria-hidden="true">
            {value}
        </span>
    );
};

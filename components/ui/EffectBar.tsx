
import React from 'react';
import ProgressBar from './ProgressBar';

interface EffectBarProps {
    label: string;
    progress: number; // 0 to 1
    colorClass: string; // e.g. 'text-yellow-400'
    barColorClass: string; // e.g. 'bg-yellow-500'
    className?: string;
}

const EffectBar: React.FC<EffectBarProps> = ({ label, progress, colorClass, barColorClass, className = '' }) => {
    return (
        <div className={`bg-black/20 rounded p-2 border border-white/5 ${className}`}>
            <div className={`text-[9px] font-black uppercase tracking-widest flex justify-between mb-1 ${colorClass}`}>
                <span>{label}</span>
                <span>{Math.ceil(progress * 100)}%</span>
            </div>
            <ProgressBar progress={progress} fillClassName={barColorClass} height="h-1" />
        </div>
    );
};

export default EffectBar;

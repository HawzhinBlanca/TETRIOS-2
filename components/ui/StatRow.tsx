
import React from 'react';
import { Label, Value } from './Text';

interface StatRowProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ElementType;
    className?: string;
}

export const StatRow: React.FC<StatRowProps> = ({ label, value, subValue, icon: Icon, className = '' }) => (
    <div className={`flex items-center justify-between py-2 border-b border-white/5 last:border-0 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
            {Icon && <Icon size={14} className="text-cyan-500/70" />}
            <Label>{label}</Label>
        </div>
        <div className="text-right">
            <Value size="md">{value}</Value>
            {subValue && <div className="text-[9px] text-gray-500 font-mono">{subValue}</div>}
        </div>
    </div>
);

export default StatRow;

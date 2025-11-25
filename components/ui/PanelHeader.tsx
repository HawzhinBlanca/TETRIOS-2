
import React from 'react';
import { Label } from './Text';

interface PanelHeaderProps {
    title: string;
    icon?: React.ElementType;
    children?: React.ReactNode; // For right-side actions/indicators
    className?: string;
    textColor?: string;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({ 
    title, 
    icon: Icon, 
    children, 
    className = '',
    textColor = 'text-gray-400'
}) => {
    return (
        <div className={`flex justify-between items-center ${className}`}>
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className={textColor} />}
                <Label className={textColor}>{title}</Label>
            </div>
            {children}
        </div>
    );
};

export default PanelHeader;

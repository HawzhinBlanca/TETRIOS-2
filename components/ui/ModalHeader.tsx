
import React from 'react';
import { getIcon } from '../../utils/icons';

interface ModalHeaderProps {
    title: string;
    subtitle?: React.ReactNode;
    icon?: string;
    iconColor?: string; // e.g. "text-yellow-400"
    iconBgColor?: string; // e.g. "bg-yellow-900/30"
    iconBorderColor?: string; // e.g. "border-yellow-500"
    children?: React.ReactNode; // For extra controls like TabSwitchers
    className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
    title,
    subtitle,
    icon,
    iconColor = "text-white",
    iconBgColor = "bg-gray-800",
    iconBorderColor = "border-gray-600",
    children,
    className = ""
}) => {
    return (
        <div className={`flex-shrink-0 flex flex-col items-center border-b border-gray-800 pb-6 mb-6 ${className}`}>
            {icon && (
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 border-2 shadow-[0_0_20px_rgba(0,0,0,0.3)] animate-in zoom-in duration-300 ${iconBgColor} ${iconBorderColor}`}>
                    {React.createElement(getIcon(icon), { size: 32, className: iconColor })}
                </div>
            )}
            
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest mb-2 text-center">
                {title}
            </h2>
            
            {subtitle && (
                <div className="text-sm text-gray-400 text-center mb-4 max-w-md">
                    {subtitle}
                </div>
            )}

            {children && (
                <div className="w-full flex justify-center mt-2">
                    {children}
                </div>
            )}
        </div>
    );
};

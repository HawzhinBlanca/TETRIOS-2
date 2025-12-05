
import React from 'react';
import Modal from './Modal';
import { getIcon } from '../../utils/icons';

interface SelectionModalLayoutProps {
    icon: string;
    title: string;
    description: string;
    borderColorClass: string; // e.g. "border-red-500"
    iconColorClass?: string; // e.g. "text-red-500"
    onClose?: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    variant?: 'default' | 'skewed';
    ariaLabel: string;
}

export const SelectionModalLayout: React.FC<SelectionModalLayoutProps> = ({
    icon,
    title,
    description,
    borderColorClass,
    iconColorClass,
    onClose,
    children,
    footer,
    variant = 'skewed',
    ariaLabel
}) => {
    const Icon = getIcon(icon);
    // Default icon color derived from border class if not provided (hacky but effective for this specific design system)
    const derivedIconColor = iconColorClass || borderColorClass.replace('border', 'text');

    return (
        <Modal variant={variant} borderColorClass={borderColorClass} onClose={onClose} ariaLabel={ariaLabel}>
            <div className={`absolute top-4 right-4 ${derivedIconColor}/20 group-hover:${derivedIconColor}/50 transition-colors animate-pulse pointer-events-none`} aria-hidden="true">
                <Icon size={80} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter italic" role="heading" aria-level={2}>
                {title}
            </h2>
            <p className="text-gray-300 text-sm mb-8">{description}</p>

            {children}

            {footer && (
                <div className="flex justify-center gap-4 mt-8">
                    {footer}
                </div>
            )}
        </Modal>
    );
};

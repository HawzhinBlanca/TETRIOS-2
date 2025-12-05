
import React from 'react';
import Button from './Button';

interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType; // Optional icon component
}

interface TabSwitcherProps {
    tabs: Tab[] | string[]; // Can be array of objects or simple strings
    activeTab: string;
    onSelect: (id: string) => void;
    className?: string;
    variant?: 'primary' | 'secondary' | 'neon';
    activeVariant?: 'primary' | 'neon';
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ 
    tabs, 
    activeTab, 
    onSelect, 
    className = '',
    variant = 'secondary',
    activeVariant = 'primary'
}) => {
    return (
        <div className={`flex gap-2 ${className}`}>
            {tabs.map((tab) => {
                const id = typeof tab === 'string' ? tab : tab.id;
                const label = typeof tab === 'string' ? tab : tab.label;
                const isActive = activeTab === id;
                
                return (
                    <Button
                        key={id}
                        onClick={() => onSelect(id)}
                        variant={isActive ? activeVariant : variant}
                        size="sm"
                        className={isActive && activeVariant === 'primary' ? '!bg-purple-600 hover:!bg-purple-500' : ''}
                        // If it's an object with icon, we could pass it here, but Button handles icons via prop.
                        // For simplicity in this DRY pass, we rely on Button's existing capabilities if expanded.
                    >
                        {label}
                    </Button>
                );
            })}
        </div>
    );
};

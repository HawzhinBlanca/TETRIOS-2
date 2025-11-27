
import React, { useMemo } from 'react';
import { CellModifier } from '../types';
import { MODIFIER_CONFIG } from '../utils/modifierConfig';

export const useModifierStyle = (modifier: CellModifier, isClearing?: boolean, color?: string) => {
    return useMemo(() => {
        const config = MODIFIER_CONFIG[modifier.type];
        if (!config) return null;

        const effectiveColor = color || config.borderColor;

        const dynamicClasses = config.getClass ? config.getClass(modifier, isClearing) : "";
        const dynamicStyle = config.getStyle ? config.getStyle(modifier, isClearing) : {};

        return {
            config,
            className: `${config.baseClass} ${dynamicClasses}`,
            style: {
                '--mod-color': effectiveColor,
                '--mod-border': effectiveColor,
                borderColor: 'var(--mod-border)',
                animation: config.animation || 'none',
                ...dynamicStyle
            } as React.CSSProperties,
            Icon: config.icon,
            iconClass: config.iconClass
        };
    }, [modifier, isClearing, color]);
};

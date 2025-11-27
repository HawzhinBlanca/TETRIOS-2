
import React, { useMemo } from 'react';
import { GhostStyle } from '../types';

export const GhostView: React.FC<{
    rgb: string;
    warning: boolean;
    style: GhostStyle;
    thickness?: number;
    opacity: number;
    glow: number;
}> = React.memo(({ rgb, warning, style, thickness, opacity, glow }) => {
    const displayRgb = warning ? '255, 69, 0' : rgb;
    const outlineWidth = thickness !== undefined ? `${thickness}px` : '2px';
    const currentOpacity = warning ? 1 : opacity;
    const glowMult = warning ? 1.5 : 1;

    // Allow 0 blur if glow is 0
    const minBlur = glow === 0 ? 0 : Math.max(2, 4 * glow * glowMult);
    const maxBlur = glow === 0 ? 0 : Math.max(8, 16 * glow * glowMult);

    const baseStyle: React.CSSProperties = {
        '--cell-rgb': displayRgb,
        '--ghost-blur-min': `${minBlur}px`,
        '--ghost-blur-max': `${maxBlur}px`,
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '2px',
        transition: 'all 100ms ease-out',
        animation: warning 
            ? 'ghost-warning 0.4s infinite ease-in-out alternate' 
            : `ghost-pulse-dynamic 2s infinite ease-in-out`,
        opacity: currentOpacity,
    } as React.CSSProperties;

    const specificStyle = useMemo(() => {
        switch (style) {
            case 'dashed':
                return {
                    background: `rgba(${displayRgb}, 0.1)`,
                    border: `${outlineWidth} dashed rgba(${displayRgb}, ${warning ? 1 : 0.8})`,
                    boxShadow: warning ? `0 0 15px rgba(${displayRgb}, 0.6)` : 'none',
                };
            case 'solid':
                return {
                    background: `rgba(${displayRgb}, ${warning ? 0.5 : 0.3})`,
                    border: `${outlineWidth} solid rgba(${displayRgb}, ${warning ? 1 : 0.6})`,
                    backdropFilter: 'blur(2px)',
                    boxShadow: warning ? `0 0 20px rgba(${displayRgb}, 0.5)` : 'none',
                };
            case 'neon':
            default:
                // Static fallback if animation not supported
                const blur = glow === 0 ? 0 : 8 * glow * glowMult;
                const spread = glow === 0 ? 0 : 4 * glow * glowMult;
                const shadow = blur > 0 ? `0 0 ${blur}px rgba(${displayRgb}, 0.8), inset 0 0 ${spread}px rgba(${displayRgb}, 0.4)` : 'none';
                
                return {
                    background: `rgba(${displayRgb}, 0.1)`,
                    border: `${outlineWidth} solid rgba(${displayRgb}, 0.8)`,
                    boxShadow: shadow,
                };
        }
    }, [style, displayRgb, outlineWidth, warning, glow, glowMult]);

    return <div style={{ ...baseStyle, ...specificStyle }} />;
});

export const ActiveView: React.FC<{
    rgb: string;
    color: string;
    rotating: boolean;
    locked: boolean;
    children?: React.ReactNode;
}> = React.memo(({ rgb, color, rotating, locked, children }) => {
    const style: React.CSSProperties = useMemo(() => {
        if (locked) {
            return {
                background: `rgba(255, 50, 50, 0.6)`,
                boxShadow: `inset 0 0 8px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.8), 0 0 30px rgba(255,50,50,0.6)`,
                border: '1px solid rgba(255,255,255,0.7)',
                animation: 'ghost-warning 0.3s infinite ease-in-out alternate',
                zIndex: 10,
                width: '100%',
                height: '100%',
                borderRadius: '1px'
            };
        }
        return {
            '--cell-rgb': rgb,
            background: `rgba(${rgb}, 0.6)`,
            boxShadow: `inset 0 0 8px rgba(255,255,255,0.4), 0 0 10px ${color}, 0 0 20px ${color}`,
            border: '1px solid rgba(255,255,255,0.5)',
            animation: rotating ? 'pop-rotate 0.2s ease-out' : 'neon-glow 2s infinite ease-in-out',
            zIndex: rotating ? 10 : 1,
            width: '100%',
            height: '100%',
            borderRadius: '1px'
        } as React.CSSProperties;
    }, [rgb, color, rotating, locked]);

    return (
        <div className="w-full h-full relative transition-all duration-75 flex items-center justify-center" style={style}>
            <div className="absolute inset-1 bg-white opacity-10 rounded-[1px] pointer-events-none"></div>
            {children}
        </div>
    );
});

export const EmptyView = React.memo(() => (
    <div 
        className="w-full h-full border border-white/5 rounded-[1px] relative transition-all duration-75" 
        style={{ background: 'rgba(0,0,0,0.3)' }} 
    />
));

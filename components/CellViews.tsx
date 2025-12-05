
import React, { useMemo } from 'react';
import { GhostStyle, BlockSkin, TetrominoType } from '../types';
import { ghostTextureFactory } from '../utils/GhostTextureFactory';
import { EMOJI_MAP } from '../constants';

export const GhostView: React.FC<{
    rgb: string;
    warning: boolean;
    style: GhostStyle;
    thickness?: number;
    opacity: number;
    glow: number;
}> = React.memo(({ rgb, warning, style, opacity, glow }) => {
    // Determine effective color (Red override for warning)
    const displayRgb = warning ? '255, 69, 0' : rgb;
    
    // Fetch cached textures
    const bodyTexture = useMemo(() => ghostTextureFactory.getBody(displayRgb, style), [displayRgb, style]);
    const glowTexture = useMemo(() => ghostTextureFactory.getGlow(displayRgb), [displayRgb]);

    // Base container style
    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: warning ? 1 : opacity,
        transition: 'opacity 0.2s',
    };

    // Body Layer (Static Cached Image)
    const bodyStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${bodyTexture})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        filter: warning ? 'brightness(1.5)' : 'none',
        animation: warning ? 'pulse-red 0.5s infinite alternate' : 'none'
    };

    // Glow Layer (Animated Opacity)
    // Only render if glow intensity > 0
    const glowStyle: React.CSSProperties = {
        position: 'absolute',
        inset: '-20%', // Expand slightly for glow spill
        backgroundImage: `url(${glowTexture})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        opacity: glow,
        animation: warning ? 'none' : 'pulse 2s infinite ease-in-out', // Efficient opacity animation
        mixBlendMode: 'screen',
        pointerEvents: 'none'
    };

    return (
        <div style={containerStyle}>
            {glow > 0 && <div style={glowStyle} />}
            <div style={bodyStyle} />
        </div>
    );
});

export const ActiveView: React.FC<{
    rgb: string;
    color: string;
    rotating: boolean;
    locked: boolean;
    glowIntensity?: number;
    skin?: BlockSkin;
    type?: TetrominoType | 0 | null;
    children?: React.ReactNode;
}> = React.memo(({ rgb, color, rotating, locked, glowIntensity = 1, skin = 'NEON', type, children }) => {
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
        
        const base: React.CSSProperties = {
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: rotating ? 10 : 1,
            transition: 'all 75ms ease-out',
            borderRadius: '1px'
        };

        switch (skin) {
            case 'RETRO':
                return {
                    ...base,
                    backgroundColor: `rgba(${rgb}, 1)`,
                    border: '2px solid rgba(0,0,0,0.3)',
                    boxShadow: `inset 0 0 0 20% rgba(255,255,255,0.4)`
                };
            case 'MINIMAL':
                return {
                    ...base,
                    backgroundColor: color,
                    borderRadius: '0px'
                };
            case 'GELATIN':
                return {
                    ...base,
                    backgroundColor: color,
                    borderRadius: '30%',
                    boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.4), inset -2px -2px 5px rgba(0,0,0,0.2)'
                };
            case 'CYBER':
                return {
                    ...base,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${color}`,
                    boxShadow: `0 0 5px ${color}`,
                    backgroundImage: `radial-gradient(circle, ${color} 20%, transparent 20%)`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center'
                };
            case 'EMOJI':
                return {
                    ...base,
                    backgroundColor: `rgba(${rgb}, 0.3)`,
                    border: `1px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '100%'
                };
            case 'NEON':
            default:
                const glow1 = 10 * glowIntensity;
                const glow2 = 20 * glowIntensity;
                const shadow = glowIntensity > 0 
                    ? `inset 0 0 8px rgba(255,255,255,0.4), 0 0 ${glow1}px ${color}, 0 0 ${glow2}px ${color}`
                    : `inset 0 0 8px rgba(255,255,255,0.4)`;

                return {
                    ...base,
                    '--cell-rgb': rgb,
                    background: `rgba(${rgb}, 0.6)`,
                    boxShadow: shadow,
                    border: '1px solid rgba(255,255,255,0.5)',
                    animation: rotating ? 'pop-rotate 0.2s ease-out' : 'neon-glow 2s infinite ease-in-out',
                } as React.CSSProperties;
        }
    }, [rgb, color, rotating, locked, glowIntensity, skin]);

    return (
        <div style={style}>
            {skin === 'NEON' && !locked && (
                <div className="absolute inset-1 bg-white opacity-10 rounded-[1px] pointer-events-none"></div>
            )}
            
            {skin === 'EMOJI' && !locked && type && (
                <span style={{ fontSize: '70%', lineHeight: 1 }}>{EMOJI_MAP[type as string] || ''}</span>
            )}
            
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
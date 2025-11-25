
import React, { useMemo } from 'react';
import { COLORS } from '../constants';
import { TetrominoType, GhostStyle, CellModifier } from '../types';
import { MODIFIER_CONFIG } from '../utils/modifierConfig';
import { parseRgb } from '../utils/gameUtils';

interface Props {
  type: TetrominoType | 0 | null;
  isGhost?: boolean;
  isGhostWarning?: boolean;
  isRotating?: boolean;
  lockWarning?: boolean;
  modifier?: CellModifier;
  isClearing?: boolean;
  
  // Customization Props
  ghostStyle?: GhostStyle; // 'neon' | 'dashed' | 'solid'
  ghostOutline?: string; // Legacy support or fallback string
  ghostOutlineThickness?: number;
  ghostAnimationDuration?: string;
  ghostShadow?: string;
  ghostOpacity?: number;
  ghostGlowIntensity?: number;
  
  children?: React.ReactNode;
}

type RenderMode = 'GHOST' | 'MODIFIER' | 'ACTIVE' | 'EMPTY';

const Cell: React.FC<Props> = ({ 
  type, 
  isGhost, 
  isGhostWarning,
  isRotating,
  lockWarning,
  modifier,
  isClearing,
  
  ghostStyle = 'neon',
  ghostOutline = '2px',
  ghostOutlineThickness, 
  ghostAnimationDuration = '2s',
  ghostShadow,
  ghostOpacity = 0.6, 
  ghostGlowIntensity = 1,
  children
}) => {
  const color = type ? COLORS[type as TetrominoType] : null;
  const rgb = useMemo(() => color ? parseRgb(color) : '255,255,255', [color]);

  // 1. DETERMINE RENDER MODE
  // Priority: Ghost > Modifier > Active Piece > Empty
  const renderMode: RenderMode = useMemo(() => {
    if (isGhost && color) return 'GHOST';
    if (modifier) return 'MODIFIER';
    if (color) return 'ACTIVE';
    return 'EMPTY';
  }, [isGhost, color, modifier]);

  // 2. DECLARATIVE STYLE GENERATION

  // Ghost Styles
  const ghostStyleObj = useMemo<React.CSSProperties>(() => {
    if (renderMode !== 'GHOST') return {};
    
    const displayRgb = isGhostWarning ? '255, 69, 0' : rgb; // Red-Orange for warning vs standard color
    const outlineWidth = ghostOutlineThickness !== undefined ? `${ghostOutlineThickness}px` : ghostOutline;

    // Calculate visual parameters based on state
    const currentOpacity = isGhostWarning ? 1 : ghostOpacity;
    const glowMult = isGhostWarning ? 1.5 : 1;
    
    const base: React.CSSProperties = {
      '--cell-rgb': displayRgb, // Inject color for CSS animation
      width: '100%',
      height: '100%',
      position: 'relative',
      borderRadius: '2px',
      transition: 'all 100ms ease-out',
      animation: isGhostWarning 
        ? 'ghost-warning 0.4s infinite ease-in-out alternate' 
        : `ghost-pulse-dynamic ${ghostAnimationDuration} infinite ease-in-out`,
      opacity: currentOpacity,
    } as React.CSSProperties;

    // Apply specific style variants
    switch (ghostStyle) {
      case 'dashed':
        return {
          ...base,
          background: `rgba(${displayRgb}, 0.1)`,
          border: `${outlineWidth} dashed rgba(${displayRgb}, ${isGhostWarning ? 1 : 0.8})`,
          boxShadow: isGhostWarning ? `0 0 15px rgba(${displayRgb}, 0.6)` : 'none',
        };
      case 'solid':
        return {
          ...base,
          background: `rgba(${displayRgb}, ${isGhostWarning ? 0.5 : 0.3})`, 
          border: `${outlineWidth} solid rgba(${displayRgb}, ${isGhostWarning ? 1 : 0.6})`, 
          backdropFilter: 'blur(2px)', // Glassy effect for solid
          boxShadow: isGhostWarning ? `0 0 20px rgba(${displayRgb}, 0.5)` : 'none',
        };
      case 'neon':
      default:
        const blur = 8 * ghostGlowIntensity * glowMult;
        const spread = 4 * ghostGlowIntensity * glowMult;
        return {
          ...base,
          background: `rgba(${displayRgb}, 0.1)`,
          border: `${outlineWidth} solid rgba(${displayRgb}, 0.8)`,
          boxShadow: ghostShadow || `0 0 ${blur}px rgba(${displayRgb}, 0.8), inset 0 0 ${spread}px rgba(${displayRgb}, 0.4)`,
        };
    }
  }, [renderMode, isGhostWarning, rgb, ghostAnimationDuration, ghostOpacity, ghostOutline, ghostOutlineThickness, ghostStyle, ghostShadow, ghostGlowIntensity]);

  // Active Piece Styles
  const activeStyleObj = useMemo<React.CSSProperties>(() => {
    if (renderMode !== 'ACTIVE') return {};

    if (lockWarning) {
      return {
        background: `rgba(255, 50, 50, 0.6)`, // Reddish tint
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
      '--cell-rgb': rgb, // Inject color for CSS animation
      background: `rgba(${rgb}, 0.6)`,
      // Enhanced Neon Glow: Inner shine + Tight Glow + Wide Soft Glow
      boxShadow: `inset 0 0 8px rgba(255,255,255,0.4), 0 0 10px ${color}, 0 0 20px ${color}`,
      border: '1px solid rgba(255,255,255,0.5)',
      animation: isRotating ? 'pop-rotate 0.2s ease-out' : 'neon-glow 2s infinite ease-in-out',
      zIndex: isRotating ? 10 : 1,
      width: '100%',
      height: '100%',
      borderRadius: '1px'
    } as React.CSSProperties;
  }, [renderMode, rgb, color, isRotating, lockWarning]);

  // 3. MODIFIER RENDER HELPER
  const renderModifier = () => {
    if (!modifier) return null;
    const config = MODIFIER_CONFIG[modifier.type];
    if (!config) return null;

    const Icon = config.icon;
    const dynamicClasses = config.getClass ? config.getClass(modifier, isClearing) : "";
    const dynamicStyle = config.getStyle ? config.getStyle(modifier, isClearing) : {};

    return (
      <div 
        className={`w-full h-full relative transition-all duration-75 rounded-[2px] flex items-center justify-center overflow-hidden ${config.baseClass} ${dynamicClasses}`}
        style={{
            '--mod-color': config.borderColor,
            '--mod-border': config.borderColor,
            borderColor: 'var(--mod-border)',
            animation: config.animation || 'none',
            ...dynamicStyle
        } as React.CSSProperties}
      >
        {/* Render Custom Content if provided, else Fallback to Icon */}
        {config.renderContent 
            ? config.renderContent(modifier, isClearing) 
            : (Icon && <Icon size={14} className={config.iconClass} fill="currentColor" />)
        }
        
        {/* Global Gloss Overlay for all modifiers */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      </div>
    );
  };

  // 4. RENDER SWITCH
  switch (renderMode) {
    case 'GHOST':
      return <div style={ghostStyleObj} />;
      
    case 'MODIFIER':
      return renderModifier();
      
    case 'ACTIVE':
      return (
        <div
          className="w-full h-full relative transition-all duration-75 flex items-center justify-center"
          style={activeStyleObj}
        >
          <div className="absolute inset-1 bg-white opacity-10 rounded-[1px] pointer-events-none"></div>
          {children}
        </div>
      );
      
    case 'EMPTY':
    default:
      return (
        <div 
          className="w-full h-full border border-white/5 rounded-[1px] relative transition-all duration-75" 
          style={{ background: 'rgba(0,0,0,0.3)' }} 
        />
      );
  }
};

export default React.memo(Cell);



import React from 'react';
import { COLORS, MODIFIER_COLORS } from '../constants';
import { TetrominoType, GhostStyle, CellModifier, CellModifierType } from '../types';

interface Props {
  type: TetrominoType | 0 | null;
  isGhost?: boolean;
  isGhostWarning?: boolean;
  isRotating?: boolean;
  modifier?: CellModifier; // Pass modifier for cell
  
  // Ghost Configuration
  ghostStyle?: GhostStyle;
  ghostOutline?: string;
  ghostAnimationDuration?: string;
  ghostShadow?: string;
  ghostOpacity?: number;
}

const Cell: React.FC<Props> = ({ 
  type, 
  isGhost, 
  isGhostWarning,
  isRotating,
  modifier,
  
  ghostStyle = 'neon',
  ghostOutline = '2px', 
  ghostAnimationDuration = '2s',
  ghostShadow,
  ghostOpacity = 1,
}) => {
  const color = type ? COLORS[type as TetrominoType] : null;
  
  // Handle modifiers directly on the cell
  if (modifier) {
    let modifierColor: string = 'transparent';
    let content: React.ReactNode = null;
    const classList = ["w-full", "h-full", "relative", "transition-all", "duration-75", "rounded-[1px]", "flex", "items-center", "justify-center", "font-bold", "text-white", "text-xs"];
    let pulseAnimation = '';

    switch (modifier.type) {
      case 'GEM':
        modifierColor = MODIFIER_COLORS.GEM;
        content = '💎';
        classList.push('bg-pink-600', 'border', 'border-pink-400', 'shadow-[0_0_15px_rgba(236,72,153,0.7)]');
        break;
      case 'BOMB':
        modifierColor = MODIFIER_COLORS.BOMB;
        content = <span className="text-white text-lg font-mono">{modifier.timer}</span>;
        classList.push('bg-red-800', 'border-2', 'border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.9)]');
        pulseAnimation = 'ghost-warning 0.5s infinite ease-in-out alternate'; // Using warning animation for bomb pulse
        break;
      case 'ICE':
        modifierColor = MODIFIER_COLORS.ICE;
        content = '🧊';
        classList.push('bg-blue-700', 'border', 'border-blue-400', 'opacity-80');
        break;
      case 'CRACKED_ICE':
        modifierColor = MODIFIER_COLORS.CRACKED_ICE;
        content = 'แตก'; // Simplified representation for cracked
        classList.push('bg-blue-600', 'border', 'border-blue-300', 'opacity-80');
        break;
      case 'WILDCARD_BLOCK':
        modifierColor = MODIFIER_COLORS.WILDCARD_BLOCK;
        content = '❓';
        classList.push('bg-yellow-600', 'border', 'border-yellow-300', 'shadow-[0_0_15px_rgba(234,179,8,0.7)]', 'animate-pulse');
        pulseAnimation = 'ghost-pulse 1.5s infinite ease-in-out'; // Custom pulse for wildcard
        break;
      case 'LASER_BLOCK':
        modifierColor = MODIFIER_COLORS.LASER_BLOCK;
        content = '⚡';
        classList.push('bg-cyan-700', 'border', 'border-cyan-400', 'shadow-[0_0_15px_rgba(6,182,212,0.7)]', 'animate-pulse');
        pulseAnimation = 'ghost-pulse 1s infinite ease-in-out'; // Custom pulse for laser
        break;
      case 'NUKE_BLOCK': // New: Nuke Block
        modifierColor = MODIFIER_COLORS.NUKE_BLOCK;
        content = '💥';
        classList.push('bg-fuchsia-800', 'border', 'border-fuchsia-500', 'shadow-[0_0_15px_rgba(255,0,128,0.9)]', 'animate-pulse');
        pulseAnimation = 'ghost-warning 0.8s infinite ease-in-out alternate'; // Intense pulse for Nuke
        break;
    }

    return (
      <div 
        className={classList.join(' ')} 
        style={{ animation: pulseAnimation || 'none', borderColor: modifierColor }}
      >
        {content}
      </div>
    );
  }

  // --- GHOST RENDER LOGIC ---
  if (isGhost && color) {
    const rgb = color.match(/\d+/g)?.join(',') || '255,255,255';
    
    // Warning Overrides (Red/Gold alarm state)
    const isWarning = isGhostWarning;
    // Use standard color unless warning
    const displayRgb = isWarning ? '255, 69, 0' : rgb; 

    // Base Styles based on Configuration
    let background = 'transparent';
    let border = 'none';
    let boxShadow = 'none';

    if (isWarning) {
      // Warning style - High intensity Red/Orange
      background = `rgba(${displayRgb}, 0.25)`;
      border = `${ghostOutline} solid rgba(${displayRgb}, 1)`;
      // Stronger glow for warning
      boxShadow = `0 0 15px rgba(${displayRgb}, 0.9), inset 0 0 8px rgba(${displayRgb}, 0.5)`;
    } else {
      switch (ghostStyle) {
        case 'dashed':
          // Classic styling: Dashed border, very faint fill
          background = `rgba(${displayRgb}, 0.1)`;
          border = `${ghostOutline} dashed rgba(${displayRgb}, 0.6)`;
          boxShadow = 'none';
          break;
        case 'solid':
          // Modern flat: No border, strong semi-transparent fill
          background = `rgba(${displayRgb}, 0.4)`;
          border = `0px solid transparent`; 
          boxShadow = 'none';
          break;
        case 'neon':
        default:
          // Sci-Fi/Neon: Solid glowing border, faint fill, custom shadow
          background = `rgba(${displayRgb}, 0.1)`;
          border = `${ghostOutline} solid rgba(${displayRgb}, 0.6)`;
          // Use prop ghostShadow if available, else default calculation
          boxShadow = ghostShadow || `0 0 8px rgba(${displayRgb}, 0.6), inset 0 0 4px rgba(${displayRgb}, 0.4)`;
          break;
      }
    }

    return (
      <div
        className="w-full h-full relative transition-all duration-75 rounded-[1px]"
        style={{
          background,
          border,
          boxShadow,
          // Warning animation is faster and more aggressive
          animation: isWarning 
            ? 'ghost-warning 0.5s infinite ease-in-out alternate' 
            : `ghost-pulse ${ghostAnimationDuration} infinite ease-in-out`,
          // Opacity: Warning is always visible (1), otherwise use prop
          opacity: isWarning ? 1 : ghostOpacity,
        }}
      />
    );
  }

  // --- ACTIVE/LOCKED PIECE RENDER LOGIC ---
  return (
    <div
      className={`w-full h-full border-none relative transition-all duration-75 rounded-[1px]`}
      style={{
        background: color ? `rgba(${color.match(/\d+/g)?.join(',')}, 0.6)` : 'rgba(0,0,0,0.3)',
        boxShadow: color ? `inset 0 0 8px rgba(255,255,255,0.4), 0 0 12px ${color}` : 'none',
        border: color ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.03)',
        animation: isRotating ? 'pop-rotate 0.2s ease-out' : 'none',
        zIndex: isRotating ? 10 : 1
      }}
    >
        {color && (
            <div className="absolute inset-1 bg-white opacity-10 rounded-sm"></div>
        )}
    </div>
  );
};

export default React.memo(Cell);


import React from 'react';
import { COLORS } from '../constants';
import { TetrominoType } from '../types';

interface Props {
  type: TetrominoType | 0 | 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | null;
  isGhost?: boolean;
  isGhostWarning?: boolean;
  isRotating?: boolean;
  
  // Ghost Configuration
  ghostStyle?: 'neon' | 'dashed' | 'solid';
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
  
  ghostStyle = 'neon',
  ghostOutline = '2px', 
  ghostAnimationDuration = '2s',
  ghostShadow,
  ghostOpacity = 1,
}) => {
  const color = type ? COLORS[type as TetrominoType] : null;
  
  // --- GHOST RENDER LOGIC ---
  if (isGhost && color) {
    const rgb = color.match(/\d+/g)?.join(',');
    
    // Warning Overrides (Red/Gold alarm state)
    const isWarning = isGhostWarning;
    // If warning, we use a hardcoded urgent color base, but the animation handles the pulsing
    const displayRgb = isWarning ? '255, 69, 0' : rgb; 

    // Base Styles based on Configuration
    let background = 'transparent';
    let border = 'none';
    let boxShadow = 'none';

    if (isWarning) {
      // Warning style (Static fallback, animation overrides this)
      background = `rgba(${displayRgb}, 0.2)`;
      border = `${ghostOutline} solid rgba(${displayRgb}, 0.8)`;
      boxShadow = `0 0 10px rgba(${displayRgb}, 0.6)`;
    } else {
      switch (ghostStyle) {
        case 'dashed':
          // Classic styling: Dashed border, very faint fill, no glow
          background = `rgba(${displayRgb}, 0.1)`;
          border = `${ghostOutline} dashed rgba(${displayRgb}, 0.6)`;
          boxShadow = 'none';
          break;
        case 'solid':
          // Modern flat: No border, strong semi-transparent fill
          background = `rgba(${displayRgb}, 0.3)`;
          border = `0px solid transparent`; 
          boxShadow = 'none';
          break;
        case 'neon':
        default:
          // Sci-Fi/Neon: Solid glowing border, faint fill, specific shadow
          background = `rgba(${displayRgb}, 0.1)`;
          border = `${ghostOutline} solid rgba(${displayRgb}, 0.5)`;
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
          // If warning, use the urgent 'ghost-warning' animation at fixed 1s speed
          // Otherwise use the user-configured pulse
          animation: isWarning 
            ? 'ghost-warning 0.8s infinite ease-in-out' 
            : `ghost-pulse ${ghostAnimationDuration} infinite ease-in-out`,
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


import React from 'react';
import { TetrominoType } from '../types';
import { TETROMINOS, EXTENDED_SHAPES } from '../constants';
import { Lock } from 'lucide-react';
import Cell from './Cell';
import { Label } from './ui/Text';
import { useUpdateFlash } from '../hooks/useUpdateFlash';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { getPieceColor } from '../utils/themeUtils';

interface Props {
  title: string;
  type: TetrominoType | null;
  lastUpdate?: number;
  variant?: 'default' | 'small' | 'recessed';
  className?: string;
  "aria-label"?: string;
  isLocked?: boolean;
}

const Preview: React.FC<Props> = React.memo(({ title, type, lastUpdate, variant = 'default', className = '', isLocked = false, ...rest }) => {
  const piece = type === 'WILDCARD_SHAPE' ? TETROMINOS.WILDCARD_SHAPE : (type ? TETROMINOS[type] : null);
  const animate = useUpdateFlash(lastUpdate);
  const isExtended = type && EXTENDED_SHAPES.includes(type);
  const colorblindMode = useGameSettingsStore(state => state.colorblindMode);

  const isSmall = variant === 'small';
  
  // Compact styling for overlay
  const blockSize = isSmall ? 8 : 14; 
  const gap = '1px';

  // Styles for overlay "Glass HUD" look
  let containerClasses = `relative overflow-hidden transition-all duration-500 ease-out flex flex-col items-center justify-center ${className} `;
  
  // Animation Trigger
  const animationClass = animate ? 'animate-[pop-rotate_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]' : '';

  return (
    <div className={containerClasses} aria-hidden="true" {...rest}>
        {/* Header Label */}
        {title && (
            <div className="absolute top-1 left-0 w-full text-center z-10 pointer-events-none">
                <Label className="text-[8px] tracking-[0.2em] text-white/50 drop-shadow-sm">
                    {title}
                </Label>
            </div>
        )}
        
        {isExtended && !isSmall && (
            <div className="absolute top-0 right-0 z-20">
                <span className="text-[6px] font-black text-yellow-400 bg-yellow-900/50 px-1 rounded border border-yellow-500/30 animate-pulse">
                    !
                </span>
            </div>
        )}
      
        <div className={`relative flex items-center justify-center flex-1 z-10 ${animationClass} ${title ? 'mt-3' : ''}`}>
            <div 
                key={type || 'empty'} 
                className={`grid transition-all duration-300 ${isLocked ? 'grayscale opacity-40 blur-[1px]' : ''}`} 
                style={{ 
                    gap: gap,
                    gridTemplateColumns: `repeat(${piece ? piece.shape[0].length : 4}, 1fr)`,
                }}
            >
                {piece && piece.shape.map((row, y) => 
                    row.map((cell, x) => {
                        const active = cell !== 0;
                        return (
                            <div key={`${y}-${x}`} 
                                style={{
                                    width: `${blockSize}px`,
                                    height: `${blockSize}px`,
                                    opacity: active ? 1 : 0,
                                }}
                            >
                                {active && (
                                    <Cell type={type} isGhost={false} ghostGlowIntensity={1.2}>
                                        {type === 'WILDCARD_SHAPE' && <span className="text-white font-black text-[6px]">?</span>}
                                    </Cell>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center text-white/60 z-20">
                    <Lock size={12} strokeWidth={2.5} />
                </div>
            )}
        </div>
    </div>
  );
});

export default Preview;

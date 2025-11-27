
import React from 'react';
import { TetrominoType } from '../types';
import { TETROMINOS, EXTENDED_SHAPES } from '../constants';
import { Lock } from 'lucide-react';
import GlassPanel from './ui/GlassPanel';
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
  
  const colorblindMode = useGameSettingsStore(state => state.colorblindMode);

  const isSmall = variant === 'small';
  const isRecessed = variant === 'recessed';
  const blockSize = (isSmall || isRecessed) ? 12 : 20;
  const gap = '2px';
  
  // Detect if this is a special "Reward" piece
  const isExtended = type && EXTENDED_SHAPES.includes(type);

  let containerClasses = '';
  
  if (isRecessed) {
      containerClasses = `flex flex-col items-center justify-center bg-black/40 inner-shadow rounded-lg border border-white/5 p-2 ${className}`;
  } else if (isSmall) {
      containerClasses = `flex flex-col items-center ${className}`;
  } else {
      containerClasses = `flex flex-col items-center mb-6 p-4 w-32 min-h-[120px] ${className}`;
  }

  if (!isSmall && !isRecessed && animate) {
      containerClasses += ' scale-105 border-cyan-400 brightness-125 shadow-[0_0_20px_rgba(6,182,212,0.5)]';
  }
  
  // Special Reward Styling
  if (isExtended && !isSmall && !isRecessed) {
      containerClasses += ' border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-yellow-900/20';
  }

  // Key change triggers re-mount animation for the grid content
  const Content = (
    <>
      {title && (
          <div className="flex items-center gap-2 mb-1.5">
              <Label className={isSmall || isRecessed ? 'text-[8px] opacity-70' : 'text-xs'}>{title}</Label>
              {isExtended && !isSmall && !isRecessed && (
                  <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider animate-pulse">Special</span>
              )}
          </div>
      )}
      
      <div className="relative flex items-center justify-center flex-1">
        <div 
            key={type || 'empty'} 
            className={`grid ${isLocked ? 'grayscale opacity-20 blur-[1px]' : ''} transition-all duration-300 animate-in fade-in zoom-in-95`} 
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
                                opacity: active ? 1 : 0
                            }}
                        >
                            {active && (
                                <Cell type={type} isGhost={false}>
                                    {type === 'WILDCARD_SHAPE' && <span className={`text-white leading-none font-black ${isSmall ? 'text-[8px]' : 'text-sm'}`}>?</span>}
                                </Cell>
                            )}
                        </div>
                    )
                })
            )}
        </div>
        {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 z-10">
                <Lock size={isSmall ? 12 : 24} strokeWidth={2.5} />
            </div>
        )}
      </div>
    </>
  );

  if (isSmall || isRecessed) {
      return <div className={containerClasses} aria-hidden="true" {...rest}>{Content}</div>;
  }

  return (
    <GlassPanel 
      variant="dark"
      className={containerClasses}
      aria-hidden="true"
      {...rest}
    >
      {Content}
    </GlassPanel>
  );
});

export default Preview;

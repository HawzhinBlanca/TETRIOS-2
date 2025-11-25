
import React from 'react';
import { TetrominoType } from '../types';
import { TETROMINOS, EXTENDED_SHAPES } from '../constants';
import { Lock } from 'lucide-react';
import GlassPanel from './ui/GlassPanel';
import Cell from './Cell';
import { Label } from './ui/Text';
import { useUpdateFlash } from '../hooks/useUpdateFlash';

interface Props {
  title: string;
  type: TetrominoType | null;
  lastUpdate?: number;
  variant?: 'default' | 'small';
  className?: string;
  "aria-label"?: string;
  isLocked?: boolean;
}

const Preview: React.FC<Props> = React.memo(({ title, type, lastUpdate, variant = 'default', className = '', isLocked = false, ...rest }) => {
  const piece = type === 'WILDCARD_SHAPE' ? TETROMINOS.WILDCARD_SHAPE : (type ? TETROMINOS[type] : null);
  const animate = useUpdateFlash(lastUpdate);

  const isSmall = variant === 'small';
  const blockSize = isSmall ? 14 : 20;
  const gap = isSmall ? '2px' : '4px';
  
  // Detect if this is a special "Reward" piece
  const isExtended = type && EXTENDED_SHAPES.includes(type);

  let containerClasses = isSmall 
    ? `flex flex-col items-center ${className}`
    : `flex flex-col items-center mb-6 p-4 w-32 min-h-[120px] ${className}`;

  if (!isSmall && animate) {
      containerClasses += ' scale-105 border-cyan-400 brightness-125 shadow-[0_0_20px_rgba(6,182,212,0.5)]';
  }
  
  // Special Reward Styling
  if (isExtended && !isSmall) {
      containerClasses += ' border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-yellow-900/20';
  }

  // Key change triggers re-mount animation for the grid content
  const Content = (
    <>
      <div className="flex items-center gap-2 mb-2">
          {title && <Label className={isSmall ? 'text-[9px]' : 'text-xs'}>{title}</Label>}
          {isExtended && !isSmall && (
              <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider animate-pulse">Special</span>
          )}
      </div>
      
      <div className="relative">
        <div 
            key={type || 'empty'} 
            className={`grid ${isLocked ? 'grayscale opacity-40 blur-[1px]' : ''} transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-right-4`} 
            style={{ 
                gap: gap,
                gridTemplateColumns: `repeat(${piece ? piece.shape[0].length : 4}, 1fr)`,
                width: piece ? `${piece.shape[0].length * blockSize}px` : `${4 * blockSize}px`
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
                                    {type === 'WILDCARD_SHAPE' && <span className={`text-white leading-none font-black ${isSmall ? 'text-[10px]' : 'text-sm'}`}>?</span>}
                                </Cell>
                            )}
                        </div>
                    )
                })
            )}
        </div>
        {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 z-10 animate-in zoom-in duration-200">
                <Lock size={isSmall ? 16 : 24} strokeWidth={3} />
            </div>
        )}
      </div>
    </>
  );

  if (isSmall) {
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

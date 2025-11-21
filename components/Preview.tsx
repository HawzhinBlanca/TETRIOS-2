import React, { useEffect, useState } from 'react';
import { TetrominoType } from '../types';
import { TETROMINOS, COLORS } from '../constants';

interface Props {
  title: string;
  type: TetrominoType | null;
  lastUpdate?: number;
  "aria-label"?: string; // Allow custom aria-label
}

const Preview: React.FC<Props> = React.memo(({ title, type, lastUpdate, ...rest }) => {
  // If type is WILDCARD_SHAPE, display a question mark instead of a specific shape
  const piece = type === 'WILDCARD_SHAPE' ? TETROMINOS.WILDCARD_SHAPE : (type ? TETROMINOS[type] : null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (lastUpdate) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(t);
    }
  }, [lastUpdate]);
  
  return (
    <div 
      className={`flex flex-col items-center mb-6 p-4 bg-gray-900/60 rounded-xl border transition-all duration-200 min-h-[120px] w-32 ${animate ? 'scale-105 border-cyan-400 brightness-125 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-gray-800'}`}
      aria-hidden="true" // Mark as decorative, main info should be conveyed elsewhere
      {...rest}
    >
      {title && <span className="text-gray-400 text-xs uppercase tracking-widest mb-4">{title}</span>}
      <div className="grid gap-1" style={{ 
          gridTemplateColumns: `repeat(${piece ? piece.shape[0].length : 4}, 1fr)`,
          width: piece ? `${piece.shape[0].length * 20}px` : '80px'
      }}>
        {piece && piece.shape.map((row, y) => 
            row.map((cell, x) => {
                const active = cell !== 0;
                const color = active ? COLORS[type as TetrominoType] : null;
                const rgb = color ? color.match(/\d+/g)?.join(',') : '0,0,0';
                
                return (
                    <div key={`${y}-${x}`} 
                        className="w-5 h-5 rounded-[2px] flex items-center justify-center" // Added flex for question mark
                        style={{
                            background: active ? `rgba(${rgb}, 0.8)` : 'transparent',
                            boxShadow: active ? `inset 0 0 4px rgba(255,255,255,0.4), 0 0 8px ${color}` : 'none',
                            border: active ? '1px solid rgba(255,255,255,0.3)' : 'none',
                            opacity: active ? 1 : 0
                        }}
                    >
                        {type === 'WILDCARD_SHAPE' && active && <span className="text-white text-base leading-none">?</span>}
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
});

export default Preview;
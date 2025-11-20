
import React, { useEffect, useState } from 'react';
import { TetrominoType } from '../types';
import { TETROMINOS, COLORS } from '../constants';

interface Props {
  title: string;
  type: TetrominoType | null;
  lastUpdate?: number;
}

const Preview: React.FC<Props> = ({ title, type, lastUpdate }) => {
  const piece = type ? TETROMINOS[type] : null;
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (lastUpdate) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(t);
    }
  }, [lastUpdate]);
  
  return (
    <div className={`flex flex-col items-center mb-6 p-4 bg-gray-900/60 rounded-xl border transition-all duration-200 min-h-[120px] w-32 ${animate ? 'scale-105 border-cyan-400 brightness-125 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-gray-800'}`}>
      <span className="text-gray-400 text-xs uppercase tracking-widest mb-4">{title}</span>
      <div className="grid gap-1" style={{ 
          gridTemplateColumns: `repeat(${piece ? piece.shape[0].length : 4}, 1fr)`,
          width: piece ? `${piece.shape[0].length * 20}px` : '80px'
      }}>
        {piece && piece.shape.map((row, y) => 
            row.map((cell, x) => {
                const active = cell !== 0;
                const color = active ? COLORS[type as TetrominoType] : null;
                return (
                    <div key={`${y}-${x}`} 
                        className="w-5 h-5 rounded-sm"
                        style={{
                            background: active ? `rgb(${color?.match(/\d+/g)?.join(',')})` : 'transparent',
                            boxShadow: active ? `0 0 8px ${color}` : 'none',
                            opacity: active ? 1 : 0
                        }}
                    />
                )
            })
        )}
      </div>
    </div>
  );
};

export default Preview;

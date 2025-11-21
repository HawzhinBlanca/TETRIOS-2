import React, { useEffect, useState } from 'react';

interface Props {
  label: string;
  text: string | number;
  progress?: number; // 0 to 1
  icon?: React.ReactNode; // Optional icon for the label
  className?: string;
}

const Display: React.FC<Props> = React.memo(({ label, text, progress, icon, className = '' }) => {
  const [prevText, setPrevText] = useState(text);
  const [delta, setDelta] = useState<string | null>(null);

  useEffect(() => {
     if (typeof text === 'number' && typeof prevText === 'number') {
         const diff = text - prevText;
         if (diff > 0) {
             setDelta(`+${diff}`);
             setTimeout(() => setDelta(null), 1500);
         }
     }
     setPrevText(text);
  }, [text]);

  return (
    <div className={`relative flex flex-col mb-4 group select-none transition-transform duration-300 hover:scale-[1.02] ${className}`} role="status" aria-label={`${label} display`}>
      {/* Glass Background */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg transition-colors duration-300 group-hover:bg-gray-900/50 group-hover:border-white/20" aria-hidden="true"></div>
      
      <div className="relative z-10 p-5 flex flex-col w-full min-w-[180px]">
          {/* Header */}
          <div className="flex justify-between w-full items-center mb-2">
              <span className="text-cyan-400/90 text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                  {icon && <span className="text-cyan-300">{icon}</span>}
                  {label}
              </span>
          </div>
          
          {/* Main Value */}
          <div className="relative flex items-baseline justify-end gap-2 overflow-hidden">
             {/* Delta Animation */}
             {delta && (
                  <span className="text-xs font-bold text-emerald-400 animate-in fade-in slide-in-from-bottom-2 duration-500" aria-hidden="true">
                      {delta}
                  </span>
              )}
              <span className="text-white text-3xl font-mono font-bold tracking-tight drop-shadow-md tabular-nums leading-none">
                  {text}
              </span>
          </div>

          {/* Progress Bar - Sleek */}
          {progress !== undefined && (
              <div className="w-full h-1 bg-gray-700/30 mt-3 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                      style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
              </div>
          )}
      </div>
    </div>
  );
});

export default Display;
import React, { useEffect, useState } from 'react';

interface Props {
  label: string;
  text: string | number;
  progress?: number; // 0 to 1
  icon?: React.ReactNode; // Optional icon for the label
}

const Display: React.FC<Props> = React.memo(({ label, text, progress, icon }) => {
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
    <div className="relative flex flex-col mb-6 group select-none" role="status" aria-label={`${label} display`}>
      {/* Backplate */}
      <div className="absolute inset-0 bg-[#081020] skew-x-[-10deg] border-l-2 border-cyan-800/50 rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" aria-hidden="true"></div>
      
      {/* Scanning Line Overlay */}
      <div className="absolute inset-0 skew-x-[-10deg] overflow-hidden opacity-20 pointer-events-none" aria-hidden="true">
          <div className="w-full h-[200%] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent animate-[scan_4s_linear_infinite]"></div>
      </div>

      <div className="relative z-10 p-4 flex flex-col w-full min-w-[200px]">
          {/* Header */}
          <div className="flex justify-between w-full items-center border-b border-cyan-900/50 pb-1 mb-2">
              <span className="text-cyan-500 text-[9px] uppercase tracking-[0.25em] font-bold flex items-center gap-2">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" aria-hidden="true"></div>
                  {icon && <span className="mr-1 text-base leading-none">{icon}</span>}
                  {label}
              </span>
              {progress !== undefined && (
                  <span className="text-[9px] text-cyan-400/60 font-mono">{Math.round(progress * 100)}%</span>
              )}
          </div>
          
          {/* Main Value */}
          <div className="relative">
              <span className="text-white text-3xl font-mono font-bold tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] tabular-nums block text-right pr-2" aria-live="polite">
                  {text}
              </span>
              
              {/* Delta Indicator */}
              {delta && (
                  <span className="absolute top-0 left-0 text-sm font-mono font-bold text-green-400 animate-[fadeUp_0.8s_ease-out] drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" aria-hidden="true">
                      {delta}
                  </span>
              )}
          </div>

          {/* Progress Bar Decoration */}
          {progress !== undefined && (
              <div 
                  className="w-full h-1.5 bg-gray-900 mt-2 rounded-sm overflow-hidden border border-gray-800 relative" 
                  role="progressbar" 
                  aria-valuenow={Math.min(100, Math.max(0, progress * 100))} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                  aria-label={`${label} progress`}
              >
                   {/* Ticks */}
                   <div className="absolute inset-0 flex justify-between px-1 z-10 opacity-20" aria-hidden="true">
                       {[...Array(5)].map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
                   </div>
                   
                  <div 
                      className="h-full bg-gradient-to-r from-cyan-700 via-cyan-500 to-cyan-400 shadow-[0_0_15px_cyan]" 
                      style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                  />
              </div>
          )}
      </div>

      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-600/50" aria-hidden="true"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-600/50" aria-hidden="true"></div>
    </div>
  );
});

export default Display;
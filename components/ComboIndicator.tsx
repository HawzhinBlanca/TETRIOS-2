
import React from 'react';
import GlassPanel from './ui/GlassPanel';
import { Flame, Zap } from 'lucide-react';

interface Props {
  comboCount: number;
  isBackToBack: boolean;
}

const ComboIndicator: React.FC<Props> = ({ comboCount, isBackToBack }) => {
  if (comboCount < 1 && !isBackToBack) return null;

  const ariaLabel: string = `Combo: ${comboCount + 1}. ${isBackToBack ? 'Back-to-Back bonus active.' : ''}`;

  // Dynamic Styling based on intensity
  let intensityClass = "border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]";
  let bgGradient = "bg-gradient-to-r from-emerald-950/90 to-transparent";
  let scale = "scale-100";
  
  if (comboCount > 2) {
      intensityClass = "border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]";
      bgGradient = "bg-gradient-to-r from-cyan-950/90 to-transparent";
      scale = "scale-105";
  }
  if (comboCount > 5) {
      intensityClass = "border-purple-500/50 text-fuchsia-400 shadow-[0_0_25px_rgba(232,121,249,0.4)]";
      bgGradient = "bg-gradient-to-r from-purple-900/90 to-transparent";
      scale = "scale-110";
  }
  if (comboCount > 9) {
      intensityClass = "border-yellow-500/60 text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-pulse";
      bgGradient = "bg-gradient-to-r from-yellow-900/90 to-transparent";
      scale = "scale-125";
  }

  return (
    <div className="flex flex-col items-start gap-2 transition-all duration-300 pointer-events-none z-30">
      {isBackToBack && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-r-full bg-yellow-500/20 border-l-4 border-yellow-500 text-[10px] font-black text-yellow-400 uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-in slide-in-from-left-4 fade-in duration-300 backdrop-blur-sm">
          <Zap size={12} className="fill-current animate-pulse" /> 
          <span>Back-to-Back</span>
        </div>
      )}
      
      {comboCount >= 1 && (
        <div 
            className={`flex flex-col items-start justify-center pl-6 pr-10 py-3 rounded-r-xl border-l-4 transition-all duration-200 transform animate-in slide-in-from-left-10 fade-in ${intensityClass} ${bgGradient} ${scale} backdrop-blur-md`}
            role="status"
            aria-live="polite"
            aria-label={ariaLabel}
        >
          <div className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70 mb-0.5 ml-0.5">Chain</div>
          <div className="flex items-baseline gap-1 font-black text-5xl leading-none drop-shadow-2xl italic tracking-tighter">
            <span>{comboCount + 1}</span>
            <span className="text-2xl opacity-80 not-italic ml-1">x</span>
          </div>
          {comboCount > 5 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/10 mix-blend-overlay">
                  <Flame size={48} />
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ComboIndicator);

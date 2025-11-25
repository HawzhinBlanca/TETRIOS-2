
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
  let bgGradient = "bg-gradient-to-br from-emerald-900/80 to-black/80";
  let scale = "scale-100";
  
  if (comboCount > 2) {
      intensityClass = "border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]";
      bgGradient = "bg-gradient-to-br from-cyan-900/80 to-black/80";
      scale = "scale-105";
  }
  if (comboCount > 5) {
      intensityClass = "border-purple-500/50 text-fuchsia-400 shadow-[0_0_25px_rgba(232,121,249,0.4)]";
      bgGradient = "bg-gradient-to-br from-purple-900/80 to-black/80";
      scale = "scale-110";
  }
  if (comboCount > 9) {
      intensityClass = "border-yellow-500/60 text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-pulse";
      bgGradient = "bg-gradient-to-br from-yellow-900/80 to-black/80";
      scale = "scale-125";
  }

  return (
    <div className="flex flex-col items-end gap-2 transition-all duration-300 pointer-events-none z-30">
      {isBackToBack && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-[10px] font-black text-yellow-400 uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-in slide-in-from-right-4 fade-in duration-300">
          <Zap size={12} className="fill-current" /> Back-to-Back
        </div>
      )}
      
      {comboCount >= 1 && (
        <GlassPanel 
            variant="dark"
            className={`flex flex-col items-center justify-center px-5 py-3 rounded-xl border transition-all duration-200 transform animate-in zoom-in-90 fade-in slide-in-from-bottom-4 ${intensityClass} ${bgGradient} ${scale}`}
            role="status"
            aria-live="polite"
            aria-label={ariaLabel}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Combo</div>
          <div className="flex items-baseline gap-1 font-black text-4xl leading-none drop-shadow-lg">
            <span>{comboCount + 1}</span>
            <span className="text-xl opacity-90">x</span>
          </div>
          {comboCount > 5 && (
              <div className="absolute -top-4 -right-4 text-orange-500 animate-bounce drop-shadow-lg filter brightness-125">
                  <Flame size={28} fill="currentColor" />
              </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
};

export default React.memo(ComboIndicator);

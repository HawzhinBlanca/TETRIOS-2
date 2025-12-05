
import React, { useEffect, useState } from 'react';
import { Flame, Zap, Award, Crown, ZapOff, TrendingUp } from 'lucide-react';

interface Props {
  comboCount: number;
  isBackToBack: boolean;
}

const ComboIndicator: React.FC<Props> = ({ comboCount, isBackToBack }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(t);
  }, [comboCount]);

  if (comboCount < 1 && !isBackToBack) return null;

  const ariaLabel: string = `Combo: ${comboCount + 1}. ${isBackToBack ? 'Back-to-Back bonus active.' : ''}`;

  let intensityClass = "border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]";
  let bgGradient = "bg-gradient-to-r from-emerald-950/90 to-transparent";
  let scaleBase = 1;
  let Icon = Zap;
  let iconColor = "text-emerald-400";
  let ringClass = "";
  // Simulated visual multiplier for hype (Logic typically: 1 + combo * factor)
  let multiplierValue = 1 + (comboCount * 0.1); 

  if (comboCount > 2) {
      intensityClass = "border-cyan-500/40 text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]";
      bgGradient = "bg-gradient-to-r from-cyan-950/90 to-transparent";
      scaleBase = 1.1;
      Icon = Flame;
      iconColor = "text-cyan-400";
      multiplierValue = 1.5 + (comboCount * 0.2);
  }
  if (comboCount > 5) {
      intensityClass = "border-fuchsia-500/60 text-fuchsia-400 shadow-[0_0_50px_rgba(232,121,249,0.5)]";
      bgGradient = "bg-gradient-to-r from-fuchsia-900/90 to-transparent";
      scaleBase = 1.25;
      Icon = Award;
      iconColor = "text-fuchsia-400";
      ringClass = "ring-2 ring-fuchsia-500/20";
      multiplierValue = 2.5 + (comboCount * 0.3);
  }
  if (comboCount > 9) {
      intensityClass = "border-yellow-500/80 text-yellow-400 shadow-[0_0_80px_rgba(234,179,8,0.6)]";
      bgGradient = "bg-gradient-to-r from-yellow-900/90 to-transparent";
      scaleBase = 1.4;
      Icon = Crown;
      iconColor = "text-yellow-400";
      ringClass = "ring-4 ring-yellow-500/30";
      multiplierValue = 5.0 + (comboCount * 0.5);
  }

  // Animation pop
  const scale = animate ? scaleBase * 1.15 : scaleBase;
  const translateX = animate ? '20px' : '0px';

  return (
    <div className="flex flex-col items-start gap-3 transition-all duration-300 pointer-events-none z-30 perspective-500 font-sans">
      {isBackToBack && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-r-full bg-yellow-500/20 border-l-4 border-yellow-500 text-[10px] font-black text-yellow-400 uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-[slideInLeft_0.3s_ease-out] backdrop-blur-md transform origin-left hover:scale-105 transition-transform">
          <ZapOff size={14} className="fill-current animate-[pulse_0.5s_ease-in-out_infinite]" /> 
          <span>Back-to-Back</span>
        </div>
      )}
      
      {comboCount >= 1 && (
        <div 
            className={`
                relative flex flex-col items-start justify-center pl-8 pr-16 py-4 rounded-r-3xl border-l-[6px] transition-all duration-300 ease-out
                ${intensityClass} ${bgGradient} ${ringClass} backdrop-blur-lg overflow-hidden
            `}
            style={{ 
                transform: `scale(${scale}) translateX(${translateX})`,
                transformOrigin: 'left center'
            }}
            role="status"
            aria-live="polite"
            aria-label={ariaLabel}
        >
          {/* Background Pulse Effect */}
          <div className="absolute inset-0 bg-white/10 opacity-0 animate-[pulse_0.2s_ease-in-out]" style={{ opacity: animate ? 0.3 : 0 }} />
          
          {/* CSS Particles for High Combo */}
          {comboCount > 5 && (
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bottom-0 w-1 h-1 bg-white rounded-full animate-ping"
                        style={{ 
                            left: `${Math.random() * 80 + 10}%`, 
                            animationDuration: `${0.6 + Math.random() * 0.4}s`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            opacity: 0.6
                        }} 
                    />
                ))}
             </div>
          )}

          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-80 flex items-center gap-2">
                     <span className="drop-shadow-sm">CHAIN</span>
                     {comboCount > 5 && <span className="px-1.5 py-0.5 bg-white/20 rounded text-[8px] animate-pulse shadow-sm">MAX</span>}
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[8px] font-mono text-white/90 border border-white/10 backdrop-blur-sm">
                      <TrendingUp size={8} />
                      <span>{multiplierValue.toFixed(1)}x</span>
                  </div>
              </div>
              
              <div className="flex items-baseline gap-1 font-black text-6xl leading-none italic tracking-tighter"
                   style={{ textShadow: `0 0 25px currentColor` }}>
                <span>{comboCount + 1}</span>
                <span className="text-3xl opacity-70 not-italic ml-1">x</span>
              </div>
          </div>

          {/* Large Background Icon */}
          <div className={`absolute -right-4 top-1/2 -translate-y-1/2 opacity-20 mix-blend-overlay rotate-12 transition-transform duration-300 ${animate ? 'scale-150' : 'scale-125'}`}>
              <Icon size={90} className={iconColor} />
          </div>
          
          {/* Scanline */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] opacity-20 pointer-events-none mix-blend-overlay"></div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ComboIndicator);

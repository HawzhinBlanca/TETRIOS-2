import React from 'react';

interface Props {
  comboCount: number;
  isBackToBack: boolean;
}

const ComboIndicator: React.FC<Props> = ({ comboCount, isBackToBack }) => {
  if (comboCount < 1 && !isBackToBack) return null;

  const ariaLabel: string = `Combo: ${comboCount + 1}. ${isBackToBack ? 'Back-to-Back bonus active.' : ''}`;

  return (
    <div
      className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-900/50 border border-emerald-700 transition-all duration-300 transform scale-100 hover:scale-105 shadow-md"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {isBackToBack && (
        <span className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-1 animate-pulse-green">
          B2B
        </span>
      )}
      {comboCount >= 1 && (
        <div className="flex items-baseline gap-1 font-black text-emerald-400 text-3xl">
          <span>{comboCount + 1}</span>
          <span className="text-xl">COMBO!</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(ComboIndicator);
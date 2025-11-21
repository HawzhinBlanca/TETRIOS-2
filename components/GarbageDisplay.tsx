import React from 'react';
import { STAGE_HEIGHT } from '../constants';

interface Props {
  garbagePending: number;
  flippedGravity: boolean; // New prop to indicate flipped gravity
}

const GarbageDisplay: React.FC<Props> = ({ garbagePending, flippedGravity }) => {
  if (garbagePending === 0) return null;

  const maxVisualLines: number = 5; 
  const displayLines: number = Math.min(garbagePending, maxVisualLines);

  const containerClasses = `flex flex-col items-center p-3 rounded-lg bg-red-900/50 border border-red-700 transition-all duration-300 transform scale-100 hover:scale-105 shadow-md animate-pulse-red ${flippedGravity ? 'order-first' : 'order-last'}`; // Position at top if flipped
  const lineContainerClasses = `flex items-center gap-1 ${flippedGravity ? 'flex-col' : 'flex-col-reverse'}`; // Reverse order if flipped

  return (
    <div 
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={`${garbagePending} garbage lines incoming!`}
    >
      <div className="text-xl font-black text-red-400 glow-text mb-2">
        GARBAGE IN
      </div>
      <div className={lineContainerClasses} aria-hidden="true">
        {[...Array(displayLines)].map((_, i) => (
          <div 
            key={i} 
            className="w-16 h-3 bg-red-600 border border-red-400 rounded-sm shadow-md"
            style={{ animationDelay: `${i * 0.05}s` }} 
          />
        ))}
        {garbagePending > maxVisualLines && (
            <div className="text-xs font-bold text-red-300 mt-1">
                +{garbagePending - maxVisualLines} more
            </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GarbageDisplay);

import React from 'react';
import { Palette, ArrowDown, Hammer } from 'lucide-react';
import { ABILITIES } from '../constants';
import { AbilityState } from '../types';
import { audioManager } from '../utils/audioManager';

interface Props {
    abilities: AbilityState[];
    onTrigger: (index: number) => void;
}

const IconMap: Record<string, React.ElementType> = {
    Palette, ArrowDown, Hammer
};

const AbilityHUD: React.FC<Props> = ({ abilities, onTrigger }) => {
    if (!abilities || abilities.length === 0) return null;

    return (
        <div className="flex gap-3 pointer-events-auto select-none">
            {abilities.map((ab, idx) => {
                const config = ABILITIES[ab.id];
                const Icon = IconMap[config.icon];
                const progress = ab.cooldownTimer > 0 ? ab.cooldownTimer / ab.totalCooldown : 0;
                const isReady = ab.cooldownTimer === 0;

                return (
                    <button
                        key={idx}
                        onClick={() => onTrigger(idx)}
                        onMouseEnter={() => isReady && audioManager.playUiHover()}
                        disabled={!isReady}
                        className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 group
                            ${isReady 
                                ? 'bg-black/60 border-white/20 hover:border-white hover:scale-110 shadow-lg' 
                                : 'bg-black/80 border-gray-800 opacity-60 cursor-not-allowed'
                            }
                        `}
                        style={{ borderColor: isReady ? config.color : undefined }}
                        aria-label={`Activate ${config.name} (Key ${idx + 1})`}
                    >
                        {/* Radial Cooldown Overlay */}
                        {progress > 0 && (
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle 
                                    cx="18" cy="18" r="16" 
                                    fill="none" 
                                    stroke="rgba(0,0,0,0.5)" 
                                    strokeWidth="36" 
                                />
                                <circle 
                                    cx="18" cy="18" r="16" 
                                    fill="none" 
                                    stroke={config.color} 
                                    strokeWidth="36" 
                                    strokeDasharray="100" 
                                    strokeDashoffset={100 - (100 * progress)}
                                    className="opacity-30"
                                />
                            </svg>
                        )}

                        <Icon size={20} className={`relative z-10 ${isReady ? 'text-white drop-shadow-md' : 'text-gray-500'}`} />
                        
                        {/* Key Hint */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 rounded-full border border-gray-600 flex items-center justify-center z-20">
                            <span className="text-[8px] font-bold text-gray-300">{idx + 1}</span>
                        </div>

                        {/* Ready Flash */}
                        {isReady && (
                            <div className="absolute inset-0 rounded-full bg-white/10 animate-ping pointer-events-none" style={{ animationDuration: '2s' }}></div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default React.memo(AbilityHUD);

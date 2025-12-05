
import React from 'react';
import { useGameContext } from '../contexts/GameContext';
import { ABILITIES } from '../constants';
import { AbilityType } from '../types';
import { audioManager } from '../utils/audioManager';
import { getIcon } from '../utils/icons';

const AbilitySlot: React.FC<{ 
    abilityId: AbilityType | null; 
    cooldown: number; 
    totalCooldown: number;
    isReady: boolean;
    hotkey: string;
    index: number;
    trigger: (index: number) => void;
}> = ({ abilityId, cooldown, totalCooldown, isReady, hotkey, index, trigger }) => {
    
    if (!abilityId) {
        return (
            <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center relative grayscale opacity-30">
                {React.createElement(getIcon('Lock'), { size: 16, className: "text-gray-500" })}
                <span className="absolute -bottom-2 -right-2 text-[10px] font-mono text-gray-600 bg-black px-1 rounded">{hotkey}</span>
            </div>
        );
    }

    const config = ABILITIES[abilityId];
    const Icon = getIcon(config.icon);
    
    // Calculate progress (0 to 1, where 1 is ready)
    const progress = totalCooldown > 0 ? 1 - (cooldown / totalCooldown) : 1;

    const handleClick = () => {
        if (isReady) {
            trigger(index);
        } else {
            audioManager.playUiBack();
        }
    };

    return (
        <button 
            onClick={handleClick}
            className={`
                relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all duration-200 group
                ${isReady 
                    ? 'bg-gray-800 border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-105 active:scale-95' 
                    : 'bg-black/40 border border-white/10 cursor-not-allowed'}
            `}
            style={{ 
                borderColor: isReady ? config.color : 'rgba(255,255,255,0.1)',
                boxShadow: isReady ? `0 0 15px ${config.color}40` : 'none'
            }}
        >
            {/* Background Fill for Cooldown (Vertical curtain) */}
            <div 
                className="absolute bottom-0 left-0 right-0 bg-white/10 transition-all duration-100 ease-linear z-0"
                style={{ height: `${progress * 100}%` }}
            />

            {/* Icon */}
            <div className={`relative z-10 transition-all ${isReady ? 'text-white drop-shadow-md' : 'text-gray-500 grayscale'}`}>
                <Icon size={24} />
            </div>

            {/* Hotkey Indicator */}
            <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-black border border-gray-700 flex items-center justify-center z-20">
                <span className="text-[10px] font-bold text-gray-400">{hotkey}</span>
            </div>

            {/* Flash Effect on Ready */}
            {isReady && (
                <div className="absolute inset-0 rounded-xl border-2 opacity-50 animate-pulse z-10" style={{ borderColor: config.color }}></div>
            )}
        </button>
    );
};

export const AbilityHUD: React.FC = () => {
    const { stats, touchControls } = useGameContext();
    
    // We rely on stats.abilities which is synchronized from the engine
    // If it's undefined (early render), fallback to empty array
    const abilities = stats.abilities || [];

    // Helper to trigger via the exposed touch controls which hook into the engine
    const handleTrigger = (index: number) => {
        if (index === 0) touchControls.triggerBombBooster(); // Reusing the slot logic if mapped, otherwise use direct key simulation or engine access
        
        // Since we are in React, we can dispatch the key event to simulate input
        const keys = ['1', '2', '3'];
        window.dispatchEvent(new KeyboardEvent('keydown', { key: keys[index] }));
    };

    return (
        // Removed container styling (bg/border) to integrate seamlessly into Command Deck
        <div className="flex gap-3 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {[0, 1, 2].map(i => {
                const abilityState = abilities[i];
                return (
                    <AbilitySlot 
                        key={i}
                        index={i}
                        abilityId={abilityState?.id || null}
                        cooldown={abilityState?.cooldownTimer || 0}
                        totalCooldown={abilityState?.totalCooldown || 1}
                        isReady={abilityState?.isReady || false}
                        hotkey={(i + 1).toString()}
                        trigger={handleTrigger}
                    />
                );
            })}
        </div>
    );
};

export default AbilityHUD;

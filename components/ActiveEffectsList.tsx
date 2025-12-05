
import React from 'react';
import EffectBar from './ui/EffectBar';
import { GameStats } from '../types';
import { FRENZY_DURATION_MS, OVERDRIVE_DURATION_MS } from '../constants';

interface Props {
    stats: GameStats;
    className?: string;
    itemClassName?: string;
}

const ActiveEffectsList: React.FC<Props> = ({ stats, className = '', itemClassName = '' }) => {
    const effects = [];
    
    if (stats.isOverdriveActive) {
        effects.push({ 
            label: 'OVERDRIVE', 
            progress: stats.overdriveTimer / OVERDRIVE_DURATION_MS, 
            color: 'text-orange-400', 
            barColor: 'bg-orange-500' 
        });
    }
    
    if (stats.isFrenzyActive) {
        effects.push({ 
            label: 'FRENZY', 
            progress: (stats.frenzyTimer || 0) / FRENZY_DURATION_MS, 
            color: 'text-yellow-400', 
            barColor: 'bg-yellow-500' 
        });
    }
    
    if (stats.slowTimeActive) {
        effects.push({ 
            label: 'SLOW TIME', 
            progress: (stats.slowTimeTimer || 0) / 30000, 
            color: 'text-indigo-400', 
            barColor: 'bg-indigo-500' 
        });
    }
    
    if (stats.flippedGravityActive) {
        effects.push({ 
            label: 'ANTI-GRAVITY', 
            progress: (stats.flippedGravityTimer || 0) / 15000, 
            color: 'text-blue-400', 
            barColor: 'bg-blue-500' 
        });
    }
    
    if (stats.scoreMultiplierActive) {
        effects.push({ 
            label: 'DOUBLE SCORE', 
            progress: (stats.scoreMultiplierTimer || 0) / 15000, 
            color: 'text-yellow-300', 
            barColor: 'bg-yellow-400' 
        });
    }
    
    if (stats.timeFreezeActive) {
        effects.push({ 
            label: 'TIME FREEZE', 
            progress: (stats.timeFreezeTimer || 0) / 10000, 
            color: 'text-cyan-200', 
            barColor: 'bg-cyan-200' 
        });
    }
    
    if (stats.isZoneActive) {
        effects.push({ 
            label: 'ZONE', 
            progress: stats.zoneTimer / 15000, 
            color: 'text-white', 
            barColor: 'bg-white' 
        }); 
    }

    if (effects.length === 0) return null;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {effects.map((eff, i) => (
                <EffectBar 
                    key={i}
                    label={eff.label}
                    progress={eff.progress}
                    colorClass={eff.color}
                    barColorClass={eff.barColor}
                    className={itemClassName}
                />
            ))}
        </div>
    );
};

export default ActiveEffectsList;

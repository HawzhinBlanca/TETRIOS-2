
import React from 'react';
import EffectBar from './ui/EffectBar';
import { GameStats } from '../types';
import { FRENZY_DURATION_MS, OVERDRIVE_DURATION_MS, FLIPPED_GRAVITY_BOOSTER_DURATION_MS, ZONE_DURATION_MS, SLOW_TIME_BOOSTER_DURATION_MS } from '../constants';

interface Props {
    stats: GameStats;
    className?: string;
    itemClassName?: string;
}

interface EffectConfig {
    key: keyof GameStats;
    timerKey: keyof GameStats;
    maxDuration: number;
    label: string;
    color: string;
    barColor: string;
}

const EFFECTS_CONFIG: EffectConfig[] = [
    { key: 'isOverdriveActive', timerKey: 'overdriveTimer', maxDuration: OVERDRIVE_DURATION_MS, label: 'OVERDRIVE', color: 'text-orange-400', barColor: 'bg-orange-500' },
    { key: 'isFrenzyActive', timerKey: 'frenzyTimer', maxDuration: FRENZY_DURATION_MS, label: 'FRENZY', color: 'text-yellow-400', barColor: 'bg-yellow-500' },
    { key: 'slowTimeActive', timerKey: 'slowTimeTimer', maxDuration: SLOW_TIME_BOOSTER_DURATION_MS, label: 'SLOW TIME', color: 'text-indigo-400', barColor: 'bg-indigo-500' },
    { key: 'flippedGravityActive', timerKey: 'flippedGravityTimer', maxDuration: FLIPPED_GRAVITY_BOOSTER_DURATION_MS, label: 'ANTI-GRAVITY', color: 'text-blue-400', barColor: 'bg-blue-500' },
    { key: 'scoreMultiplierActive', timerKey: 'scoreMultiplierTimer', maxDuration: 15000, label: 'DOUBLE SCORE', color: 'text-yellow-300', barColor: 'bg-yellow-400' },
    { key: 'timeFreezeActive', timerKey: 'timeFreezeTimer', maxDuration: 10000, label: 'TIME FREEZE', color: 'text-cyan-200', barColor: 'bg-cyan-200' },
    { key: 'isZoneActive', timerKey: 'zoneTimer', maxDuration: ZONE_DURATION_MS, label: 'ZONE', color: 'text-white', barColor: 'bg-white' },
];

const ActiveEffectsList: React.FC<Props> = ({ stats, className = '', itemClassName = '' }) => {
    // Filter active effects based on the configuration map
    const activeEffects = EFFECTS_CONFIG.filter(config => stats[config.key]);

    if (activeEffects.length === 0) return null;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {activeEffects.map((config) => {
                const timerValue = (stats[config.timerKey] as number) || 0;
                return (
                    <EffectBar 
                        key={config.label}
                        label={config.label}
                        progress={timerValue / config.maxDuration}
                        colorClass={config.color}
                        barColorClass={config.barColor}
                        className={itemClassName}
                    />
                );
            })}
        </div>
    );
};

export default ActiveEffectsList;

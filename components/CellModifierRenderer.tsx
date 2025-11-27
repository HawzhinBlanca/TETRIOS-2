
import React from 'react';
import { CellModifier, CellModifierType } from '../types';
import { useModifierStyle } from '../hooks/useModifierStyle';
import { Bomb, Lock, Unlock } from 'lucide-react';
import { ICE_PATTERN_SVG } from '../constants';

// --- Sub-Components for Specific Modifiers ---

const BombView: React.FC<{ modifier: CellModifier; isClearing?: boolean }> = ({ modifier, isClearing }) => {
    const isCritical = (modifier.timer || 0) <= 3;
    return (
        <div className="flex items-center justify-center relative z-10 w-full h-full">
            <Bomb size={isCritical ? 14 : 10} className={`absolute transition-all duration-300 ${isClearing ? 'text-green-900 opacity-20' : (isCritical ? '-top-2 -left-2 text-white opacity-80' : '-top-2 -left-2 text-red-950 opacity-50')}`} />
            <span 
                key={modifier.timer} 
                className={`
                    font-mono font-black rounded px-1.5 py-0.5 shadow-sm leading-none backdrop-blur-sm relative z-20
                    transition-all duration-200
                    ${isClearing 
                        ? 'bg-white/20 text-white text-[14px] drop-shadow-md scale-125' 
                        : (isCritical ? 'bg-white text-red-600 text-[11px] scale-110' : 'bg-black/60 text-white text-[10px]')
                    }
                    ${!isClearing && 'animate-[pop-rotate_0.2s_ease-out_backwards]'}
                `}
            >
                {modifier.timer}
            </span>
        </div>
    );
};

const IceView: React.FC = () => (
    <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url('${ICE_PATTERN_SVG}')` }}></div>
        <Lock size={14} strokeWidth={3} className="text-cyan-50 relative z-10 drop-shadow-lg" />
        <div className="absolute bottom-0.5 right-0.5 text-[7px] font-black text-cyan-100 opacity-80 tracking-tighter">FROZEN</div>
    </div>
);

const CrackedIceView: React.FC = () => (
    <div className="flex items-center justify-center w-full h-full relative overflow-hidden group">
        <Unlock size={14} strokeWidth={2.5} className="text-cyan-200/80 animate-bounce" />
        <div className="absolute inset-0 bg-cyan-400/10 mix-blend-overlay" />
        <div className="absolute top-0.5 left-0.5 text-[7px] font-mono text-cyan-300/90 rotate-[-15deg] font-bold shadow-black drop-shadow-sm">CRACKED</div>
    </div>
);

const MultiplierView: React.FC<{ isClearing?: boolean }> = ({ isClearing }) => (
    <div className="flex items-center justify-center w-full h-full">
        <span className={`font-black font-mono italic text-yellow-100 drop-shadow-md ${isClearing ? 'scale-150' : 'scale-100'} transition-transform`}>2x</span>
    </div>
);

// --- Mapping System ---

const COMPONENT_MAP: Partial<Record<CellModifierType, React.FC<any>>> = {
    BOMB: BombView,
    ICE: IceView,
    CRACKED_ICE: CrackedIceView,
    MULTIPLIER_BLOCK: MultiplierView,
};

interface Props {
    modifier: CellModifier;
    isClearing?: boolean;
    color?: string;
}

const CellModifierRenderer: React.FC<Props> = ({ modifier, isClearing, color }) => {
    const visual = useModifierStyle(modifier, isClearing, color);
    
    if (!visual) return null;

    const { config, className, style, Icon, iconClass } = visual;
    
    // Determine which component to render
    const SpecificComponent = COMPONENT_MAP[modifier.type];

    return (
        <div 
            className={`w-full h-full relative transition-all duration-75 rounded-[2px] flex items-center justify-center overflow-hidden ${className}`}
            style={style}
        >
            {SpecificComponent ? (
                <SpecificComponent modifier={modifier} isClearing={isClearing} />
            ) : (
                Icon && <Icon size={14} className={iconClass} fill="currentColor" />
            )}
            
            {/* Global Gloss Overlay for all modifiers */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </div>
    );
};

export default React.memo(CellModifierRenderer);


import React from 'react';
import { AdventureLevelConfig, BoosterType } from '../../types';
import { BOOSTERS } from '../../constants';
import { Bomb, Clock, RotateCcw, Sparkles, ArrowDownUp } from 'lucide-react';
import { useAdventureStore } from '../../stores/adventureStore';
import { audioManager } from '../../utils/audioManager';

interface BoosterSelectionModalProps {
    onStartGame: (config: AdventureLevelConfig, assistRows: number, activeBoosters: BoosterType[]) => void;
    onBack: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    currentLevelConfig?: AdventureLevelConfig;
    ownedBoosters: Record<BoosterType, number>;
    activeBoosters: BoosterType[];
    toggleActiveBooster: (type: BoosterType) => void;
    coins: number;
}

export const BoosterSelectionModal: React.FC<BoosterSelectionModalProps> = ({
    onStartGame, onBack, handleUiHover, handleUiClick,
    currentLevelConfig, ownedBoosters, activeBoosters, toggleActiveBooster, coins
}) => {
    const { getFailedAttempts } = useAdventureStore();
    const failedAttempts = getFailedAttempts(currentLevelConfig?.id || '');
    const assistRows = failedAttempts >= 3 ? 1 : 0;

    const IconComponent = (type: BoosterType) => {
        switch(type) {
            case 'BOMB_BOOSTER': return <Bomb size={24} />;
            case 'SLOW_TIME_BOOSTER': return <Clock size={24} />;
            case 'PIECE_SWAP_BOOSTER': return <RotateCcw size={24} />;
            case 'LINE_CLEARER_BOOSTER': return <Sparkles size={24} />;
            case 'FLIPPED_GRAVITY_BOOSTER': return <ArrowDownUp size={24} />; 
            default: return null;
        }
    }

    if (!currentLevelConfig) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#050810] border border-gray-800 w-full max-w-2xl shadow-[0_0_100px_rgba(6,182,212,0.15)] rounded-lg p-8 text-center relative">
                <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Pre-Game Boosters</h2>
                <p className="text-gray-400 text-sm mb-8">Select boosters for: <span className="text-cyan-400 font-bold">{currentLevelConfig.title}</span></p>

                <div className="flex justify-center items-center gap-2 mb-8 text-xl font-bold text-yellow-300">
                    <span className="text-gray-500 mr-2 text-sm uppercase">Your Coins:</span> {coins} 🪙
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    {Object.values(BOOSTERS).map(booster => {
                        const count = ownedBoosters[booster.type] || 0;
                        const isActive = activeBoosters.includes(booster.type);
                        const canActivate = count > 0;

                        return (
                            <button
                                key={booster.type}
                                onClick={() => { if (canActivate) { handleUiClick(); toggleActiveBooster(booster.type); } else { audioManager.playUiBack(); }}}
                                onMouseEnter={handleUiHover}
                                className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-all duration-200
                                    ${isActive ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]' :
                                    canActivate ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-white' :
                                    'bg-gray-900/30 border-gray-800 text-gray-600 cursor-not-allowed opacity-60'}
                                `}
                                disabled={!canActivate && !isActive} 
                            >
                                <div className={`text-3xl mb-2 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                                    {IconComponent(booster.type)}
                                </div>
                                <span className="font-bold text-lg">{booster.name}</span>
                                <span className="text-sm text-gray-400">{booster.description}</span>
                                <div className="mt-2 text-sm font-mono flex items-center gap-1">
                                    Owned: <span className="font-bold">{count}</span>
                                    {booster.cost && <span className="ml-2 text-yellow-300">{booster.cost} 🪙</span>}
                                </div>
                                {isActive && <span className="text-xs text-cyan-400 mt-1 uppercase font-bold">ACTIVE</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-center gap-4 mt-8">
                    <button
                        onClick={() => { handleUiClick(); onBack(); }}
                        onMouseEnter={handleUiHover}
                        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold uppercase tracking-widest rounded transition-colors"
                    >
                        Back to Map
                    </button>
                    <button
                        onClick={() => { handleUiClick(); onStartGame(currentLevelConfig, assistRows, activeBoosters); }}
                        onMouseEnter={handleUiHover}
                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded transition-colors"
                    >
                        Start Mission
                    </button>
                </div>
            </div>
        </div>
    );
};

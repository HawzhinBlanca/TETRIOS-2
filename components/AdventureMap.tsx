import React, { useRef, useEffect } from 'react';
import { ADVENTURE_CAMPAIGN } from '../constants';
import { useAdventureStore } from '../stores/adventureStore';
import { Lock, CheckCircle, Star, MapPin, Coins } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface Props {
    onSelectLevel: (levelId: string) => void;
    onBack: () => void;
    coins: number; // New prop for player's coins
    getStarsEarned: (levelId: string) => number; // New prop for getting stars earned
}

const AdventureMap: React.FC<Props> = ({ onSelectLevel, onBack, coins, getStarsEarned }) => {
    const { unlockedIndex } = useAdventureStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest unlocked level
    useEffect(() => {
        if (scrollRef.current) {
             const latest = document.getElementById(`node-${unlockedIndex}`);
             if(latest) {
                 latest.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
             }
        }
    }, [unlockedIndex]);

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h1 className="text-3xl font-black italic text-white tracking-tighter">CAMPAIGN MAP</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Select your mission</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 text-xl font-bold text-yellow-300">
                        <Coins size={20} className="text-yellow-400" /> {coins}
                    </div>
                    <button 
                        onClick={() => { audioManager.playUiClick(); onBack(); }}
                        onMouseEnter={() => audioManager.playUiHover()}
                        className="px-6 py-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white text-sm font-bold uppercase tracking-widest transition-colors"
                        aria-label="Exit Adventure Map and return to Main Menu"
                    >
                        Exit Map
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative flex items-center px-20 gap-24">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle_at_center,rgba(22,30,50,0.8)_1px,transparent_1px)', backgroundSize: '40px 40px' }}></div>
                
                {ADVENTURE_CAMPAIGN.map((world, wIndex) => (
                    <div key={world.id} className="relative flex items-center gap-16 shrink-0 p-10 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm">
                        <div className="absolute -top-6 left-10 bg-black/80 px-4 py-1 border border-gray-700 rounded-full text-xs font-bold uppercase tracking-widest text-gray-300 shadow-xl">
                            {world.name}
                        </div>
                        
                        {world.levels.map((level, lIndex) => {
                            const isUnlocked = level.index <= unlockedIndex;
                            const stars = getStarsEarned(level.id);
                            const isCompleted = stars > 0;
                            const isBoss = level.objective.type === 'BOSS';

                            return (
                                <div key={level.id} className="relative group">
                                    {/* Connector Line */}
                                    {lIndex > 0 && (
                                        <div className={`absolute top-1/2 -left-16 w-16 h-1 -translate-y-1/2 transition-colors ${isUnlocked ? 'bg-cyan-500/50 shadow-[0_0_10px_cyan]' : 'bg-gray-800'}`}></div>
                                    )}

                                    <button
                                        id={`node-${level.index}`}
                                        onClick={() => {
                                            if (isUnlocked) {
                                                audioManager.playUiSelect();
                                                onSelectLevel(level.id);
                                            } else {
                                                audioManager.playUiClick(); // Error sound ideally
                                            }
                                        }}
                                        disabled={!isUnlocked}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10
                                            ${isCompleted ? 'bg-cyan-900 border-cyan-500 text-cyan-400' : 
                                              isUnlocked ? 'bg-gray-800 border-white text-white hover:scale-110 hover:shadow-[0_0_20px_white]' : 
                                              'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed grayscale'}
                                            ${isBoss ? 'w-24 h-24 border-4' : ''}
                                        `}
                                    >
                                        {isCompleted ? <CheckCircle size={isBoss ? 32 : 20} /> : 
                                         !isUnlocked ? <Lock size={isBoss ? 32 : 20} /> :
                                         isBoss ? <Star size={32} className="animate-pulse" /> : 
                                         <div className="font-mono font-bold">{level.index + 1}</div>
                                        }
                                        
                                        {/* Stars Earned */}
                                        {stars > 0 && (
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5" aria-label={`${stars} stars earned`}>
                                                {[...Array(stars)].map((_, i) => (
                                                    <Star key={i} size={12} fill="gold" stroke="gold" className="text-yellow-400" />
                                                ))}
                                            </div>
                                        )}

                                        {/* Current Level Indicator */}
                                        {isUnlocked && !isCompleted && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                <MapPin className="text-yellow-500 animate-bounce" fill="currentColor" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Level Tooltip */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-40 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                        <div className="bg-black/90 border border-gray-700 p-3 rounded-lg shadow-xl">
                                            <div className="text-xs font-bold text-white uppercase tracking-wide mb-1">{level.title}</div>
                                            <div className="text-[10px] text-gray-400">{level.description}</div>
                                            {isBoss && <div className="text-[9px] text-red-400 font-bold mt-1 uppercase">Boss Level</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                
                <div className="text-gray-600 text-xs uppercase tracking-widest shrink-0 pr-20">
                    More worlds coming soon...
                </div>
            </div>
        </div>
    );
};

export default AdventureMap;
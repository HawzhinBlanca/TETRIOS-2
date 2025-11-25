
import React, { useRef, useEffect, useMemo } from 'react';
import { ADVENTURE_CAMPAIGN } from '../constants';
import { useAdventureStore } from '../stores/adventureStore';
import { Lock, CheckCircle, Star, MapPin, Coins, ArrowUp, Hexagon, Snowflake, Flame, Cloud, Zap, Triangle } from 'lucide-react';
import { audioManager } from '../utils/audioManager';
import { AdventureWorld, AdventureLevelConfig } from '../types';

interface Props {
    onSelectLevel: (levelId: string) => void;
    onBack: () => void;
    coins: number;
    getStarsEarned: (levelId: string) => number;
}

const getWorldThemeIcons = (worldId: string) => {
    if (worldId === 'world_2') return [Snowflake, Cloud];
    if (worldId === 'world_3') return [Flame, Triangle];
    return [Hexagon, Zap]; // Default / Neon
};

const WorldSection: React.FC<{ 
    world: AdventureWorld, 
    levels: AdventureLevelConfig[], 
    unlockedIndex: number,
    getStars: (id: string) => number,
    onSelect: (id: string) => void,
    isNextWorldLocked: boolean,
    isLastWorld: boolean
}> = ({ world, levels, unlockedIndex, getStars, onSelect, isNextWorldLocked, isLastWorld }) => {
    
    // Calculate SVG path for connecting nodes
    const pathD = useMemo(() => {
        if (levels.length < 1) return '';
        let d = '';
        
        // Sort levels by index to ensure correct path order
        const sortedLevels = [...levels].sort((a, b) => a.index - b.index);

        sortedLevels.forEach((lvl, i) => {
            const x = lvl.mapCoordinates?.x || 50;
            // SVG Y coordinate (0 is top, 100 is bottom). CSS bottom % is inverted.
            // We map 0% bottom -> 100 SVG Y. 100% bottom -> 0 SVG Y.
            const y = 100 - (lvl.mapCoordinates?.y || (i * 20 + 10)); 
            
            if (i === 0) {
                d += `M ${x} ${y}`;
            } else {
                const prevLvl = sortedLevels[i - 1];
                const prevX = prevLvl.mapCoordinates?.x || 50;
                const prevY = 100 - (prevLvl.mapCoordinates?.y || 0);
                
                // Cubic Bezier for smooth curves
                const cp1x = prevX;
                const cp1y = (prevY + y) / 2;
                const cp2x = x;
                const cp2y = (prevY + y) / 2;
                
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
            }
        });
        
        // Add connector to next world if not last
        if (!isLastWorld) {
            const lastLvl = sortedLevels[sortedLevels.length - 1];
            const lastX = lastLvl.mapCoordinates?.x || 50;
            const lastY = 100 - (lastLvl.mapCoordinates?.y || 0);
            // Curve upwards to center top
            d += ` C ${lastX} ${lastY - 20}, 50 ${lastY - 20}, 50 0`;
        }

        return d;
    }, [levels, isLastWorld]);

    // Generate random background decorations
    const decorations = useMemo(() => {
        const Icons = getWorldThemeIcons(world.id);
        return Array.from({ length: 12 }).map((_, i) => {
            const Icon = Icons[i % Icons.length];
            return {
                id: i,
                Icon,
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * 90 + 5}%`,
                size: 12 + Math.random() * 24,
                opacity: 0.05 + Math.random() * 0.1,
                animationDuration: `${4 + Math.random() * 6}s`,
                animationDelay: `${Math.random() * 5}s`
            };
        });
    }, [world.id]);

    return (
        <div className="relative w-full md:w-[600px] flex-shrink-0 mb-24" style={{ height: '800px' }}>
            {/* World Label */}
            <div className="absolute top-[30%] -left-4 md:-left-24 -rotate-90 origin-center">
                <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent uppercase tracking-widest pointer-events-none whitespace-nowrap select-none">
                    {world.name}
                </h2>
            </div>

            {/* Background & Theme */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/5 shadow-2xl" style={{ background: world.backgroundGradient }}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40"></div>
                
                {/* Decorations */}
                {decorations.map((d) => (
                    <div 
                        key={d.id}
                        className="absolute animate-pulse"
                        style={{
                            left: d.left,
                            top: d.top,
                            opacity: d.opacity,
                            animationDuration: d.animationDuration,
                            animationDelay: d.animationDelay
                        }}
                    >
                        <d.Icon size={d.size} className="text-white" />
                    </div>
                ))}
            </div>

            {/* Connection Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Shadow Path */}
                <path d={pathD} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" />
                {/* Main Path */}
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke={world.themeColor} 
                    strokeWidth="0.8" 
                    strokeDasharray="3 2" 
                    className="opacity-60 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
                >
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="50s" repeatCount="indefinite" />
                </path>
            </svg>

            {/* Nodes */}
            {levels.map((level) => {
                const isUnlocked = level.index <= unlockedIndex;
                const stars = getStars(level.id);
                const isCompleted = stars > 0;
                const isBoss = level.objective.type === 'BOSS';
                const isNext = level.index === unlockedIndex;
                
                const bottomPos = level.mapCoordinates?.y || 0;
                const leftPos = level.mapCoordinates?.x || 50;

                return (
                    <div 
                        key={level.id} 
                        className="absolute transform -translate-x-1/2 translate-y-1/2 z-10 group"
                        style={{ bottom: `${bottomPos}%`, left: `${leftPos}%` }}
                    >
                        {/* Node Ripple for Next Level */}
                        {isNext && (
                            <div className="absolute inset-0 -m-4 bg-white/10 rounded-full animate-ping pointer-events-none"></div>
                        )}

                        <button
                            id={`node-${level.index}`}
                            onClick={() => {
                                if (isUnlocked) {
                                    audioManager.playUiSelect();
                                    onSelect(level.id);
                                } else {
                                    audioManager.playUiClick(); // Locked sound
                                }
                            }}
                            disabled={!isUnlocked}
                            className={`relative flex items-center justify-center transition-all duration-300 
                                ${isBoss ? 'w-20 h-20 md:w-24 md:h-24' : 'w-14 h-14 md:w-16 md:h-16'}
                                ${isUnlocked ? 'hover:scale-110 hover:-translate-y-1 cursor-pointer' : 'cursor-not-allowed opacity-40 grayscale'}
                            `}
                        >
                            {/* Node Body */}
                            <div className={`absolute inset-0 rounded-full border-4 shadow-xl transition-colors duration-300
                                ${isCompleted ? 'bg-gray-900 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 
                                  isNext ? 'bg-white border-white shadow-[0_0_25px_rgba(255,255,255,0.6)] animate-pulse' : 
                                  isUnlocked ? `bg-gray-800 border-${isBoss ? 'red-500' : 'gray-500'}` : 
                                  'bg-black border-gray-800'}
                            `}></div>
                            
                            {/* Icon Content */}
                            <div className="relative z-10 drop-shadow-md">
                                {isCompleted ? <CheckCircle size={isBoss ? 32 : 24} className="text-green-400" strokeWidth={3} /> :
                                 !isUnlocked ? <Lock size={isBoss ? 24 : 18} className="text-gray-600" /> :
                                 isBoss ? <Star size={36} className="text-red-500 animate-[spin_10s_linear_infinite]" fill="currentColor" /> :
                                 <span className={`font-mono font-black ${isNext ? 'text-black text-2xl' : 'text-white text-xl'}`}>{level.index + 1}</span>
                                }
                            </div>

                            {/* Player Marker (You are Here) */}
                            {isNext && !isCompleted && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce filter drop-shadow-lg z-20">
                                    <MapPin size={42} className="text-cyan-400 fill-cyan-950" strokeWidth={2.5} />
                                </div>
                            )}

                            {/* Stars Display */}
                            {stars > 0 && (
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5 bg-black/90 px-2 py-1 rounded-full border border-white/10 shadow-lg min-w-max">
                                    {[...Array(3)].map((_, i) => (
                                        <Star key={i} size={10} fill={i < stars ? "gold" : "gray"} className={i < stars ? "text-yellow-400" : "text-gray-800"} strokeWidth={0} />
                                    ))}
                                </div>
                            )}

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-black/90 border border-gray-700 p-3 rounded-xl text-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-90 group-hover:scale-100 z-50 shadow-2xl backdrop-blur-md translate-y-2 group-hover:translate-y-0">
                                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isBoss ? 'text-red-400' : 'text-cyan-400'}`}>{level.title}</div>
                                <div className="text-[10px] text-gray-400 leading-tight font-medium">{level.description}</div>
                                <div className="mt-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-700 absolute left-1/2 -translate-x-1/2 top-full"></div>
                            </div>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const AdventureMap: React.FC<Props> = ({ onSelectLevel, onBack, coins, getStarsEarned }) => {
    const { unlockedIndex } = useAdventureStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to current level
    useEffect(() => {
        if (scrollRef.current) {
             const latestNode = document.getElementById(`node-${unlockedIndex}`);
             // Fallback to finding the last unlocked node if current is not rendered (e.g. next world locked)
             const targetNode = latestNode || document.getElementById(`node-${unlockedIndex - 1}`);
             
             if(targetNode) {
                 setTimeout(() => {
                     targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }, 100);
             } else {
                 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
             }
        }
    }, [unlockedIndex]);

    return (
        <div className="fixed inset-0 z-50 bg-[#030712] flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header Bar */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/60 to-transparent z-30 pointer-events-none"></div>
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-40 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">SAGA MAP</h1>
                    <div className="flex items-center gap-2 mt-2 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 w-fit backdrop-blur-md shadow-lg hover:border-yellow-500/30 transition-colors cursor-default">
                        <Coins size={16} className="text-yellow-400" /> 
                        <span className="text-yellow-300 font-bold font-mono text-lg tabular-nums">{coins.toLocaleString()}</span>
                    </div>
                </div>
                <button 
                    onClick={() => { audioManager.playUiBack(); onBack(); }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-full text-white text-xs font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                >
                    <span className="group-hover:mr-1 transition-all">Main Menu</span>
                </button>
            </div>

            {/* Scroll Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative pb-32 pt-32 scroll-smooth">
                {/* Global Background Noise */}
                <div className="fixed inset-0 opacity-30 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black"></div>
                
                <div className="flex flex-col-reverse items-center min-h-full justify-start relative z-10 pb-20">
                    {/* Start Marker */}
                    <div className="flex flex-col items-center opacity-40 mt-10 mb-20 grayscale">
                        <div className="w-0.5 h-24 bg-gradient-to-t from-transparent via-white/50 to-transparent"></div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-white font-bold mt-2">Simulation Start</div>
                    </div>

                    {/* Worlds */}
                    {ADVENTURE_CAMPAIGN.map((world, i) => (
                        <WorldSection 
                            key={world.id}
                            world={world}
                            levels={world.levels}
                            unlockedIndex={unlockedIndex}
                            getStars={getStarsEarned}
                            onSelect={onSelectLevel}
                            isNextWorldLocked={false} 
                            isLastWorld={i === ADVENTURE_CAMPAIGN.length - 1}
                        />
                    ))}
                    
                    {/* "To Be Continued" Marker */}
                    <div className="flex flex-col items-center mb-32 opacity-60">
                        <ArrowUp className="text-cyan-500 animate-bounce mb-2" />
                        <div className="text-xs uppercase tracking-widest text-cyan-500 font-bold animate-pulse">To Be Continued...</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AdventureMap);

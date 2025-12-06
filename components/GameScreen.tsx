
import React, { useEffect, useState, useMemo } from 'react';
import BoardCanvas from './BoardCanvas';
import Preview from './Preview';
import ComboIndicator from './ComboIndicator';
import GarbageDisplay from './GarbageDisplay';
import RhythmIndicator from './RhythmIndicator'; 
import AbilityHUD from './AbilityHUD';
import { Settings as SettingsIcon, Pause, RefreshCw } from 'lucide-react';
import { BoardRenderConfig, AdventureLevelConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useEffectStore } from '../stores/effectStore';
import { BoardRenderer } from '../utils/BoardRenderer'; 
import { Value } from './ui/Text';
import { audioManager } from '../utils/audioManager';
import { useUIRecoil } from '../hooks/useUIRecoil';
import { useBoosterStore } from '../stores/boosterStore';
import { formatTime } from '../utils/formatters';
import { useUpdateFlash } from '../hooks/useUpdateFlash';
import ActiveEffectsList from './ActiveEffectsList';

interface GameScreenProps {
    boardRenderCoreConfig: Omit<BoardRenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>;
    isMuted: boolean;
    toggleMute: () => void;
    showAi: boolean;
    toggleShowAi: () => void;
    openSettings: () => void;
    adventureLevelConfig?: AdventureLevelConfig;
    cellSize: number;
    isPaused?: boolean;
    rendererRef?: React.MutableRefObject<BoardRenderer | null>; 
}

const A11yAnnouncer = ({ lastEvent }: { lastEvent: string | null }) => {
    return (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {lastEvent}
        </div>
    );
};

export const GameScreen: React.FC<GameScreenProps> = ({
    boardRenderCoreConfig,
    openSettings,
    rendererRef,
}) => {
    const {
        engine,
        stats,
        nextQueue,
        heldPiece,
        canHold,
        lastHoldTime,
        comboCount,
        isBackToBack,
        garbagePending,
        flippedGravity,
        isSelectingBombRows,
        selectedLineToClear,
        setGameState,
        touchControls
    } = useGameContext();

    const { visualEffect } = useEffectStore();
    const { activeBoosters } = useBoosterStore();
    const hasHoldPlus = activeBoosters.includes('PIECE_SWAP_BOOSTER');
    
    const hudRecoil = useUIRecoil(8, 0.5, 0.7);
    const holdFlash = useUpdateFlash(lastHoldTime);
    const [announcement, setAnnouncement] = useState<string | null>(null);

    useEffect(() => {
        if (visualEffect?.type === 'FRENZY_START') setAnnouncement("Frenzy Mode Activated!");
        else if (stats.score > 0 && stats.score % 1000 === 0) setAnnouncement(`Score ${stats.score}`);
    }, [visualEffect, stats.score]);

    const bombSelectionRows = useMemo(() => isSelectingBombRows ? [] : undefined, [isSelectingBombRows]);

    const handleMobilePause = () => {
        audioManager.playUiClick();
        setGameState('PAUSED');
    };

    const handleMobileHold = () => {
        if(canHold) {
            audioManager.playUiClick();
            touchControls.hold();
        }
    };

    const boardContainerStyle = visualEffect?.type === 'ABERRATION' ? { animation: 'deep-fry 0.2s linear' } : {};

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#030712] select-none overflow-hidden">
            <A11yAnnouncer lastEvent={announcement} />
            
            {/* --- TOP HUD (Dynamic Island Style) --- */}
            <div 
                className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-[max(env(safe-area-inset-top),16px)] pointer-events-none"
                style={{ transform: hudRecoil }}
            >
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-5 shadow-2xl pointer-events-auto transition-all duration-300 hover:bg-black/80">
                    
                    {/* Pause */}
                    <button onClick={handleMobilePause} className="text-white/70 hover:text-white transition-colors p-1">
                        <Pause size={16} />
                    </button>

                    {/* Stats */}
                    <div className="flex flex-col items-center min-w-[100px]">
                        <Value size="2xl" glow className="leading-none text-white tracking-tighter">
                            {stats.score.toLocaleString()}
                        </Value>
                        <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mt-1">
                            <span className="text-cyan-400">LVL {stats.level}</span>
                            <span className="w-px h-2 bg-white/10"></span>
                            <span>{formatTime(stats.time, false)}</span>
                        </div>
                    </div>

                    {/* Settings */}
                    <button onClick={openSettings} className="text-white/70 hover:text-white transition-colors p-1">
                        <SettingsIcon size={16} />
                    </button>
                </div>
            </div>

            {/* --- FLOATING WIDGETS (Hold / Next) --- */}
            {/* Positioned comfortably below header but kept to edges to avoid spawn area */}
            <div className="absolute top-[max(env(safe-area-inset-top),20px)] mt-16 w-full max-w-[600px] px-4 flex justify-between pointer-events-none z-40" style={{ transform: hudRecoil }}>
                
                {/* Hold Widget */}
                <div className="pointer-events-auto">
                    <button 
                        onClick={handleMobileHold}
                        disabled={!canHold}
                        className={`
                            w-28 h-28 rounded-3xl backdrop-blur-xl shadow-2xl border-2
                            flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300
                            ${!canHold 
                                ? 'bg-red-950/20 border-red-500/30 grayscale-[0.3]' 
                                : 'bg-black/40 border-white/10 hover:border-white/30 active:scale-95'
                            }
                            ${holdFlash ? 'animate-[pulse_0.3s_ease-in-out] ring-4 ring-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.5)] !bg-yellow-500/20 scale-105 !border-yellow-400' : ''}
                        `}
                    >
                        <span className={`absolute top-2 left-3 text-[10px] font-black uppercase tracking-widest ${!canHold ? 'text-red-400' : 'text-white/40'}`}>
                            {!canHold ? 'LOCKED' : 'HOLD'}
                        </span>
                        
                        <div className="flex-1 flex items-center justify-center p-2 w-full h-full">
                            {heldPiece ? (
                                <Preview title="" type={heldPiece} variant="default" className="origin-center scale-110" isLocked={!canHold} />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-white/10 animate-pulse"></div>
                            )}
                        </div>
                        
                        {/* Status Light */}
                        <div className={`absolute bottom-0 left-0 right-0 h-1 transition-colors ${!canHold ? 'bg-red-500/50' : (holdFlash ? 'bg-yellow-400' : 'bg-transparent')}`}></div>

                        {hasHoldPlus && <div className="absolute top-2 right-2 text-purple-400 animate-spin-slow"><RefreshCw size={14} /></div>}
                    </button>
                </div>

                {/* Next Widget */}
                <div className="flex flex-col gap-2 pointer-events-auto items-end">
                    {/* Primary Next */}
                    <div className="w-28 h-28 bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col relative overflow-hidden">
                        <span className="absolute top-2 right-3 text-[10px] font-black text-white/40 uppercase tracking-widest">Next</span>
                        <div className="flex-1 flex items-center justify-center p-2 w-full h-full">
                            {nextQueue.length > 0 ? (
                                <Preview title="" type={nextQueue[0]} variant="default" className="origin-center scale-110" />
                            ) : (
                                <div className="animate-pulse w-2 h-2 bg-white/10 rounded-full"></div>
                            )}
                        </div>
                    </div>
                    
                    {/* Secondary Queue (Mini) */}
                    <div className="flex flex-col gap-1.5 opacity-80 mr-1">
                        {nextQueue.slice(1, 3).map((type, i) => (
                            <div key={i} className="w-12 h-9 bg-black/30 border border-white/5 rounded-md flex items-center justify-center backdrop-blur-md">
                                <Preview title="" type={type} variant="small" className="scale-[0.65]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CENTER STAGE --- */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full" style={boardContainerStyle}>
                
                {/* Floating Notifications Layer */}
                <div className="absolute top-[20%] left-0 right-0 flex flex-col items-center pointer-events-none z-50">
                    <ComboIndicator comboCount={comboCount} isBackToBack={isBackToBack} />
                    <div className="mt-2 scale-75 origin-top opacity-90">
                        <GarbageDisplay garbagePending={garbagePending} flippedGravity={flippedGravity} />
                    </div>
                </div>

                {/* Main Board */}
                <BoardCanvas 
                    engine={engine}
                    renderConfig={boardRenderCoreConfig}
                    bombSelectionRows={bombSelectionRows}
                    lineClearerSelectedRow={selectedLineToClear}
                    rendererRef={rendererRef}
                    className="shadow-2xl shadow-black/90" 
                />
            </div>

            {/* --- BOTTOM HUD (Rhythm & Abilities) --- */}
            <div className="absolute bottom-[110px] left-0 right-0 flex flex-col items-center pointer-events-none z-20 pb-[env(safe-area-inset-bottom)]">
                <div className="scale-75 opacity-60 mb-2">
                    <RhythmIndicator />
                </div>
                <div className="pointer-events-auto scale-90">
                    <AbilityHUD />
                </div>
            </div>
            
            {/* Zone Overlay */}
            <div className={`fixed inset-0 pointer-events-none z-[60] transition-opacity duration-500 mix-blend-overlay ${stats.isZoneActive ? 'opacity-100' : 'opacity-0'}`}
                 style={{ 
                     background: 'radial-gradient(circle, transparent 40%, rgba(255,255,255,0.15) 100%)',
                     boxShadow: 'inset 0 0 50px rgba(0,255,255,0.3)' 
                 }}>
            </div>
        </div>
    );
};

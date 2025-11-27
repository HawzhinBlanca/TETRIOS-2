
import React, { useRef, useEffect, useState, useMemo } from 'react';
import BoardCanvas from './BoardCanvas';
import Preview from './Preview';
import StatsPanel from './StatsPanel';
import ComboIndicator from './ComboIndicator';
import GarbageDisplay from './GarbageDisplay';
import RhythmIndicator from './RhythmIndicator'; 
import { Settings as SettingsIcon, Brain, Pause, ArrowLeftRight } from 'lucide-react';
import { BoardRenderConfig, AdventureLevelConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useEffectStore } from '../stores/effectStore';
import { ADVENTURE_CAMPAIGN } from '../constants';
import { BoardRenderer } from '../utils/BoardRenderer'; 
import GlassPanel from './ui/GlassPanel';
import { Label } from './ui/Text';
import PanelHeader from './ui/PanelHeader';
import { audioManager } from '../utils/audioManager';

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
    showAi,
    toggleShowAi,
    openSettings,
    adventureLevelConfig,
    rendererRef
}) => {
    const {
        engine,
        stats,
        nextQueue,
        heldPiece,
        canHold,
        gameMode,
        difficulty,
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
    
    const currentWorld = useMemo(() => {
        if (!adventureLevelConfig) return null;
        return ADVENTURE_CAMPAIGN.find(w => w.id === adventureLevelConfig.worldId);
    }, [adventureLevelConfig]);

    const [announcement, setAnnouncement] = useState<string | null>(null);
    const scoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (engine.current) {
            engine.current.events.on('FAST_SCORE', ({ score }) => {
                if (scoreRef.current) scoreRef.current.textContent = score.toLocaleString();
            });
        }
    }, [engine]);

    useEffect(() => {
        if (visualEffect?.type === 'FRENZY_START') setAnnouncement("Frenzy Mode Activated!");
        else if (stats.score > 0 && stats.score % 1000 === 0) setAnnouncement(`Score ${stats.score}`);
    }, [visualEffect, stats.score]);

    const bombSelectionRows = useMemo(() => {
        return isSelectingBombRows ? [] : undefined;
    }, [isSelectingBombRows]);

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

    return (
        <div className="relative w-full h-full flex justify-center items-center overflow-hidden">
            <A11yAnnouncer lastEvent={announcement} />
            
            {/* Main Container */}
            <div className="relative flex justify-center items-start gap-0 w-full h-full md:w-auto md:h-auto md:gap-8 md:p-4">
                
                {/* Desktop Left HUD */}
                <div className="hidden lg:flex flex-col w-64 gap-4 transition-all duration-500 ease-out animate-slide-in-left pt-4">
                    <div className="flex items-center gap-4 mb-2">
                        <GlassPanel variant="dark" className="p-3 flex items-center justify-center" interactive onClick={openSettings} aria-label="Settings">
                            <SettingsIcon size={20} className="text-gray-400 hover:text-white transition-colors" />
                        </GlassPanel>
                        <div>
                            <Label className="text-cyan-400">{gameMode}</Label>
                            <div className="text-white font-bold text-sm opacity-80">{currentWorld ? currentWorld.name : difficulty}</div>
                        </div>
                    </div>

                    <GlassPanel variant="dark" className="p-4 flex flex-col items-center justify-center min-h-[140px]">
                        <PanelHeader title="HOLD" className="mb-2 w-full" />
                        <div className="flex-1 flex items-center justify-center w-full relative">
                            {heldPiece ? (
                                <Preview title="" type={heldPiece} isLocked={!canHold} variant="recessed" className="w-20 h-20" />
                            ) : (
                                <div className="text-gray-600 text-xs font-mono">EMPTY</div>
                            )}
                            {!canHold && <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center"><Label className="text-red-400 bg-black/80 px-1">LOCKED</Label></div>}
                        </div>
                    </GlassPanel>

                    <StatsPanel 
                        gameStats={stats} 
                        gameMode={gameMode} 
                        adventureLevelConfig={adventureLevelConfig} 
                    />
                </div>

                {/* Center Board Area */}
                <div className="relative flex flex-col items-center justify-center w-full h-full md:w-auto z-10">
                    {/* The Board Canvas fills this container */}
                    <BoardCanvas 
                        engine={engine}
                        renderConfig={boardRenderCoreConfig}
                        bombSelectionRows={bombSelectionRows}
                        lineClearerSelectedRow={selectedLineToClear}
                        className="z-10"
                        rendererRef={rendererRef}
                    />
                    
                    {/* Overlays */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-visible">
                        <div className="absolute top-1/2 left-full ml-4 transform -translate-y-1/2 hidden md:block">
                            <ComboIndicator comboCount={comboCount} isBackToBack={isBackToBack} />
                        </div>
                        
                        <div className={`absolute ${flippedGravity ? 'top-20' : 'bottom-32 md:bottom-0'} left-1/2 -translate-x-1/2 md:left-auto md:-left-20 md:translate-x-0 h-full flex flex-col justify-center py-10`}>
                            <GarbageDisplay garbagePending={garbagePending} flippedGravity={flippedGravity} />
                        </div>

                        <div className={`absolute ${flippedGravity ? 'top-4' : 'bottom-4'} left-0 right-0 flex justify-center opacity-80`}>
                            <RhythmIndicator />
                        </div>
                    </div>
                </div>

                {/* Desktop Right HUD */}
                <div className="hidden lg:flex flex-col w-48 gap-4 transition-all duration-500 ease-out animate-slide-in-right pt-4">
                    <GlassPanel variant="dark" className="p-4 flex flex-col h-full max-h-[600px]">
                        <PanelHeader title="NEXT" className="mb-4 w-full" />
                        <div className="flex flex-col gap-3 items-center flex-1 overflow-hidden">
                            <div className="scale-110 mb-2">
                                <Preview title="" type={nextQueue[0]} variant="recessed" className="w-24 h-24 border-cyan-500/30" />
                            </div>
                            <div className="flex flex-col gap-2 opacity-80">
                                {nextQueue.slice(1, 5).map((type, i) => (
                                    <Preview key={i} title="" type={type} variant="small" className="scale-90" />
                                ))}
                            </div>
                        </div>
                    </GlassPanel>
                    
                    <div className="flex justify-between gap-2">
                       <button onClick={toggleShowAi} className={`flex-1 p-3 rounded-lg border border-white/5 flex flex-col items-center gap-1 transition-colors ${boardRenderCoreConfig.showAi ? 'bg-cyan-900/20 text-cyan-400 border-cyan-500/30' : 'bg-black/40 text-gray-500 hover:bg-white/5'}`}>
                           <Brain size={16} />
                           <span className="text-[9px] font-bold">AI HINT</span>
                       </button>
                    </div>
                </div>
            </div>
            
            {/* Mobile Overlay HUD (Completely transparent, floats over board) */}
            <div className="lg:hidden absolute top-0 left-0 right-0 p-2 pt-safe-top flex justify-between items-start pointer-events-none z-50">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <button 
                        onClick={handleMobilePause} 
                        className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-full text-white backdrop-blur-md shadow-lg active:scale-95"
                        aria-label="Pause Game"
                    >
                        <Pause size={20} fill="currentColor" />
                    </button>
                    <div className="pl-1">
                        <div ref={scoreRef} className="text-2xl font-black text-white tabular-nums leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-shadow-neon">
                            {stats.score.toLocaleString()}
                        </div>
                    </div>
                </div>

                {comboCount > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-20 pointer-events-none">
                        <div className="text-5xl font-black text-yellow-400 italic drop-shadow-[0_0_15px_rgba(0,0,0,1)] animate-bounce whitespace-nowrap stroke-black stroke-2">
                            {comboCount}x
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-end gap-2 pointer-events-auto">
                    <div className="bg-black/60 border border-white/20 rounded p-1 backdrop-blur-md shadow-lg">
                        <Preview title="" type={nextQueue[0]} variant="small" className="scale-90" />
                    </div>
                    
                    <button 
                        onClick={handleMobileHold}
                        disabled={!canHold}
                        className={`
                            flex items-center justify-center w-12 h-12
                            bg-black/40 border border-white/10 rounded-full backdrop-blur-md shadow-lg
                            ${!canHold ? 'opacity-50 grayscale' : 'active:bg-white/10 active:scale-95'}
                        `}
                    >
                        {heldPiece ? (
                            <Preview title="" type={heldPiece} variant="small" className="scale-50" isLocked={!canHold} />
                        ) : (
                            <ArrowLeftRight size={18} className="text-gray-300" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

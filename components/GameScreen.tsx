
import React, { useRef, useEffect, useState, useMemo } from 'react';
import BoardCanvas from './BoardCanvas';
import Preview from './Preview';
import StatsPanel from './StatsPanel';
import Display from './Display';
import ComboIndicator from './ComboIndicator';
import GarbageDisplay from './GarbageDisplay';
import RhythmIndicator from './RhythmIndicator'; 
import AbilityHUD from './AbilityHUD'; 
import Particles, { ParticlesHandle } from './Particles';
import { Settings as SettingsIcon, Volume2, VolumeX, Brain, Bomb, Sparkles, GripHorizontal, Lock, ArrowLeftRight, PauseCircle, Eye, Pause, Skull, Menu } from 'lucide-react';
import { BoardRenderConfig, AdventureLevelConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { audioManager } from '../utils/audioManager';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useEffectStore } from '../stores/effectStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';
import { SHAKE_DURATION_HARD_MS, LEVEL_PASS_COIN_REWARD, MAX_STARS_PER_LEVEL, STAR_COIN_BONUS, ACHIEVEMENTS, FOCUS_GAUGE_MAX } from '../constants';
import { StoryNode, LevelRewards } from '../types';
import { useVisualEffects } from '../hooks/useVisualEffects';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAudioSystem } from '../hooks/useAudioSystem';
import { useCameraSystem } from '../hooks/useCameraSystem';
import { BoardRenderer } from '../utils/BoardRenderer'; 
import TouchControls from './TouchControls'; 
import { VISUAL_THEME } from '../utils/visualTheme';
import { safeStorage } from '../utils/safeStorage';
import { replayManager } from '../utils/ReplayManager';
import GlassPanel from './ui/GlassPanel';
import Button from './ui/Button';
import { Label } from './ui/Text';
import Badge from './ui/Badge';
import PanelHeader from './ui/PanelHeader';
import { DIFFICULTY_SETTINGS, ADVENTURE_CAMPAIGN } from '../constants';
import ProgressBar from './ui/ProgressBar';

const LazySettings = React.lazy(() => import('./Settings'));
const LazyProfile = React.lazy(() => import('./modals/ProfileModal'));

const GHOST_SHADOW = "rgba(6, 182, 212, 0.6)"; 

interface GameScreenProps {
    particlesRef: React.RefObject<ParticlesHandle>;
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

const HudDecorations = () => (
    <div className="absolute inset-0 pointer-events-none z-40 opacity-50">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg drop-shadow-[0_0_5px_cyan]"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-lg drop-shadow-[0_0_5px_cyan]"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-lg drop-shadow-[0_0_5px_cyan]"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg drop-shadow-[0_0_5px_cyan]"></div>
        <div className="absolute top-1/2 left-0 w-1 h-12 -translate-y-1/2 bg-cyan-500/30 rounded-r"></div>
        <div className="absolute top-1/2 right-0 w-1 h-12 -translate-y-1/2 bg-cyan-500/30 rounded-l"></div>
    </div>
);

const Scanlines = () => (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-xl opacity-20 bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
);

const GameScreen: React.FC<GameScreenProps> = ({
    particlesRef,
    boardRenderCoreConfig,
    isMuted,
    toggleMute,
    showAi,
    toggleShowAi,
    openSettings,
    adventureLevelConfig,
    cellSize,
    isPaused,
    rendererRef
}) => {
    const {
        engine,
        stats,
        nextQueue,
        heldPiece,
        canHold,
        lastHoldTime,
        gameMode,
        difficulty,
        touchControls,
        comboCount,
        isBackToBack,
        garbagePending,
        pieceIsGrounded,
        flippedGravity,
        isSelectingBombRows,
        bombRowsToClear,
        isSelectingLine,
        selectedLineToClear,
        blitzSpeedThresholdIndex,
        dangerLevel,
        gameState,
        setGameState
    } = useGameContext();

    const { cameraShake, enableTouchControls } = useGameSettingsStore();
    const { visualEffect } = useEffectStore();
    
    // Get Current World for Theme
    const currentWorld = useMemo(() => {
        if (!adventureLevelConfig) return null;
        return ADVENTURE_CAMPAIGN.find(w => w.id === adventureLevelConfig.worldId);
    }, [adventureLevelConfig]);

    const boardContainerRef = useRef<HTMLDivElement>(null);
    const [announcement, setAnnouncement] = useState<string | null>(null);
    
    const isPlayingState = gameState !== 'MENU' && gameState !== 'MAP' && gameState !== 'STORY' && gameState !== 'BOOSTER_SELECTION';

    useEffect(() => {
        const focusGame = () => {
            if (isPlayingState && !isPaused) {
                if (document.activeElement instanceof HTMLElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'INPUT')) {
                    document.activeElement.blur();
                }
            }
        };
        window.addEventListener('click', focusGame);
        return () => window.removeEventListener('click', focusGame);
    }, [isPlayingState, isPaused]);

    useEffect(() => {
        if (visualEffect?.type === 'FRENZY_START') setAnnouncement("Frenzy Mode Activated!");
        else if (stats.score > 0 && stats.score % 1000 === 0) setAnnouncement(`Score ${stats.score}`);
    }, [visualEffect, stats.score]);

    let mobileProgress = 0;
    let mobileLabel = '';
    if (gameMode === 'SPRINT') {
        mobileProgress = Math.min(1, stats.rows / 40);
        mobileLabel = `${stats.rows}/40`;
    } else if (gameMode === 'BLITZ') {
        mobileProgress = 1 - (stats.time / 120); 
        mobileLabel = 'Time';
    } else {
        mobileProgress = (stats.rows % 10) / 10;
        mobileLabel = `Lvl ${stats.level}`;
    }

    const [cameraTransform, setCameraTransform] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
    const rafRef = useRef<number | null>(null);
    
    useEffect(() => {
        if (!cameraShake || !visualEffect) return;
        if (visualEffect.type === 'SHAKE') {
            const intensity = visualEffect.payload === 'hard' ? 20 : 5;
            setCameraTransform(prev => ({ ...prev, y: intensity, scale: 1.02 }));
        } else if (visualEffect.type === 'FRENZY_START') {
            setCameraTransform(prev => ({ ...prev, scale: 1.1 }));
        }
    }, [visualEffect, cameraShake]);

    useEffect(() => {
        if (!cameraShake) {
            setCameraTransform({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
            return;
        }
        const updateCamera = () => {
            setCameraTransform(prev => ({
                x: prev.x * 0.9,
                y: prev.y * 0.9,
                rotateX: prev.rotateX * 0.9,
                rotateY: prev.rotateY * 0.9,
                scale: 1 + (prev.scale - 1) * 0.9
            }));
            rafRef.current = requestAnimationFrame(updateCamera);
        };
        rafRef.current = requestAnimationFrame(updateCamera);
        return () => { if(rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [cameraShake]);

    const handleUiHover = () => audioManager.playUiHover();
    const handleUiClick = () => audioManager.playUiClick();

    const bombSelectionRows = useMemo(() => {
        return isSelectingBombRows ? Array.from({length: bombRowsToClear}, (_, i) => i) : undefined;
    }, [isSelectingBombRows, bombRowsToClear]);

    const isZoneReady = stats.focusGauge >= FOCUS_GAUGE_MAX;
    const isBossLevel = adventureLevelConfig?.objective.type === 'BOSS';

    useEffect(() => {
        if (currentWorld && boardContainerRef.current) {
            boardContainerRef.current.style.setProperty('--particle-color', currentWorld.particleColor);
        }
    }, [currentWorld]);

    return (
        <main id="main-app-content" className="w-full h-[100dvh] flex flex-col lg:items-center lg:justify-center justify-start pt-16 lg:pt-0 pb-safe relative z-10 transition-all duration-500 ease-out overflow-hidden">
            <A11yAnnouncer lastEvent={announcement} />
            
            {/* Zone Mode Global Overlay */}
            {stats.isZoneActive && (
                <div className="absolute inset-0 z-0 pointer-events-none bg-indigo-900/40 backdrop-blur-[2px] backdrop-grayscale-[0.8] backdrop-contrast-125 transition-all duration-1000 animate-pulse mix-blend-hard-light"></div>
            )}

            {/* --- DESKTOP HEADER --- */}
            <header className={`hidden lg:flex absolute top-0 left-0 right-0 h-28 z-40 justify-between items-start px-10 pt-8 pointer-events-none select-none transition-opacity duration-500 ${stats.isZoneActive ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                <div className="flex flex-col items-start pointer-events-auto animate-in slide-in-from-top-10 duration-700">
                    <h1 className="text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_0_25px_rgba(6,182,212,0.6)] opacity-95 leading-[0.8] mb-2">
                        TETRIOS
                    </h1>
                    <div className="flex items-center gap-3 opacity-90">
                        {currentWorld && (
                            <Badge label={currentWorld.name} variant="purple" className="shadow-[0_0_10px_rgba(168,85,247,0.3)]" />
                        )}
                        <Badge label={gameMode.replace('_', ' ')} variant="cyan" className="shadow-[0_0_10px_rgba(6,182,212,0.2)]" />
                        <Badge label={difficulty} variant="default" className={`text-[10px] bg-white/5 border-white/10 ${DIFFICULTY_SETTINGS[difficulty].color}`} />
                    </div>
                </div>
            </header>

            {/* --- BOSS HUD OVERLAY --- */}
            {isBossLevel && adventureLevelConfig?.boss && (
                <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-top-10 duration-500">
                    <div className="bg-black/80 backdrop-blur-lg border border-red-600/50 p-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-2 text-red-500 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-900/50 rounded-lg border border-red-500/30">
                                    <Skull size={18} className="animate-pulse" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow-md">{adventureLevelConfig.boss.name}</span>
                            </div>
                            <span className="font-mono font-bold text-red-300 text-lg tabular-nums">{stats.bossHp} HP</span>
                        </div>
                        
                        <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-red-900 relative shadow-inner">
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="w-full h-[1px] bg-white/10"></div>
                            </div>
                            <div 
                                className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 shadow-[0_0_15px_red] transition-all duration-500 ease-out relative"
                                style={{ width: `${(stats.bossHp! / (adventureLevelConfig.objective.target || 1)) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:20px_20px] animate-[pulse_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT GRID WITH PARALLAX --- */}
            <div className="w-full h-full flex flex-col lg:flex-row items-center lg:justify-center justify-start gap-0 lg:gap-16 relative z-10"
                 style={{
                     perspective: '1500px',
                     transformStyle: 'preserve-3d'
                 }}
            >

                {/* Left Panel - Stats - Reverse Depth */}
                <aside className={`hidden lg:flex flex-col flex-1 h-full justify-center items-end space-y-6 py-12 pt-32 animate-slide-in delay-100 max-w-[300px] relative z-20 transition-opacity duration-300 ${stats.isZoneActive ? 'opacity-80' : 'opacity-100'}`}
                    style={{
                        transform: `rotateY(${cameraTransform.rotateY * 0.5}deg) rotateX(${cameraTransform.rotateX * 0.5}deg) translateZ(-50px)`
                    }}
                >
                    
                    <GlassPanel variant="default" intensity="high" className="w-full p-6 shadow-2xl group hover:border-white/10 transition-colors border-t-4 border-t-white/5 bg-black/40 backdrop-blur-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
                        <StatsPanel 
                            gameStats={stats}
                            gameMode={gameMode} 
                            adventureLevelConfig={adventureLevelConfig}
                            blitzSpeedThresholdIndex={blitzSpeedThresholdIndex}
                        />
                    </GlassPanel>

                    <div className="w-full flex flex-col items-end gap-3 min-h-[80px] justify-end relative pr-1">
                        <ComboIndicator comboCount={comboCount} isBackToBack={isBackToBack} />
                        {(gameMode === 'BATTLE' || gameMode === 'ADVENTURE') && garbagePending > 0 && <GarbageDisplay garbagePending={garbagePending} flippedGravity={flippedGravity} />}
                    </div>
                    
                    <GlassPanel variant="dark" className="w-full mt-auto p-4 grid grid-cols-3 gap-3 border-t border-white/10 bg-gray-950/80">
                        <Button variant="icon" onClick={openSettings} title="Settings" className="flex flex-col h-auto py-3 gap-2 text-[9px] font-bold tracking-wider opacity-70 hover:opacity-100 hover:bg-white/5 transition-all">
                            <SettingsIcon size={20} /> Config
                        </Button>
                        <Button variant="icon" onClick={toggleMute} title="Mute Audio" className="flex flex-col h-auto py-3 gap-2 text-[9px] font-bold tracking-wider opacity-70 hover:opacity-100 hover:bg-white/5 transition-all">
                            {isMuted ? <VolumeX size={20} className="text-red-400"/> : <Volume2 size={20} className="text-cyan-400"/>}
                            {isMuted ? 'Muted' : 'Audio'}
                        </Button>
                        <Button variant="icon" onClick={toggleShowAi} title="Toggle AI" className={`flex flex-col h-auto py-3 gap-2 text-[9px] font-bold tracking-wider opacity-70 hover:opacity-100 hover:bg-white/5 transition-all ${showAi ? 'text-cyan-300 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)] bg-cyan-900/20' : ''}`}>
                            <Brain size={20} /> Assist
                        </Button>
                        
                        {(stats.bombBoosterReady || stats.lineClearerActive) && gameMode === 'ADVENTURE' && !isSelectingBombRows && !isSelectingLine && (
                            <div className="col-span-3 grid grid-cols-1 gap-2 mt-1 pt-3 border-t border-white/5 animate-in slide-in-from-bottom-2">
                                {stats.bombBoosterReady && (
                                    <button onClick={() => { handleUiClick(); touchControls.triggerBombBooster(); }} onMouseEnter={handleUiHover} className="w-full py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-95" aria-label="Activate Bomb Booster">
                                        <Bomb size={14} /> Activate Bomb
                                    </button>
                                )}
                                {stats.lineClearerActive && (
                                    <button onClick={() => { handleUiClick(); touchControls.triggerLineClearer(); }} onMouseEnter={handleUiHover} className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 text-cyan-200 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95" aria-label="Activate Line Clearer Booster">
                                        <Sparkles size={14} /> Line Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </GlassPanel>
                </aside>

                {/* Center - Board with Camera Rig */}
                <section className="flex-shrink-0 relative z-10 flex justify-center items-start lg:items-center w-full h-full lg:py-8 lg:w-auto lg:h-auto" aria-label="Game Board" style={{
                    transform: `rotateX(${cameraTransform.rotateX}deg) rotateY(${cameraTransform.rotateY}deg) translateY(${cameraTransform.y}px) scale(${cameraTransform.scale})`,
                    transition: 'transform 0.1s cubic-bezier(0.1, 0.5, 0.1, 1)'
                }}>
                    {/* Mobile Stats Indicators (Combo) */}
                    <div className="lg:hidden absolute top-20 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none transition-opacity duration-300 z-50">
                        {comboCount > 0 && (
                            <div className="bg-black/40 backdrop-blur-sm text-cyan-300 text-xs font-black px-3 py-1 rounded-full animate-bounce border border-cyan-500/20 tracking-widest">
                                {comboCount + 1} COMBO
                            </div>
                        )}
                        {isBackToBack && (
                            <div className="bg-yellow-900/40 backdrop-blur-sm text-yellow-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-500/20 tracking-widest">
                                B2B
                            </div>
                        )}
                    </div>

                    <div className={`relative lg:p-4 lg:bg-gray-900/90 lg:rounded-xl lg:backdrop-blur-xl lg:shadow-[0_0_50px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)] lg:ring-1 lg:ring-white/10 transition-all duration-500 ease-out group ${stats.isZoneActive ? 'shadow-[0_0_100px_rgba(255,215,0,0.3)] ring-yellow-500/30' : ''}`} ref={boardContainerRef}>
                        <div className="hidden lg:block"><HudDecorations /></div>
                        <div className="hidden lg:block"><Scanlines /></div>
                        
                        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden lg:rounded-xl" aria-hidden="true"><Particles ref={particlesRef} cellSize={cellSize} paused={isPaused} /></div>
                        
                        {/* Ability HUD on Desktop (Left Side) */}
                        <div className="hidden lg:block absolute top-1/2 -left-20 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
                            <AbilityHUD 
                                abilities={stats.abilities || []} 
                                onTrigger={(idx) => engine.current.handleAction(idx === 0 ? 'ability1' : (idx === 1 ? 'ability2' : 'ability3'))} 
                            />
                        </div>

                        {/* Rhythm Indicator */}
                        <div className="absolute bottom-full left-0 right-0 mb-2 pointer-events-none">
                            <RhythmIndicator />
                        </div>

                        {/* Canvas Wrapper: Transparent on Mobile, Card on Desktop */}
                        <BoardCanvas 
                            engine={engine} 
                            renderConfig={boardRenderCoreConfig} 
                            bombSelectionRows={bombSelectionRows}
                            lineClearerSelectedRow={isSelectingLine ? selectedLineToClear : null}
                            className="relative z-10 lg:rounded lg:shadow-2xl lg:bg-black lg:border-[4px] lg:border-gray-800 lg:group-hover:border-gray-700 transition-colors bg-transparent border-none shadow-none"
                            rendererRef={rendererRef}
                        />
                        {/* Dynamic Theme Floor Reflection (Desktop only) */}
                        <div className="hidden lg:block absolute -bottom-12 left-8 right-8 h-8 blur-3xl rounded-full opacity-60 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: stats.isZoneActive ? '#ffd700' : (currentWorld?.themeColor || '#06b6d4') }}></div>
                    </div>
                </section>

                {/* Right Panel - Next/Hold - Reverse Depth */}
                <aside className={`hidden lg:flex flex-col flex-1 h-full justify-center items-start space-y-8 py-12 pt-32 animate-slide-in delay-200 max-w-[300px] relative z-20 transition-opacity duration-300 ${stats.isZoneActive ? 'opacity-80' : 'opacity-100'}`}
                    style={{
                        transform: `rotateY(${cameraTransform.rotateY * 0.5}deg) rotateX(${cameraTransform.rotateX * 0.5}deg) translateZ(-50px)`
                    }}
                >
                    <div className="w-full max-w-[240px] flex flex-col gap-6">
                        <GlassPanel variant="darker" className="overflow-hidden group border-2 border-white/5 relative shadow-2xl bg-black/60 backdrop-blur-xl rounded-2xl">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:8px_8px]"></div>
                            
                            <PanelHeader title="Next Unit" className="bg-black/40 border-b border-white/5 p-4 relative z-10 backdrop-blur-sm" textColor="text-cyan-300">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_cyan] animate-pulse"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-500/30 rounded-full"></div>
                                </div>
                            </PanelHeader>
                            
                            <div className="p-8 flex justify-center items-center relative min-h-[150px] z-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]"></div>
                                <Preview title="" type={nextQueue[0]} aria-label="Next Tetromino" className="scale-125 drop-shadow-[0_5px_30px_rgba(6,182,212,0.5)] transition-transform duration-300 hover:scale-135 hover:rotate-3" />
                            </div>
                        </GlassPanel>

                        <GlassPanel variant="dark" className="p-5 flex flex-col h-[380px] border-t border-white/5 bg-gray-950/60 rounded-2xl" aria-label="Upcoming Tetrominos">
                            <PanelHeader title="Incoming" className="border-b border-white/5 pb-3 mb-5 relative z-10 opacity-80" />
                            <div className="absolute top-24 left-1/2 w-[1px] h-[60%] bg-gradient-to-b from-white/10 via-white/5 to-transparent -translate-x-1/2 z-0"></div>
                            <div className="flex flex-col items-center w-full relative flex-1 space-y-5">
                                {nextQueue.slice(1, 6).map((type, i) => {
                                    const scale = 1 - (i * 0.08); 
                                    const opacity = Math.max(0.2, 1 - (i * 0.18));
                                    
                                    return (
                                        <div key={`${i}-${type}-${stats.rows}`} 
                                            className="transition-all duration-500 ease-out flex flex-col items-center w-full relative z-10 animate-in slide-in-from-bottom-2 fade-in"
                                            style={{ transform: `scale(${scale})`, opacity: opacity, transitionDelay: `${i * 50}ms` }}
                                        >
                                            <div className="bg-black/40 border border-white/5 rounded-xl p-3 w-20 h-14 flex items-center justify-center relative shadow-sm backdrop-blur-sm hover:border-white/20 transition-colors">
                                                <Preview title="" type={type} variant="small" className="scale-100 grayscale-[0.2]" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassPanel>
                    </div>

                    <div className="w-full max-w-[240px] mt-auto">
                        <button 
                            onClick={() => canHold && touchControls.hold()} 
                            className={`w-full p-0 backdrop-blur-md border rounded-2xl shadow-lg transition-all duration-300 group relative overflow-hidden
                                ${canHold 
                                    ? 'bg-gray-900/60 border-white/10 hover:border-cyan-500/50 hover:bg-gray-800/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                                    : 'bg-black/60 border-red-900/30 cursor-not-allowed opacity-80 grayscale'
                                }`} 
                            disabled={!canHold} 
                            aria-label={canHold ? "Hold Piece (C)" : "Hold Locked"}
                        >
                            <div className={`flex justify-between items-center p-4 border-b ${canHold ? 'border-white/5 bg-white/5' : 'border-red-900/20 bg-red-900/10'}`}>
                                <Label className={`transition-colors font-bold tracking-widest ${canHold ? 'text-gray-400 group-hover:text-cyan-400' : 'text-red-500'}`}>HOLD</Label>
                                {canHold ? <GripHorizontal size={18} className="text-gray-600 group-hover:text-cyan-500 transition-colors" /> : <Lock size={18} className="text-red-500" />}
                            </div>
                            <div className="flex justify-center py-8 relative min-h-[130px]">
                                <Preview title="" type={heldPiece} lastUpdate={lastHoldTime} isLocked={!canHold && heldPiece !== null} className="drop-shadow-lg scale-125" />
                                {!heldPiece && <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center"><Label className="text-white/10 text-[10px]">EMPTY</Label></div></div>}
                            </div>
                        </button>
                    </div>
                </aside>
            </div>

            {/* Mobile Top Bar - Thin glass strip */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-[50px] flex justify-between items-center px-4 z-40 pointer-events-none border-b border-white/5 bg-black/40 backdrop-blur-lg" aria-live="polite" aria-atomic="true">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button onClick={() => setGameState('PAUSED')} className="p-1.5 bg-white/5 border border-white/10 rounded-md text-white active:bg-white/20 transition-colors" aria-label="Pause Game">
                        <Pause size={14} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Score</span>
                        <span className="text-sm font-mono font-bold text-white leading-none">{stats.score.toLocaleString()}</span>
                    </div>
                </div>

                {/* Centered Next Piece Mini Preview */}
                <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded bg-black/30 border ${isZoneReady ? 'border-yellow-500/50' : 'border-white/10'}`}>
                     <Preview title="" type={nextQueue[0]} variant="small" className="scale-[0.5]" />
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold">{mobileLabel}</span>
                    <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${mobileProgress * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar: If touch controls are disabled, show fallback controls */}
            {!enableTouchControls && isPlayingState && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl p-5 pb-safe border-t border-gray-800 z-50 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" role="navigation" aria-label="Mobile Game Controls">
                    <div className="flex gap-5">
                        <button onClick={() => { handleUiClick(); canHold && touchControls.hold(); }} disabled={!canHold} className={`w-14 h-14 flex items-center justify-center rounded-full transition-all border shadow-lg ${canHold ? 'bg-gray-800 text-cyan-400 border-cyan-900 active:scale-90 active:bg-cyan-900/50 hover:border-cyan-500' : 'bg-gray-900 text-gray-700 border-gray-800 cursor-not-allowed'}`} aria-label="Hold Piece"><ArrowLeftRight size={24} aria-hidden="true" /></button>
                        <button onClick={() => { handleUiClick(); setGameState('PAUSED'); }} className="w-14 h-14 flex items-center justify-center bg-gray-800 text-gray-400 border border-gray-700 rounded-full active:scale-90 active:bg-gray-700 hover:text-white hover:border-gray-500 shadow-lg transition-colors" aria-label="Pause Game"><PauseCircle size={24} aria-hidden="true"/></button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default GameScreen;

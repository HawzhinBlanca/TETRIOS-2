
import React, { useEffect, useRef, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useTetrios } from './hooks/useTetrios';
import { useGestures } from './hooks/useGestures';
import BoardCanvas from './components/BoardCanvas';
import Preview from './components/Preview';
import Particles, { ParticlesHandle } from './components/Particles';
import MusicVisualizer from './components/MusicVisualizer';
import StatsPanel from './components/StatsPanel';
import ComboIndicator from './components/ComboIndicator';
import GarbageDisplay from './components/GarbageDisplay';
import AdventureMap from './components/AdventureMap';
import StoryOverlay from './components/StoryOverlay';
import TutorialTip from './components/TutorialTip';
import { audioManager } from './utils/audioManager';
import { useUiStore } from './stores/uiStore';
import { useGameSettingsStore } from './stores/gameSettingsStore';
import { useAdventureStore } from './stores/adventureStore';
import { useBoosterStore } from './stores/boosterStore';
import { Settings as SettingsIcon, Volume2, VolumeX, Brain, ArrowLeftRight, Play, PauseCircle, RefreshCw, AlertTriangle, Trophy, Share2, Bomb, Clock, RotateCcw, Sparkles, Crown, Gauge, ArrowDownUp } from 'lucide-react';
import { SHAKE_DURATION_HARD_MS, SHAKE_DURATION_SOFT_MS, FLASH_DURATION_MS, PARTICLE_AMOUNT_MEDIUM, PARTICLE_AMOUNT_SOFT, LEVEL_PASS_COIN_REWARD, MAX_STARS_PER_LEVEL, STAR_COIN_BONUS, BOOSTERS, COLORS } from './constants';
import { GameMode, GameState, KeyMap, MoveScore, TetrominoType, GhostStyle, BoardRenderConfig, VisualEffectPayload, KeyAction, StoryNode, AdventureLevelConfig, LevelRewards, BoosterType, CellModifierType, GameStats } from './types';
import { GameCore } from './utils/GameCore';

const LazySettings = lazy(() => import('./components/Settings'));
const LazyMainMenu = lazy(() => import('./components/MainMenu'));

const GHOST_SHADOW = "rgba(6, 182, 212, 0.6)"; 

const handleVisualEffect = (
    effect: VisualEffectPayload | null,
    particlesRef: React.RefObject<ParticlesHandle>,
    setShakeClass: (cls: string) => void,
    setFlashOverlay: (color: string | null) => void,
    cellSize: number,
    clearVisualEffect: () => void,
) => {
    if (!effect) return;

    switch (effect.type) {
        case 'SHAKE':
            const cls = effect.payload === 'hard' ? 'shake-hard' : 'shake-soft';
            setShakeClass(cls);
            setTimeout(() => setShakeClass(''), effect.payload === 'hard' ? SHAKE_DURATION_HARD_MS : SHAKE_DURATION_SOFT_MS);
            break;
        case 'PARTICLE':
            if (particlesRef.current) {
                const { isExplosion, isBurst, clearedRows, y, x, color, amount } = effect.payload || {};
                if (isExplosion) {
                    if (Array.isArray(clearedRows)) {
                        clearedRows.forEach((rowY: number) => {
                            particlesRef.current?.spawnExplosion(rowY, color);
                        });
                    } else if (typeof clearedRows === 'number') {
                        particlesRef.current?.spawnExplosion(clearedRows, color);
                    }
                } else if (isBurst && x !== undefined && y !== undefined && color) {
                    particlesRef.current.spawnBurst(
                        x, 
                        y, 
                        color,
                        amount || PARTICLE_AMOUNT_MEDIUM
                    );
                } else if (x !== undefined && y !== undefined && color) {
                    particlesRef.current.spawn(
                        x, 
                        y, 
                        color,
                        amount || PARTICLE_AMOUNT_SOFT
                    );
                }
            }
            break;
        case 'FLASH':
            const { color: flashColor, duration } = effect.payload || {};
            if (flashColor) {
                setFlashOverlay(flashColor);
                setTimeout(() => setFlashOverlay(null), duration || FLASH_DURATION_MS);
            }
            break;
        case 'FRENZY_START':
            setFlashOverlay(effect.payload?.color || 'rgba(255, 215, 0, 0.5)');
            setTimeout(() => setFlashOverlay(null), 300);
            particlesRef.current?.spawnBurst(5 * cellSize, 10 * cellSize, 'gold', 100);
            break;
        case 'FRENZY_END':
            setFlashOverlay(effect.payload?.color || 'rgba(255, 215, 0, 0.2)');
            setTimeout(() => setFlashOverlay(null), 200);
            break;
        case 'POWERUP_ACTIVATE':
            if (particlesRef.current) {
                const { type: powerupType, x, y, color } = effect.payload || {};
                if (x !== undefined && y !== undefined && color) { 
                    particlesRef.current.spawnBurst(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, color, 40);
                } else if (color) {
                    particlesRef.current.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, color, 20);
                }
            }
            break;
        case 'BLITZ_SPEED_THRESHOLD':
            setFlashOverlay('rgba(255, 165, 0, 0.3)');
            setTimeout(() => setFlashOverlay(null), 200);
            particlesRef.current?.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, 'orange', 50);
            break;
        case 'FLIPPED_GRAVITY_ACTIVATE':
            setFlashOverlay('rgba(59, 130, 246, 0.5)');
            setTimeout(() => setFlashOverlay(null), 300);
            particlesRef.current?.spawnBurst(10 * cellSize / 2, 20 * cellSize / 2, 'blue', 70);
            break;
        case 'FLIPPED_GRAVITY_END':
            setFlashOverlay('rgba(59, 130, 246, 0.2)');
            setTimeout(() => setFlashOverlay(null), 200);
            break;
        default:
            break;
    }
    clearVisualEffect(); 
};


interface GameScreenProps {
    engine: React.MutableRefObject<GameCore>;
    stats: GameStats;
    nextQueue: TetrominoType[];
    heldPiece: TetrominoType | null;
    canHold: boolean;
    lastHoldTime: number;
    gameMode: GameMode;
    aiHint: MoveScore | null;
    cellSize: number;
    boardRenderCoreConfig: Omit<BoardRenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>;
    bombSelectionRows?: number[];
    lineClearerSelectedRow?: number | null;

    particlesRef: React.RefObject<ParticlesHandle>;
    touchControls: {
        move: (dir: number) => void;
        rotate: (dir: number) => void;
        softDrop: () => void;
        hardDrop: () => void;
        hold: () => void;
        useLineClearer: (y: number) => void;
        triggerBombBooster: () => void; 
        triggerLineClearer: () => void;
    };
    handleUiHover: () => void;
    handleUiClick: () => void;
    showAi: boolean;
    toggleShowAi: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    controls: KeyMap; 
    setKeyBinding: (action: KeyAction, key: string) => void; 
    comboCount: number;
    isBackToBack: boolean;
    garbagePending: number;
    gameState: GameState;
    setGameState: (state: GameState) => void;
    openSettings: () => void;
    pieceIsGrounded: boolean;
    flippedGravity: boolean;
    adventureLevelConfig?: AdventureLevelConfig;
    isSelectingBombRows: boolean; 
    isSelectingLine: boolean;
    blitzSpeedThresholdIndex: number;
}

const GameScreen: React.FC<GameScreenProps> = ({
    engine, stats, nextQueue, heldPiece, canHold,
    lastHoldTime, gameMode, aiHint, cellSize, 
    boardRenderCoreConfig, bombSelectionRows, lineClearerSelectedRow,
    particlesRef,
    touchControls, handleUiHover, handleUiClick, showAi, toggleShowAi,
    isMuted, toggleMute, comboCount, isBackToBack, garbagePending,
    gameState, setGameState, openSettings, pieceIsGrounded, flippedGravity,
    adventureLevelConfig, isSelectingBombRows, isSelectingLine,
    blitzSpeedThresholdIndex
}) => {
    const boardContainerRef = useRef<HTMLDivElement>(null);
    const levelProgress = (stats.rows % 10) / 10;

    useGestures(boardContainerRef, {
        onSwipeLeft: () => touchControls.move(-1),
        onSwipeRight: () => touchControls.move(1),
        onSwipeDown: () => touchControls.softDrop(),
        onFlickDown: () => touchControls.hardDrop(),
        onTap: () => touchControls.rotate(1),
    });

    return (
        <main id="main-app-content" className="w-full h-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between p-4 relative z-10 gap-4 lg:gap-8 transition-all duration-500 ease-out">
            <aside className="hidden lg:flex flex-col flex-1 h-full justify-center items-end space-y-6 py-8 animate-slide-in delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="mb-8 text-right select-none">
                    <h1 className="text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-purple-600 italic tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">TETRIOS</h1>
                    <div className="flex items-center justify-end gap-2 mt-2">
                        <span className="text-[10px] text-cyan-700 uppercase tracking-[0.3em] font-bold">{gameMode.replace('_', ' ')} // v1.4</span>
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" aria-hidden="true"></div>
                    </div>
                </div>
                <StatsPanel 
                    gameStats={stats}
                    gameMode={gameMode} 
                    adventureLevelConfig={adventureLevelConfig}
                    blitzSpeedThresholdIndex={blitzSpeedThresholdIndex}
                />
                <ComboIndicator comboCount={comboCount} isBackToBack={isBackToBack} />
                {(gameMode === 'BATTLE' || gameMode === 'ADVENTURE') && garbagePending > 0 && <GarbageDisplay garbagePending={garbagePending} flippedGravity={flippedGravity} />}
                <nav className="grid grid-cols-3 gap-2 w-full max-w-[240px] mt-auto" aria-label="Game Controls">
                    <button onClick={() => {handleUiClick(); openSettings();}} onMouseEnter={handleUiHover} className="bg-gray-900/60 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500/50 p-3 rounded-sm transition-all group" title="Settings" aria-label="Open Settings"><SettingsIcon size={18} className="text-gray-400 group-hover:text-cyan-400 mx-auto" aria-hidden="true" /></button>
                    <button onClick={toggleMute} onMouseEnter={handleUiHover} className="bg-gray-900/60 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500/50 p-3 rounded-sm transition-all group" title="Mute Audio" aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}>{isMuted ? <VolumeX size={18} className="text-red-400 mx-auto" aria-hidden="true"/> : <Volume2 size={18} className="text-cyan-400 mx-auto" aria-hidden="true"/>}</button>
                    <button onClick={() => { handleUiClick(); toggleShowAi(); }} onMouseEnter={handleUiHover} className={`border p-3 rounded-sm transition-all group ${showAi ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-gray-900/60 border-gray-700 hover:border-cyan-500/30'}`} title="Toggle AI Assistant" aria-label={showAi ? "Hide AI Assistant" : "Show AI Assistant"}><Brain size={18} className={`${showAi ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'} mx-auto`} aria-hidden="true" /></button>
                    
                    {stats.bombBoosterReady && gameMode === 'ADVENTURE' && !isSelectingBombRows && !isSelectingLine && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerBombBooster(); }} onMouseEnter={handleUiHover} className="col-span-3 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]" aria-label="Activate Bomb Booster">
                            <Bomb size={20} /> Bomb Booster
                        </button>
                    )}
                    {stats.lineClearerActive && gameMode === 'ADVENTURE' && !isSelectingLine && !isSelectingBombRows && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerLineClearer(); }} onMouseEnter={handleUiHover} className="col-span-3 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]" aria-label="Activate Line Clearer Booster">
                            <Sparkles size={20} /> Line Clearer
                        </button>
                    )}
                </nav>
            </aside>

            <section className="flex-shrink-0 relative z-20 transition-transform duration-500 ease-out" aria-label="Game Board">
                <div className="relative p-0 bg-gray-900/40 rounded-[4px] backdrop-blur-sm transition-all duration-500 ease-out hover:transform hover:-translate-y-1 hover:shadow-[0_10px_40px_-5px_rgba(6,182,212,0.4)] border border-gray-700/30 hover:border-cyan-500/50 group" ref={boardContainerRef}>
                    <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-500/30 group-hover:border-cyan-400 transition-colors duration-300 rounded-tl-sm" aria-hidden="true"></div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-500/30 group-hover:border-cyan-400 transition-colors duration-300 rounded-tr-sm" aria-hidden="true"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-500/30 group-hover:border-cyan-400 transition-colors duration-300 rounded-bl-sm" aria-hidden="true"></div>
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-500/30 group-hover:border-cyan-400 transition-colors duration-300 rounded-br-sm" aria-hidden="true"></div>
                    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-sm" aria-hidden="true"><Particles ref={particlesRef} cellSize={cellSize} /></div>
                    <BoardCanvas 
                        engine={engine} 
                        renderConfig={boardRenderCoreConfig} 
                        bombSelectionRows={bombSelectionRows}
                        lineClearerSelectedRow={lineClearerSelectedRow}
                        className="shadow-inner" 
                    />
                </div>
            </section>

            <aside className="hidden lg:flex flex-col flex-1 h-full justify-center items-start space-y-8 py-8 pl-4 animate-slide-in delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="w-full max-w-[200px]">
                    <div className="mb-6 transform scale-105 origin-top-left">
                        <div className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><div className="w-1 h-4 bg-cyan-500" aria-hidden="true"></div> Next Unit</div>
                        <Preview title="" type={nextQueue[0]} aria-label="Next Tetromino" />
                    </div>
                    <div className="space-y-3 pl-4 border-l border-gray-800 transition-colors hover:border-gray-700" aria-label="Upcoming Tetrominos">
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">In Queue</div>
                        {nextQueue.slice(1, 5).map((type, i) => (
                            <div key={i} className="scale-75 origin-left opacity-60 mix-blend-screen hover:opacity-100 transition-opacity"><Preview title="" type={type} aria-label={`Upcoming Tetromino ${i + 1}`} /></div>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-[200px]">
                    <button onClick={() => canHold && touchControls.hold()} className={`cursor-pointer transition-all duration-300 relative group p-4 border border-dashed rounded-lg ${canHold ? 'border-gray-700 hover:border-cyan-500 hover:bg-cyan-950/20 hover:shadow-[0_0_20px_-5px_cyan]' : 'opacity-50 border-red-900/30 bg-red-950/10'}`} disabled={!canHold} aria-label="Hold Piece (C)">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Hold Buffer (C)</div>
                        <div className="flex justify-center transition-transform group-hover:scale-105"><Preview title="" type={heldPiece} lastUpdate={lastHoldTime} /></div>
                        {!canHold && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] rounded-lg"><span className="text-[10px] font-bold text-red-500 uppercase border border-red-500 px-2 py-0.5 rounded">Locked</span></div>}
                    </button>
                </div>
            </aside>

            <div className="lg:hidden fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-40 pointer-events-none" aria-live="polite" aria-atomic="true">
                <div className="bg-black/40 backdrop-blur-md p-3 rounded border border-white/10 pointer-events-auto">
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Score</div>
                    <div className="text-xl font-mono font-bold text-white leading-none">{stats.score}</div>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-3 rounded border border-white/10 pointer-events-auto">
                    <div className="text-[9px] text-cyan-400 uppercase font-bold">{gameMode === 'SPRINT' ? 'Lines' : 'Lvl ' + stats.level}</div>
                    <div className="flex gap-1 mt-1"><div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${levelProgress * 100}%` }}></div></div></div>
                </div>
            </div>

            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl p-4 pb-8 border-t border-gray-800 z-50 flex justify-between items-center" role="navigation" aria-label="Mobile Game Controls">
                <div className="flex gap-4">
                    <button onClick={() => { handleUiClick(); canHold && touchControls.hold(); }} disabled={!canHold} className={`w-14 h-14 flex items-center justify-center rounded-full transition-all border ${canHold ? 'bg-gray-800 text-cyan-400 border-cyan-900 active:scale-90 active:bg-cyan-900/50' : 'bg-gray-900 text-gray-700 border-gray-800 cursor-not-allowed'}`} aria-label="Hold Piece"><ArrowLeftRight size={24} aria-hidden="true" /></button>
                    {stats.bombBoosterReady && gameMode === 'ADVENTURE' && !isSelectingBombRows && !isSelectingLine && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerBombBooster(); }} className="w-14 h-14 flex items-center justify-center rounded-full bg-red-800 text-red-400 border border-red-900 active:scale-90 active:bg-red-900/50" aria-label="Activate Bomb Booster">
                            <Bomb size={24} />
                        </button>
                    )}
                    {stats.lineClearerActive && gameMode === 'ADVENTURE' && !isSelectingLine && !isSelectingBombRows && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerLineClearer(); }} className="w-14 h-14 flex items-center justify-center rounded-full bg-cyan-800 text-cyan-400 border border-cyan-900 active:scale-90 active:bg-cyan-900/50" aria-label="Activate Line Clearer Booster">
                            <Sparkles size={24} />
                        </button>
                    )}
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { handleUiClick(); setGameState(gameState === 'PAUSED' ? 'PLAYING' : 'PAUSED'); }} className="w-14 h-14 flex items-center justify-center bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 rounded-full active:scale-90 active:bg-yellow-900/40" aria-label={gameState === 'PAUSED' ? "Play Game" : "Pause Game"}>{gameState === 'PAUSED' ? <Play size={24} aria-hidden="true" /> : <PauseCircle size={24} aria-hidden="true" />}</button>
                    <button onClick={() => { handleUiClick(); setGameState('PAUSED'); openSettings(); }} className="w-14 h-14 flex items-center justify-center bg-gray-800 text-gray-400 border border-gray-700 rounded-full active:scale-90 active:bg-gray-700" aria-label="Open Settings"><SettingsIcon size={24} aria-hidden="true"/></button>
                </div>
            </div>
        </main>
    );
};

interface GameOverlayManagerProps {
    gameState: GameState;
    highScore: number;
    stats: GameStats;
    gameMode: GameMode;
    lastRewards: LevelRewards | null;
    resetGame: (startLevel?: number, mode?: GameMode, adventureLevelConfig?: AdventureLevelConfig | undefined, assistRows?: number, activeBoosters?: BoosterType[]) => void; 
    setGameState: (state: GameState) => void;
    handleShareScore: () => Promise<void>;
    handleUiHover: () => void;
    handleUiClick: () => void;
    openSettings: () => void;
    mainMenuRef: React.RefObject<HTMLDivElement>;
    gameOverModalRef: React.RefObject<HTMLDivElement>;
    pausedModalRef: React.RefObject<HTMLDivElement>;
    getCurrentAdventureLevelConfig: () => AdventureLevelConfig | undefined;
    getOwnedBoosters: () => Record<BoosterType, number>;
    getActiveBoosters: () => BoosterType[];
    toggleActiveBooster: (type: BoosterType) => void;
    coins: number;
    wildcardPieceActive: boolean;
    chooseWildcardPiece: (type: TetrominoType) => void;
    isSelectingBombRows: boolean; 
    bombRowsToClear: number; 
    confirmBombBooster: (startRow: number, numRows: number) => void; 
    cancelBombBoosterSelection: () => void; 
    isSelectingLine: boolean;
    selectedLineToClear: number | null;
    confirmLineClearer: (selectedRow: number) => void;
    cancelLineClearerSelection: () => void;
    flippedGravity: boolean;
    blitzSpeedThresholdIndex: number;
}

const GameOverlayManager: React.FC<GameOverlayManagerProps> = ({
    gameState, highScore, stats, gameMode, lastRewards,
    resetGame, setGameState, handleShareScore, handleUiHover,
    handleUiClick, openSettings, mainMenuRef, gameOverModalRef, pausedModalRef,
    getCurrentAdventureLevelConfig, getOwnedBoosters, getActiveBoosters, toggleActiveBooster, coins,
    wildcardPieceActive, chooseWildcardPiece,
    isSelectingBombRows, bombRowsToClear, confirmBombBooster, cancelBombBoosterSelection,
    isSelectingLine, selectedLineToClear, confirmLineClearer, cancelLineClearerSelection,
    flippedGravity,
}) => {

    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    }, []);

    useEffect(() => {
        if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
            gameOverModalRef.current?.focus();
        } else if (gameState === 'PAUSED') {
            pausedModalRef.current?.focus();
        } else if (gameState === 'MENU') {
            mainMenuRef.current?.focus();
        }
        const mainContent = document.getElementById('main-app-content');
        if (mainContent) {
            if (['GAMEOVER', 'VICTORY', 'PAUSED', 'MENU', 'MAP', 'STORY', 'BOOSTER_SELECTION', 'WILDCARD_SELECTION', 'BOMB_SELECTION', 'LINE_SELECTION'].includes(gameState)) {
                mainContent.setAttribute('aria-hidden', 'true');
            } else {
                mainContent.removeAttribute('aria-hidden');
            }
        }
    }, [gameState, gameOverModalRef, pausedModalRef, mainMenuRef]);

    const currentAdventureConfig = getCurrentAdventureLevelConfig();

    return (
        <>
            {gameState === 'MENU' && (
                <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl text-cyan-400 text-xl font-bold uppercase tracking-widest">Loading Main Menu...</div>}>
                    <LazyMainMenu 
                        onStart={(lvl, mode) => {
                            if(mode === 'ADVENTURE') {
                                setGameState('MAP');
                            } else {
                                resetGame(lvl, mode);
                            }
                        }} 
                        highScore={highScore} 
                        ref={mainMenuRef} 
                        aria-modal="true" 
                        role="dialog" 
                        aria-label="Main Menu" 
                    />
                </Suspense>
            )}

            {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300" ref={gameOverModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={gameState === 'VICTORY' ? 'Victory' : 'Game Over'} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) gameOverModalRef.current?.focus(); }}>
                    <div className={`relative bg-gray-900/90 border-2 ${gameState === 'VICTORY' ? 'border-yellow-500' : 'border-red-500'} p-8 md:p-12 rounded-lg shadow-2xl text-center max-w-lg w-[90%] overflow-hidden`}>
                        <div className={`absolute top-0 left-0 w-full h-2 ${gameState === 'VICTORY' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`}></div>
                        {gameState === 'VICTORY' ? <Trophy size={64} className="text-yellow-500 mx-auto mb-6 animate-bounce" aria-hidden="true" /> : <AlertTriangle size={64} className="text-red-500 mx-auto mb-6 animate-pulse" aria-hidden="true" />}
                        <h2 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter" role="heading" aria-level={2}>{gameState === 'VICTORY' ? 'VICTORY' : 'FAILURE'}</h2>
                        <div className={`${gameState === 'VICTORY' ? 'text-yellow-500' : 'text-red-500'} text-xs uppercase tracking-[0.5em] font-bold mb-8`}>{gameState === 'VICTORY' ? 'Objective Complete' : 'System Critical'}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8" role="region" aria-label="Game Statistics">
                            <div className="bg-black/40 p-4 rounded border border-white/10">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Final Score</div>
                                <div className="text-2xl md:text-3xl font-mono font-bold text-white" aria-live="polite">{stats.score}</div>
                            </div>
                            <div className="bg-black/40 p-4 rounded border border-white/10">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">{gameMode === 'SPRINT' || gameMode === 'BLITZ' ? 'Time' : 'Lines'}</div>
                                <div className="text-2xl md:text-3xl font-mono font-bold text-white" aria-live="polite">{gameMode === 'SPRINT' || gameMode === 'BLITZ' ? formatTime(stats.time) : stats.rows}</div>
                            </div>
                            <div className="bg-black/40 p-4 rounded border border-white/10">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Final Level</div>
                                <div className="text-2xl md:text-3xl font-mono font-bold text-white" aria-live="polite">{stats.level}</div>
                            </div>
                        </div>

                        {lastRewards && (
                            <div className="p-4 bg-purple-900/30 border border-purple-700 rounded mb-8 text-left">
                                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest mb-3">Rewards</h3>
                                <div className="flex justify-between items-center text-white text-lg font-bold">
                                    <div className="flex items-center gap-2"><span>Coins:</span></div>
                                    <span className="text-yellow-300">+{lastRewards.coins}</span>
                                </div>
                                <div className="flex justify-between items-center text-white text-lg font-bold mt-2">
                                    <div className="flex items-center gap-2"><span>Stars:</span></div>
                                    <span className="text-yellow-300">{lastRewards.stars} / {MAX_STARS_PER_LEVEL}</span>
                                </div>
                                {lastRewards.boosterRewards && lastRewards.boosterRewards.length > 0 && (
                                    <div className="flex justify-between items-center text-white text-lg font-bold mt-2">
                                        <div className="flex items-center gap-2"><span>Boosters:</span></div>
                                        <div className="text-yellow-300 text-base">
                                            {lastRewards.boosterRewards.map(b => `${BOOSTERS[b.type].icon} x${b.amount}`).join(', ')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button onClick={() => { 
                                handleUiClick(); 
                                if (gameMode === 'ADVENTURE') {
                                    const config = getCurrentAdventureLevelConfig();
                                    const failedAttempts = useAdventureStore.getState().getFailedAttempts(config?.id || '');
                                    const assistRows = failedAttempts >= 3 ? 1 : 0;
                                    resetGame(0, gameMode, config, assistRows, getActiveBoosters());
                                } else {
                                    resetGame(gameMode === 'MARATHON' ? stats.level : 0, gameMode); 
                                }
                            }} onMouseEnter={handleUiHover} className={`w-full py-4 ${gameState === 'VICTORY' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500'} text-white font-bold uppercase tracking-[0.2em] rounded transition-all flex items-center justify-center gap-3`} aria-label="Retry Game"><RefreshCw size={20} aria-hidden="true" /> Retry</button>
                            {(navigator.share || navigator.clipboard) && (
                                <button onClick={handleShareScore} onMouseEnter={handleUiHover} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-3" aria-label="Share your score"><Share2 size={20} aria-hidden="true" /> Share Score</button>
                            )}
                            <button onClick={() => { handleUiClick(); setGameState(gameMode === 'ADVENTURE' ? 'MAP' : 'MENU'); }} onMouseEnter={handleUiHover} className="w-full py-3 bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-white font-bold uppercase tracking-widest rounded transition-all" aria-label="Back to Main Menu">Main Menu</button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'PAUSED' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" ref={pausedModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Game Paused" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) pausedModalRef.current?.focus(); }}>
                    <div className="bg-[#0a0f1e] border-l-4 border-yellow-500 p-8 md:p-12 md:pr-24 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-[90%]">
                        <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:text-yellow-500/50 transition-colors skew-x-[10deg]" aria-hidden="true"><PauseCircle size={80} /></div>
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>PAUSED</h2>
                        <div className="h-1 w-24 bg-yellow-500 mb-8 skew-x-[10deg]" aria-hidden="true"></div>
                        <div className="space-y-4 skew-x-[10deg]">
                            <button onClick={() => { handleUiClick(); setGameState('PLAYING'); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-white hover:text-yellow-400 transition-colors group/btn w-full" aria-label="Resume Game">
                                <div className="w-8 md:w-12 h-1 bg-gray-600 group-hover/btn:bg-yellow-400 transition-colors" aria-hidden="true"></div>
                                <span className="text-lg md:text-xl uppercase tracking-[0.2em] font-bold">Resume</span>
                            </button>
                            <button onClick={() => { handleUiClick(); openSettings(); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors group/btn w-full" aria-label="Open Settings">
                                <div className="w-6 md:w-8 h-1 bg-gray-700 group-hover/btn:bg-white transition-colors" aria-hidden="true"></div>
                                <span className="text-xs md:text-sm uppercase tracking-[0.2em] font-bold">Config</span>
                            </button>
                            <button onClick={() => { handleUiClick(); setGameState('MENU'); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-colors group/btn w-full pt-4" aria-label="Abort Game and go to Main Menu">
                                <div className="w-4 md:w-6 h-1 bg-gray-800 group-hover/btn:bg-red-500 transition-colors" aria-hidden="true"></div>
                                <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">Abort</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'BOOSTER_SELECTION' && (
                <BoosterSelectionModal 
                    onStartGame={(config, assist, boosters) => resetGame(0, 'ADVENTURE', config, assist, boosters)}
                    onBack={() => setGameState('MAP')}
                    handleUiHover={handleUiHover}
                    handleUiClick={handleUiClick}
                    currentLevelConfig={currentAdventureConfig}
                    ownedBoosters={getOwnedBoosters()}
                    activeBoosters={getActiveBoosters()}
                    toggleActiveBooster={toggleActiveBooster}
                    coins={coins}
                />
            )}

            {gameState === 'WILDCARD_SELECTION' && wildcardPieceActive && (
                <WildcardSelectionModal
                    onSelectPiece={(type) => chooseWildcardPiece(type)}
                    handleUiHover={handleUiHover}
                    handleUiClick={handleUiClick}
                />
            )}

            {gameState === 'BOMB_SELECTION' && isSelectingBombRows && (
                <BombSelectionModal
                    onConfirm={(startRow, numRows) => confirmBombBooster(startRow, numRows)}
                    onCancel={cancelBombBoosterSelection}
                    handleUiHover={handleUiHover}
                    handleUiClick={handleUiClick}
                    bombRowsToClear={bombRowsToClear}
                    flippedGravity={flippedGravity} 
                />
            )}

            {gameState === 'LINE_SELECTION' && isSelectingLine && (
                <LineSelectionModal
                    onConfirm={(selectedRow) => confirmLineClearer(selectedRow)}
                    onCancel={cancelLineClearerSelection}
                    handleUiHover={handleUiHover}
                    handleUiClick={handleUiClick}
                    selectedLine={selectedLineToClear}
                    flippedGravity={flippedGravity} 
                />
            )}
        </>
    );
};

// --- Booster Selection Modal Component ---
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

const BoosterSelectionModal: React.FC<BoosterSelectionModalProps> = ({
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

// --- Wildcard Selection Modal Component ---
interface WildcardSelectionModalProps {
    onSelectPiece: (type: TetrominoType) => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
}

const WILD_CARD_PIECES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const WildcardSelectionModal: React.FC<WildcardSelectionModalProps> = ({
    onSelectPiece, handleUiHover, handleUiClick
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0f1e] border-l-4 border-yellow-500 p-8 md:p-12 md:pr-24 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-[90%] text-center">
                <div className="absolute top-4 right-4 text-yellow-500/20 group-hover:text-yellow-500/50 transition-colors skew-x-[10deg] animate-pulse" aria-hidden="true"><Sparkles size={80} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>WILDCARD!</h2>
                <p className="text-gray-300 text-sm mb-8 skew-x-[10deg]">Choose your next Tetrimino.</p>

                <div className="grid grid-cols-4 gap-4 mb-8 skew-x-[10deg]">
                    {WILD_CARD_PIECES.map(type => (
                        <button
                            key={type}
                            onClick={() => { handleUiClick(); onSelectPiece(type); }}
                            onMouseEnter={handleUiHover}
                            className={`flex flex-col items-center justify-center p-2 md:p-4 rounded-lg border-2 transition-all duration-200
                                bg-gray-900/50 hover:bg-gray-800
                            `}
                            style={{
                                borderColor: COLORS[type], 
                                color: COLORS[type],
                                boxShadow: `0 0 10px ${COLORS[type]}40`, 
                            }}
                        >
                            <Preview title="" type={type} aria-label={`Choose ${type} piece`} />
                            <span className="mt-1 text-xs font-bold">{type}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Bomb Selection Modal Component ---
interface BombSelectionModalProps {
    onConfirm: (startRow: number, numRows: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    bombRowsToClear: number; 
    flippedGravity: boolean;
}

import { STAGE_WIDTH, STAGE_HEIGHT } from './constants'; 
const BOMB_HIGHLIGHT_COLOR = "rgba(239, 68, 68, 0.6)"; 

const BombSelectionModal: React.FC<BombSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, bombRowsToClear, flippedGravity
}) => {
    const [selectedStartRow, setSelectedStartRow] = useState<number | null>(null);
    const [numRowsToHighlight, setNumRowsToHighlight] = useState<number>(bombRowsToClear); 

    const handleRowClick = (row: number) => {
        handleUiClick();
        setSelectedStartRow(row);
    };

    const confirmSelection = () => {
        if (selectedStartRow !== null) {
            onConfirm(selectedStartRow, numRowsToHighlight);
        }
    };

    const isConfirmEnabled = selectedStartRow !== null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0f1e] border-l-4 border-red-500 p-8 md:p-12 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-[90%] text-center">
                <div className="absolute top-4 right-4 text-red-500/20 group-hover:text-red-500/50 transition-colors skew-x-[10deg] animate-pulse" aria-hidden="true"><Bomb size={80} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>BOMB BOOSTER!</h2>
                <p className="text-gray-300 text-sm mb-8 skew-x-[10deg]">Select {bombRowsToClear} rows to clear.</p>

                <div className="relative w-full aspect-[10/20] bg-gray-900 border border-gray-700 mx-auto mb-8 overflow-hidden skew-x-[10deg]">
                    {[...Array(STAGE_HEIGHT)].map((_, y) => {
                        const isSelected = selectedStartRow !== null && y >= selectedStartRow && y < selectedStartRow + numRowsToHighlight;
                        return (
                            <button
                                key={y}
                                onClick={() => handleRowClick(y)}
                                onMouseEnter={handleUiHover}
                                className={`absolute left-0 w-full h-[5%] flex items-center justify-center border-b border-gray-800 transition-all duration-100
                                    ${isSelected ? 'bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.7)]' : 'hover:bg-gray-700/50'}
                                `}
                                style={{
                                    top: `${(flippedGravity ? STAGE_HEIGHT - (y + numRowsToHighlight) : y) * 5}%`, 
                                    borderColor: isSelected ? BOMB_HIGHLIGHT_COLOR : 'rgba(255,255,255,0.05)',
                                    zIndex: isSelected ? 10 : 1
                                }}
                                aria-label={`Select row ${y + 1}`}
                            >
                                {isSelected && (
                                    <span className="text-white font-bold text-lg pointer-events-none">CLEARED</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-center gap-4 mt-8 skew-x-[10deg]">
                    <button
                        onClick={() => { handleUiClick(); onCancel(); }}
                        onMouseEnter={handleUiHover}
                        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold uppercase tracking-widest rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmSelection}
                        onMouseEnter={handleUiHover}
                        className={`px-8 py-3 ${isConfirmEnabled ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold uppercase tracking-widest rounded transition-colors`}
                        disabled={!isConfirmEnabled}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Line Selection Modal Component ---
interface LineSelectionModalProps {
    onConfirm: (selectedRow: number) => void;
    onCancel: () => void;
    handleUiHover: () => void;
    handleUiClick: () => void;
    selectedLine: number | null; 
    flippedGravity: boolean;
}

const LINE_HIGHLIGHT_COLOR = "rgba(6, 182, 212, 0.6)"; 

const LineSelectionModal: React.FC<LineSelectionModalProps> = ({
    onConfirm, onCancel, handleUiHover, handleUiClick, selectedLine, flippedGravity
}) => {
    const [localSelectedRow, setLocalSelectedRow] = useState<number | null>(selectedLine);

    const handleRowClick = (row: number) => {
        handleUiClick();
        setLocalSelectedRow(row);
    };

    const confirmSelection = () => {
        if (localSelectedRow !== null) {
            onConfirm(localSelectedRow);
        }
    };

    const isConfirmEnabled = localSelectedRow !== null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-[#0a0f1e] border-l-4 border-cyan-500 p-8 md:p-12 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-lg w-[90%] text-center">
                <div className="absolute top-4 right-4 text-cyan-500/20 group-hover:text-cyan-500/50 transition-colors skew-x-[10deg] animate-pulse" aria-hidden="true"><Sparkles size={80} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>LINE CLEARER!</h2>
                <p className="text-gray-300 text-sm mb-8 skew-x-[10deg]">Select a single line to clear.</p>

                <div className="relative w-full aspect-[10/20] bg-gray-900 border border-gray-700 mx-auto mb-8 overflow-hidden skew-x-[10deg]">
                    {[...Array(STAGE_HEIGHT)].map((_, y) => {
                        const isSelected = localSelectedRow === y;
                        return (
                            <button
                                key={y}
                                onClick={() => handleRowClick(y)}
                                onMouseEnter={() => { handleUiHover(); setLocalSelectedRow(y); }}
                                onMouseLeave={() => { }} 
                                className={`absolute left-0 w-full h-[5%] flex items-center justify-center border-b border-gray-800 transition-all duration-100
                                    ${isSelected ? 'bg-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.7)]' : 'hover:bg-gray-700/50'}
                                `}
                                style={{
                                    top: `${(flippedGravity ? STAGE_HEIGHT - 1 - y : y) * 5}%`,
                                    borderColor: isSelected ? LINE_HIGHLIGHT_COLOR : 'rgba(255,255,255,0.05)',
                                    zIndex: isSelected ? 10 : 1
                                }}
                                aria-label={`Select row ${y + 1}`}
                            >
                                {isSelected && (
                                    <span className="text-white font-bold text-lg pointer-events-none">CLEARED</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-center gap-4 mt-8 skew-x-[10deg]">
                    <button
                        onClick={() => { handleUiClick(); onCancel(); }}
                        onMouseEnter={handleUiHover}
                        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold uppercase tracking-widest rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmSelection}
                        onMouseEnter={handleUiHover}
                        className={`px-8 py-3 ${isConfirmEnabled ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-gray-500 cursor-not-allowed'} text-white font-bold uppercase tracking-widest rounded transition-colors`}
                        disabled={!isConfirmEnabled}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};


const App = () => {
  const {
    engine, 
    stats, // Consolidated stats object
    nextQueue, heldPiece, canHold,
    lastHoldTime,
    resetGame, setGameState, gameState, gameMode,
    touchControls, aiHint, setGameConfig,
    controls, setKeyBinding, comboCount, isBackToBack, garbagePending,
    pieceIsGrounded, flippedGravity,
    wildcardPieceActive, chooseWildcardPiece,
    triggerBombBoosterSelection, confirmBombBooster, cancelBombBoosterSelection,
    isSelectingBombRows, bombRowsToClear,
    triggerLineClearerSelection, confirmLineClearer, cancelLineClearerSelection,
    isSelectingLine, selectedLineToClear,
    blitzSpeedThresholdIndex 
  } = useTetrios();

  const {
      isSettingsOpen, openSettings, toggleMute,
      isMuted, shakeClass, setShakeClass, showAi, toggleShowAi,
      flashOverlay, setFlashOverlay, visualEffect: uiVisualEffect, clearVisualEffect,
      musicEnabled,
  } = useUiStore();

  const {
      ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity,
      gameSpeed, lockWarning, das, arr
  } = useGameSettingsStore();

  const {
      setCurrentLevel, getCurrentLevelConfig, unlockNextLevel, getLevelConfig, getFailedAttempts, setStarsEarned
  } = useAdventureStore();

  const {
      coins, ownedBoosters, activeBoosters, toggleActiveBooster, applyLevelRewards
  } = useBoosterStore();

  const [cellSize, setCellSize] = useState(30);
  const [highScore, setHighScore] = useState(0);
  const [currentStory, setCurrentStory] = useState<StoryNode[] | null>(null);
  const [currentTutorialTip, setCurrentTutorialTip] = useState<string | null>(null);
  const [lastRewards, setLastRewards] = useState<LevelRewards | null>(null); 


  const particlesRef = useRef<ParticlesHandle>(null);
  const gameOverModalRef = useRef<HTMLDivElement>(null);
  const pausedModalRef = useRef<HTMLDivElement>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      const initAudio = () => audioManager.init();
      window.addEventListener('click', initAudio, { once: true });
      window.addEventListener('keydown', initAudio, { once: true });
  }, []);

  useEffect(() => {
      setGameConfig({ speed: gameSpeed, das, arr });
  }, [gameSpeed, das, arr, setGameConfig]);

  useEffect(() => {
      audioManager.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
      if (gameState === 'PLAYING' && musicEnabled) {
          audioManager.startMusic();
      } else {
          audioManager.stopMusic();
      }
  }, [gameState, musicEnabled]);

  useEffect(() => {
      if (stats.score > highScore) setHighScore(stats.score);
  }, [stats.score, highScore]);
  
  useEffect(() => {
      if (gameState === 'VICTORY' && gameMode === 'ADVENTURE') {
          const config = getCurrentLevelConfig();
          if (config) {
              const calculatedStars = calculateStars(engine.current);
              const calculatedCoins = calculateCoins(engine.current, calculatedStars);
              const boosterRewards = config.rewards?.boosters || []; 
              const rewards: LevelRewards = { coins: calculatedCoins, stars: calculatedStars, boosterRewards };
              setLastRewards(rewards);
              applyLevelRewards(rewards, config); 

              if (config.storyEnd) {
                  setCurrentStory(config.storyEnd); 
                  setGameState('STORY'); 
              } else {
                  setGameState('MAP'); 
              }
              unlockNextLevel(); 
          }
      } else if (gameState === 'GAMEOVER' && gameMode === 'ADVENTURE') {
        setLastRewards(null); 
      } else if ((gameState === 'GAMEOVER' || gameState === 'VICTORY') && gameMode !== 'ADVENTURE') {
          const calculatedCoins = calculateCoins(engine.current, 0); 
          const rewards: LevelRewards = { coins: calculatedCoins, stars: 0 };
          setLastRewards(rewards);
          applyLevelRewards(rewards); 
      }
  }, [gameState, gameMode, getCurrentLevelConfig, unlockNextLevel, applyLevelRewards]);

  const launchAdventureLevel = useCallback((levelId: string) => {
      setCurrentLevel(levelId);
      const config = getLevelConfig(levelId);
      if (config) {
          setGameState('BOOSTER_SELECTION'); 
      }
  }, [getLevelConfig, setCurrentLevel, setGameState]);

  const onStoryComplete = useCallback(() => {
      const config = getCurrentLevelConfig();
      if (config) {
          if (currentStory === config.storyStart) {
              const failedAttempts = getFailedAttempts(config.id);
              const assistRows = failedAttempts >= 3 ? 1 : 0; 
              resetGame(0, 'ADVENTURE', config, assistRows, activeBoosters); 
              setGameState('PLAYING');
              setCurrentStory(null);
              if (config.tutorialTip) {
                  setCurrentTutorialTip(config.tutorialTip.text);
              }
          } 
          else if (currentStory === config.storyEnd) {
              setGameState('MAP');
              setCurrentStory(null);
          }
      } else {
          setGameState('MENU'); 
          setCurrentStory(null);
      }
  }, [currentStory, getCurrentLevelConfig, engine, setGameState, getFailedAttempts, resetGame, activeBoosters]);

  const onDismissTutorialTip = useCallback(() => {
      audioManager.playUiBack();
      setCurrentTutorialTip(null);
  }, []);

  useEffect(() => {
      const handleResize = () => {
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          const verticalPadding = 140; 
          const maxVerticalSize = Math.floor((vh - verticalPadding) / 20);
          let maxHorizontalSize = 40; 
          if (vw >= 1024) { 
              const availableCenterWidth = vw - 500;
              const targetWidth = Math.min(availableCenterWidth, vw * 0.4);
              maxHorizontalSize = Math.floor(targetWidth / 10);
          } else { 
              const horizontalPadding = 32;
              maxHorizontalSize = Math.floor((vw - horizontalPadding) / 10);
          }
          const idealSize = Math.min(maxVerticalSize, maxHorizontalSize);
          setCellSize(Math.max(18, Math.min(45, idealSize)));
      };
      
      const resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
      resizeObserver.observe(document.body);
      handleResize(); 
      return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
      handleVisualEffect(
        uiVisualEffect,
        particlesRef,
        setShakeClass,
        setFlashOverlay,
        cellSize,
        clearVisualEffect
      );
  }, [uiVisualEffect, setShakeClass, setFlashOverlay, clearVisualEffect, particlesRef, cellSize]); 

  useEffect(() => {
      if (gameState === 'GAMEOVER') {
          setShakeClass('shake-hard');
          setTimeout(() => setShakeClass(''), SHAKE_DURATION_HARD_MS);
      }
  }, [gameState, setShakeClass]);

  const handleToggleMute = () => {
     toggleMute(); 
     audioManager.toggleMute(); 
     audioManager.playUiClick();
  };

  const currentAdventureLevelConfig = getCurrentLevelConfig();

  const backgroundStyle = useMemo(() => {
      if (gameMode === 'ADVENTURE' && currentAdventureLevelConfig) {
          if (flippedGravity) {
              const bg = currentAdventureLevelConfig.style.background;
              if (bg.startsWith('linear-gradient(to bottom')) {
                  return {
                      background: bg.replace('to bottom', 'to top'),
                      transition: 'background 2s cubic-bezier(0.4, 0, 0.2, 1)'
                  };
              }
              return {
                  background: currentAdventureLevelConfig.style.background,
                  transition: 'background 2s cubic-bezier(0.4, 0, 0.2, 1)'
              };
          }
          return currentAdventureLevelConfig.style;
      }
      const baseHue = (220 + (stats.level * 25)) % 360; 
      const secondaryHue = (baseHue + 140) % 360; 
      return {
          background: `radial-gradient(circle at 50% -10%, hsl(${baseHue}, 60%, 12%) 0%, transparent 80%), radial-gradient(circle at 90% 90%, hsl(${secondaryHue}, 40%, 8%) 0%, transparent 60%), #030712`,
          transition: 'background 2s cubic-bezier(0.4, 0, 0.2, 1)'
      };
  }, [stats.level, gameMode, currentAdventureLevelConfig, flippedGravity]);

  const boardRenderCoreConfig = useMemo<Omit<BoardRenderConfig, 'bombSelectionRows' | 'lineClearerSelectedRow'>>(() => ({
    cellSize,
    ghostStyle,
    ghostOpacity,
    ghostOutlineThickness,
    ghostGlowIntensity,
    ghostShadow: GHOST_SHADOW,
    lockWarningEnabled: lockWarning,
    showAi,
    aiHint,
    pieceIsGrounded, 
    gimmicks: currentAdventureLevelConfig?.gimmicks,
    flippedGravity,
    wildcardPieceAvailable: stats.wildcardAvailable,
  }), [cellSize, ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, lockWarning, showAi, aiHint, pieceIsGrounded, currentAdventureLevelConfig?.gimmicks, flippedGravity, stats.wildcardAvailable]);

  const handleUiHover = () => audioManager.playUiHover();
  const handleUiClick = () => audioManager.playUiClick();

  const handleShareScore = useCallback(async () => {
    audioManager.playUiClick();
    const shareData = {
        title: 'TETRIOS High Score!',
        text: `I just scored ${stats.score} in TETRIOS ${gameMode.replace('_', ' ')} mode! Can you beat it?`,
        url: window.location.origin, 
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            alert('Score copied to clipboard! Share it with your friends.');
        } else {
          alert('Sharing is not supported in this browser.');
        }
    } catch (err) {
        console.error('Error sharing:', err);
        alert('Failed to share score. Please try again.'); 
    }
  }, [stats.score, gameMode]);

  const calculateStars = (gameInstance: GameCore): number => {
    if (!gameInstance.adventureManager.config) return 0;

    let stars = 0;
    const objective = gameInstance.adventureManager.config.objective;

    let currentProgress = 0;
    switch (objective.type) {
        case 'LINES': currentProgress = gameInstance.stats.rows; break;
        case 'SCORE': currentProgress = gameInstance.stats.score; break;
        case 'GEMS': currentProgress = gameInstance.stats.gemsCollected || 0; break;
        case 'BOMBS': currentProgress = gameInstance.stats.bombsDefused || 0; break;
        case 'TETRIS': currentProgress = gameInstance.stats.tetrisesAchieved || 0; break;
        case 'COMBO': currentProgress = gameInstance.stats.combosAchieved || 0; break;
        case 'MOVES': currentProgress = gameInstance.stats.movesTaken || 0; break;
        default: break;
    }

    if (objective.type === 'TIME_SURVIVAL') {
        const timeLimit = gameInstance.adventureManager.config.constraints?.timeLimit || 1;
        const timeRemaining = gameInstance.stats.time || 0;
        if (timeRemaining >= timeLimit * 0.75) stars = 3;
        else if (timeRemaining >= timeLimit * 0.5) stars = 2;
        else if (timeRemaining > 0) stars = 1;
        else if (timeRemaining <= 0) stars = 3; 
    } else if (objective.type === 'BOSS') {
        const totalBossHp = gameInstance.adventureManager.config.objective.target;
        const bossHpRemaining = gameInstance.adventureManager.bossHp;
        const damageDealt = totalBossHp - bossHpRemaining;
        const damageRatio = damageDealt / totalBossHp; 
        
        if (damageRatio >= 0.95) stars = 3; 
        else if (damageRatio >= 0.75) stars = 2;
        else if (damageRatio > 0) stars = 1;
    } else {
        const progress = currentProgress / objective.target;
        if (progress >= 1) stars = 3;
        else if (progress >= 0.75) stars = 2;
        else if (progress >= 0.5) stars = 1;
    }
    
    return Math.min(MAX_STARS_PER_LEVEL, Math.max(0, stars)); 
  };

  const calculateCoins = (gameInstance: GameCore, stars: number): number => {
      let earnedCoins = LEVEL_PASS_COIN_REWARD; 

      if (gameInstance.mode === 'ADVENTURE') {
          earnedCoins += stars * STAR_COIN_BONUS;
          earnedCoins += gameInstance.adventureManager.config?.rewards?.coins || 0;
      } else if (gameInstance.mode === 'BLITZ') { 
          earnedCoins = Math.floor(gameInstance.stats.score / 500); 
      }
      else if (gameInstance.mode !== 'ZEN' && gameInstance.mode !== 'PUZZLE') {
          earnedCoins += Math.floor(gameInstance.stats.score / 100);
      }
      return earnedCoins;
  };


  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center text-white overflow-hidden font-sans selection:bg-cyan-500/30 ${shakeClass}`} style={backgroundStyle}>
      <MusicVisualizer />
      <div className="fixed inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
      <div className={`fixed inset-0 pointer-events-none z-[60] transition-opacity duration-300 ${flashOverlay ? 'opacity-40' : 'opacity-0'}`} style={{ backgroundColor: flashOverlay || 'transparent', mixBlendMode: 'screen' }}></div>
      
      {isSettingsOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl text-cyan-400 text-xl font-bold uppercase tracking-widest">Loading Settings...</div>}>
              <LazySettings controls={controls} setKeyBinding={setKeyBinding} />
          </Suspense>
      )}

      {gameState === 'MAP' && (
          <AdventureMap 
            onSelectLevel={launchAdventureLevel} 
            onBack={() => setGameState('MENU')} 
            coins={coins}
            getStarsEarned={useAdventureStore.getState().getStarsEarned}
          />
      )}

      {gameState === 'STORY' && currentStory && (
          <StoryOverlay story={currentStory} onComplete={onStoryComplete} />
      )}

      {currentTutorialTip && gameState === 'PLAYING' && (
          <TutorialTip text={currentTutorialTip} onDismiss={onDismissTutorialTip} />
      )}

      <GameOverlayManager
          gameState={gameState}
          highScore={highScore}
          stats={stats}
          gameMode={gameMode}
          lastRewards={lastRewards}
          resetGame={(lvl, mode, config, assistRows, boosters) => {
              resetGame(lvl, mode, config, assistRows, boosters);
          }}
          setGameState={setGameState}
          handleShareScore={handleShareScore}
          handleUiHover={handleUiHover}
          handleUiClick={handleUiClick}
          openSettings={openSettings}
          mainMenuRef={mainMenuRef}
          gameOverModalRef={gameOverModalRef}
          pausedModalRef={pausedModalRef}
          getCurrentAdventureLevelConfig={getCurrentLevelConfig}
          getOwnedBoosters={ownedBoosters}
          getActiveBoosters={activeBoosters}
          toggleActiveBooster={toggleActiveBooster}
          coins={coins}
          wildcardPieceActive={wildcardPieceActive}
          chooseWildcardPiece={chooseWildcardPiece}
          isSelectingBombRows={isSelectingBombRows}
          bombRowsToClear={bombRowsToClear}
          confirmBombBooster={confirmBombBooster}
          cancelBombBoosterSelection={cancelBombBoosterSelection}
          isSelectingLine={isSelectingLine}
          selectedLineToClear={selectedLineToClear} 
          confirmLineClearer={confirmLineClearer} 
          cancelLineClearerSelection={cancelLineClearerSelection} 
          flippedGravity={flippedGravity}
          blitzSpeedThresholdIndex={blitzSpeedThresholdIndex}
      />

      {gameState !== 'MENU' && gameState !== 'GAMEOVER' && gameState !== 'PAUSED' && gameState !== 'MAP' && gameState !== 'STORY' && gameState !== 'BOOSTER_SELECTION' && gameState !== 'WILDCARD_SELECTION' && gameState !== 'BOMB_SELECTION' && gameState !== 'LINE_SELECTION' && ( 
          <GameScreen
              engine={engine}
              stats={stats}
              nextQueue={nextQueue}
              heldPiece={heldPiece}
              canHold={canHold}
              lastHoldTime={lastHoldTime}
              gameMode={gameMode}
              aiHint={aiHint}
              cellSize={cellSize}
              boardRenderCoreConfig={boardRenderCoreConfig}
              bombSelectionRows={isSelectingBombRows ? Array.from({length: bombRowsToClear}, (_, i) => i) : undefined}
              lineClearerSelectedRow={isSelectingLine ? selectedLineToClear : null}
              particlesRef={particlesRef}
              touchControls={touchControls}
              handleUiHover={handleUiHover}
              handleUiClick={handleUiClick}
              showAi={showAi}
              toggleShowAi={toggleShowAi}
              isMuted={isMuted}
              toggleMute={handleToggleMute}
              controls={controls}
              setKeyBinding={setKeyBinding}
              comboCount={comboCount}
              isBackToBack={isBackToBack}
              garbagePending={garbagePending}
              gameState={gameState}
              setGameState={setGameState}
              openSettings={openSettings}
              pieceIsGrounded={pieceIsGrounded} 
              flippedGravity={flippedGravity}
              adventureLevelConfig={currentAdventureLevelConfig}
              isSelectingBombRows={isSelectingBombRows} 
              isSelectingLine={isSelectingLine} 
              blitzSpeedThresholdIndex={blitzSpeedThresholdIndex} 
          />
      )}
    </div>
  );
};

export default App;

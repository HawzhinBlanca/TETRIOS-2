
import React, { useRef } from 'react';
import { useGestures } from '../hooks/useGestures';
import BoardCanvas from './BoardCanvas';
import Preview from './Preview';
import StatsPanel from './StatsPanel';
import ComboIndicator from './ComboIndicator';
import GarbageDisplay from './GarbageDisplay';
import Particles, { ParticlesHandle } from './Particles';
import { Settings as SettingsIcon, Volume2, VolumeX, Brain, Bomb, Sparkles } from 'lucide-react';
import { BoardRenderConfig, AdventureLevelConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { audioManager } from '../utils/audioManager';

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
}

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
}) => {
    const {
        engine,
        stats,
        nextQueue,
        heldPiece,
        canHold,
        lastHoldTime,
        gameMode,
        aiHint,
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
        blitzSpeedThresholdIndex
    } = useGameContext();

    const boardContainerRef = useRef<HTMLDivElement>(null);
    const holdIntervalRef = useRef<number | null>(null);
    const levelProgress = (stats.rows % 10) / 10;

    const handleUiHover = () => audioManager.playUiHover();
    const handleUiClick = () => audioManager.playUiClick();

    useGestures(boardContainerRef, {
        onSwipeLeft: () => touchControls.move(-1),
        onSwipeRight: () => touchControls.move(1),
        onSwipeUp: () => flippedGravity ? touchControls.hardDrop() : touchControls.hold(),
        onSwipeDown: () => flippedGravity ? touchControls.hold() : touchControls.hardDrop(),
        onTap: () => touchControls.rotate(1),
        onHold: (active) => {
            if (active) {
                if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
                touchControls.softDrop();
                holdIntervalRef.current = window.setInterval(() => {
                    touchControls.softDrop();
                }, 50);
            } else {
                if (holdIntervalRef.current) {
                    window.clearInterval(holdIntervalRef.current);
                    holdIntervalRef.current = null;
                }
            }
        }
    });

    return (
        <main id="main-app-content" className="w-full h-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center p-4 relative z-10 gap-8 transition-all duration-500 ease-out">
            {/* Left Panel - Stats & Controls */}
            <aside className="hidden lg:flex flex-col flex-1 h-full justify-center items-end space-y-6 py-8 animate-slide-in delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="mb-6 text-right select-none">
                    <h1 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg opacity-90">TETRIOS</h1>
                    <div className="flex items-center justify-end gap-2 mt-2 opacity-70">
                        <span className="text-[10px] text-cyan-400 uppercase tracking-[0.3em] font-bold">{gameMode.replace('_', ' ')}</span>
                        <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
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
                
                {/* Desktop Controls Bar */}
                <nav className="grid grid-cols-3 gap-3 w-full max-w-[240px] mt-auto bg-gray-900/40 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl" aria-label="Game Controls">
                    <button onClick={() => {handleUiClick(); openSettings();}} onMouseEnter={handleUiHover} className="flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group" title="Settings" aria-label="Open Settings">
                        <SettingsIcon size={20} className="text-gray-400 group-hover:text-white transition-colors" aria-hidden="true" />
                    </button>
                    <button onClick={toggleMute} onMouseEnter={handleUiHover} className="flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group" title="Mute Audio" aria-label={isMuted ? "Unmute Audio" : "Mute Audio"}>
                        {isMuted ? <VolumeX size={20} className="text-red-400" aria-hidden="true"/> : <Volume2 size={20} className="text-cyan-400" aria-hidden="true"/>}
                    </button>
                    <button onClick={() => { handleUiClick(); toggleShowAi(); }} onMouseEnter={handleUiHover} className={`flex items-center justify-center p-3 rounded-xl transition-colors group ${showAi ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`} title="Toggle AI Assistant" aria-label={showAi ? "Hide AI Assistant" : "Show AI Assistant"}>
                        <Brain size={20} aria-hidden="true" />
                    </button>
                    
                    {stats.bombBoosterReady && gameMode === 'ADVENTURE' && !isSelectingBombRows && !isSelectingLine && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerBombBooster(); }} onMouseEnter={handleUiHover} className="col-span-3 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-red-500/40" aria-label="Activate Bomb Booster">
                            <Bomb size={16} /> Bomb
                        </button>
                    )}
                    {stats.lineClearerActive && gameMode === 'ADVENTURE' && !isSelectingLine && !isSelectingBombRows && (
                        <button onClick={() => { handleUiClick(); touchControls.triggerLineClearer(); }} onMouseEnter={handleUiHover} className="col-span-3 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/40" aria-label="Activate Line Clearer Booster">
                            <Sparkles size={16} /> Line Clear
                        </button>
                    )}
                </nav>
            </aside>

            {/* Center - Board */}
            <section className="flex-shrink-0 relative z-20" aria-label="Game Board">
                <div className="relative p-3 bg-gray-900/60 rounded-lg backdrop-blur-xl shadow-2xl ring-1 ring-white/10 transition-transform hover:scale-[1.005] duration-500 ease-out group" ref={boardContainerRef}>
                    {/* Subtle corner accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-white/30 rounded-tl-lg group-hover:border-cyan-400 transition-colors"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-white/30 rounded-tr-lg group-hover:border-cyan-400 transition-colors"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-white/30 rounded-bl-lg group-hover:border-cyan-400 transition-colors"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-white/30 rounded-br-lg group-hover:border-cyan-400 transition-colors"></div>
                    
                    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-lg" aria-hidden="true"><Particles ref={particlesRef} cellSize={cellSize} /></div>
                    
                    <BoardCanvas 
                        engine={engine} 
                        renderConfig={boardRenderCoreConfig} 
                        bombSelectionRows={isSelectingBombRows ? Array.from({length: bombRowsToClear}, (_, i) => i) : undefined}
                        lineClearerSelectedRow={isSelectingLine ? selectedLineToClear : null}
                        className="rounded shadow-inner bg-black/80" 
                    />
                </div>
            </section>

            {/* Right Panel - Next & Hold */}
            <aside className="hidden lg:flex flex-col flex-1 h-full justify-center items-start space-y-8 py-8 pl-4 animate-slide-in delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="w-full max-w-[180px]">
                     <div className="relative mb-6 p-4 bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg">
                        <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-3">Next Unit</div>
                        <div className="flex justify-center">
                            <Preview title="" type={nextQueue[0]} aria-label="Next Tetromino" />
                        </div>
                     </div>

                    <div className="pl-4 border-l-2 border-white/5 space-y-2" aria-label="Upcoming Tetrominos">
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 pl-1">Queue</div>
                        {nextQueue.slice(1, 5).map((type, i) => (
                            <div key={i} className="opacity-60 scale-90 origin-left"><Preview title="" type={type} aria-label={`Upcoming Tetromino ${i + 1}`} /></div>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-[180px]">
                    <button 
                        onClick={() => canHold && touchControls.hold()} 
                        className={`w-full p-4 bg-gray-900/40 backdrop-blur-md border rounded-2xl shadow-lg transition-all duration-300 group
                            ${canHold ? 'border-white/10 hover:border-cyan-500/50 hover:bg-gray-800/60' : 'border-red-500/20 bg-red-900/10'}
                        `}
                        disabled={!canHold} 
                        aria-label="Hold Piece (C)"
                    >
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 group-hover:text-cyan-400 transition-colors">Hold (C)</div>
                        <div className="flex justify-center group-hover:scale-105 transition-transform">
                            <Preview title="" type={heldPiece} lastUpdate={lastHoldTime} />
                        </div>
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-40 pointer-events-none" aria-live="polite" aria-atomic="true">
                <div className="bg-black/60 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 pointer-events-auto shadow-lg">
                    <div className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Score</div>
                    <div className="text-lg font-mono font-bold text-white leading-none">{stats.score}</div>
                </div>
                <div className="bg-black/60 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 pointer-events-auto shadow-lg">
                    <div className="text-[8px] text-cyan-400 uppercase font-bold tracking-wider">{gameMode === 'SPRINT' ? 'Lines' : 'Lvl ' + stats.level}</div>
                    <div className="h-1 w-12 bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${levelProgress * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default GameScreen;

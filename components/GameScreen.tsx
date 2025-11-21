
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
        // When gravity is flipped, "Up" is the direction of the fall.
        // So Swipe Up (visually towards ceiling) should be Hard Drop (towards ceiling).
        // And Swipe Down should swap to Hold.
        onSwipeUp: () => flippedGravity ? touchControls.hardDrop() : touchControls.hold(),
        onSwipeDown: () => flippedGravity ? touchControls.hold() : touchControls.hardDrop(),
        onTap: () => touchControls.rotate(1),
        onHold: (active) => {
            if (active) {
                if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
                touchControls.softDrop();
                holdIntervalRef.current = window.setInterval(() => {
                    touchControls.softDrop();
                }, 50); // Fast soft drop repeat
            } else {
                if (holdIntervalRef.current) {
                    window.clearInterval(holdIntervalRef.current);
                    holdIntervalRef.current = null;
                }
            }
        }
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
                        bombSelectionRows={isSelectingBombRows ? Array.from({length: bombRowsToClear}, (_, i) => i) : undefined}
                        lineClearerSelectedRow={isSelectingLine ? selectedLineToClear : null}
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
        </main>
    );
};

export default GameScreen;

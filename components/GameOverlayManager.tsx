
import React, { useEffect, Suspense } from 'react';
import { GameState, LevelRewards } from '../types';
import { Trophy, Receipt, Loader2 } from 'lucide-react';
import { useGameContext } from '../contexts/GameContext';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useModalStore } from '../stores/modalStore';
import Countdown from './ui/Countdown'; 
import GlassPanel from './ui/GlassPanel';
import { formatTime } from '../utils/formatters';
import { useUiSound } from '../hooks/useUiSound';

// Lazy Load Components
const LazyMainMenu = React.lazy(() => import('./MainMenu'));
const LazyBoosterSelectionModal = React.lazy(() => import('./modals/BoosterSelectionModal').then(module => ({ default: module.BoosterSelectionModal })));
const LazyWildcardSelectionModal = React.lazy(() => import('./modals/WildcardSelectionModal').then(module => ({ default: module.WildcardSelectionModal })));
const LazyBombSelectionModal = React.lazy(() => import('./modals/BombSelectionModal').then(module => ({ default: module.BombSelectionModal })));
const LazyLineSelectionModal = React.lazy(() => import('./modals/LineSelectionModal').then(module => ({ default: module.LineSelectionModal })));
const LazyLeaderboardModal = React.lazy(() => import('./modals/LeaderboardModal').then(module => ({ default: module.LeaderboardModal })));

interface GameOverlayManagerProps {
    gameState: GameState;
    setGameState: (state: GameState) => void;
    highScore: number;
    lastRewards: LevelRewards | null;
    openSettings: () => void;
    handleShareScore: () => Promise<void>;
    mainMenuRef: React.RefObject<HTMLDivElement>;
    gameOverModalRef: React.RefObject<HTMLDivElement>;
    pausedModalRef: React.RefObject<HTMLDivElement>;
}

export const GameOverlayManager: React.FC<GameOverlayManagerProps> = ({
    gameState,
    setGameState,
    highScore,
    lastRewards,
    openSettings,
    handleShareScore,
    mainMenuRef,
    gameOverModalRef,
    pausedModalRef,
}) => {
    const {
        resetGame,
        stats,
        gameMode,
        difficulty,
        wildcardPieceActive,
        chooseWildcardPiece,
        isSelectingBombRows,
        bombRowsToClear,
        confirmBombBooster,
        cancelBombBoosterSelection,
        isSelectingLine,
        selectedLineToClear,
        confirmLineClearer,
        cancelLineClearerSelection,
        flippedGravity,
        savedGameExists,
        continueGame,
        engine // Access engine directly for save
    } = useGameContext();

    const { getCurrentLevelConfig } = useAdventureStore();
    const { coins, ownedBoosters, activeBoosters, toggleActiveBooster } = useBoosterStore();
    const { isLeaderboardOpen } = useModalStore();
    const { handleUiHover, handleUiClick } = useUiSound();

    // Get current grid height for modals
    const gridHeight = engine.current?.grid.height || 24;

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
            if (['GAMEOVER', 'VICTORY', 'PAUSED', 'MENU', 'MAP', 'STORY', 'BOOSTER_SELECTION', 'WILDCARD_SELECTION', 'BOMB_SELECTION', 'LINE_SELECTION', 'COUNTDOWN'].includes(gameState)) {
                mainContent.setAttribute('aria-hidden', 'true');
            } else {
                mainContent.removeAttribute('aria-hidden');
            }
        }
    }, [gameState, gameOverModalRef, pausedModalRef, mainMenuRef]);

    const currentAdventureConfig = getCurrentLevelConfig();

    const LoadingFallback = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
            <GlassPanel variant="default" className="p-8 flex flex-col items-center gap-4 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <Loader2 className="animate-spin text-cyan-400" size={48} />
                <div className="text-cyan-400 text-sm font-bold uppercase tracking-widest animate-pulse">Initializing System...</div>
            </GlassPanel>
        </div>
    );

    const ReceiptRow = ({ label, value, dots = true }: { label: string, value: string, dots?: boolean }) => (
        <div className="flex justify-between items-center text-xs font-mono mb-1 text-gray-800 uppercase">
            <span>{label}</span>
            {dots && <span className="flex-1 mx-1 border-b border-dotted border-gray-400 h-3"></span>}
            <span className="font-bold">{value}</span>
        </div>
    );

    return (
        <>
            {isLeaderboardOpen && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyLeaderboardModal />
                </Suspense>
            )}

            {gameState === 'MENU' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyMainMenu 
                        onStart={(lvl, mode, diff) => {
                            if(mode === 'ADVENTURE') {
                                setGameState('MAP');
                            } else {
                                resetGame(lvl, mode, undefined, 0, [], diff);
                                setGameState('COUNTDOWN');
                            }
                        }}
                        onContinue={continueGame}
                        savedGameExists={savedGameExists}
                        ref={mainMenuRef} 
                    />
                </Suspense>
            )}

            {gameState === 'COUNTDOWN' && (
                <Countdown onComplete={() => setGameState('PLAYING')} />
            )}

            {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300" ref={gameOverModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={gameState === 'VICTORY' ? 'Victory' : 'Game Over'} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) gameOverModalRef.current?.focus(); }}>
                    
                    {/* The Receipt / Flex Card */}
                    <div className="bg-[#f0f0f0] text-black w-[320px] shadow-2xl relative rotate-1 transform transition-transform hover:rotate-0 duration-300 font-mono mb-8 p-0 overflow-hidden">
                        {/* Jagged Top */}
                        <div className="w-full h-4 bg-gray-900 relative">
                             <div className="absolute -bottom-2 left-0 w-full h-4 bg-[#f0f0f0]" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
                        </div>

                        <div className="p-6 pt-8 pb-8 flex flex-col items-center">
                            <div className="border-2 border-black rounded-full p-2 mb-2">
                                {gameState === 'VICTORY' ? <Trophy size={24} /> : <Receipt size={24} />}
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">TETRIOS RECEIPTS</h2>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-6 border-b border-black w-full text-center pb-2">
                                Official Game Record
                            </div>

                            <div className="w-full space-y-1 mb-6">
                                <ReceiptRow label="STATUS" value={gameState === 'VICTORY' ? 'COMPLETE' : 'WASTED'} />
                                <ReceiptRow label="MODE" value={gameMode} />
                                <ReceiptRow label="DIFFICULTY" value={difficulty} />
                                <div className="border-b border-dashed border-gray-400 my-2"></div>
                                <ReceiptRow label="FINAL SCORE" value={stats.score.toLocaleString()} />
                                <ReceiptRow label="LINES" value={stats.rows.toString()} />
                                <ReceiptRow label="MAX COMBO" value={stats.combosAchieved?.toString() || '0'} />
                                <ReceiptRow label="RIZZ LEVEL" value={stats.isZoneActive || stats.focusGauge >= 100 ? 'MAX' : `${Math.floor(stats.focusGauge)}%`} />
                                {stats.score >= highScore && stats.score > 0 && (
                                    <div className="text-center mt-2 font-black text-sm bg-black text-white py-1 rotate-[-2deg]">
                                        NEW HIGH SCORE!
                                    </div>
                                )}
                            </div>

                            <div className="text-[10px] text-center text-gray-500 mb-2">
                                {new Date().toLocaleString()}
                            </div>
                            <div className="w-full flex justify-center">
                                {/* Barcode Simulation */}
                                <div className="h-8 w-2/3 bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px)]"></div>
                            </div>
                        </div>

                        {/* Jagged Bottom */}
                        <div className="w-full h-4 bg-[#f0f0f0] relative -mb-2">
                             <div className="absolute top-0 left-0 w-full h-4 bg-black/50" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button onClick={() => { 
                            handleUiClick(); 
                            if (gameMode === 'ADVENTURE') {
                                const config = getCurrentLevelConfig();
                                const failedAttempts = useAdventureStore.getState().getFailedAttempts(config?.id || '');
                                const assistRows = failedAttempts >= 4 ? 2 : (failedAttempts >= 2 ? 1 : 0);
                                resetGame(0, gameMode, config, assistRows, useBoosterStore.getState().activeBoosters, difficulty);
                            } else {
                                resetGame(gameMode === 'MARATHON' ? stats.level : 0, gameMode, undefined, 0, [], difficulty); 
                            }
                            setGameState('COUNTDOWN');
                        }} onMouseEnter={handleUiHover} className={`w-full py-4 ${gameState === 'VICTORY' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500'} text-white font-bold uppercase tracking-[0.2em] rounded transition-all flex items-center justify-center gap-3 shadow-lg`} aria-label="Retry Game">
                            <span aria-hidden="true">↻</span>
                            {gameMode === 'ADVENTURE' ? 'Retry Mission' : 'Run It Back'}
                        </button>

                        {gameState === 'VICTORY' && gameMode === 'ADVENTURE' && (
                            <button 
                                onClick={() => {
                                    handleUiClick();
                                    if (currentAdventureConfig?.storyEnd) {
                                        setGameState('STORY');
                                    } else {
                                        setGameState('MAP');
                                    }
                                }}
                                onMouseEnter={handleUiHover}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-3 shadow-lg"
                                aria-label="Proceed to Next Level"
                            >
                                <span aria-hidden="true">→</span> Next Mission
                            </button>
                        )}

                        <button onClick={() => { handleUiClick(); setGameState(gameMode === 'ADVENTURE' ? 'MAP' : 'MENU'); }} onMouseEnter={handleUiHover} className="w-full py-3 bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-white font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-3" aria-label="Back to Menu">
                            {gameMode === 'ADVENTURE' ? 'Return to Map' : 'Main Menu'}
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'PAUSED' && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" ref={pausedModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Game Paused" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) pausedModalRef.current?.focus(); }}>
                    <div className="bg-[#0a0f1e] border-l-4 border-yellow-500 p-8 md:p-12 md:pr-24 skew-x-[-10deg] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group max-w-[90%]">
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter skew-x-[10deg] italic" role="heading" aria-level={2}>PAUSED</h2>
                        <div className="h-1 w-24 bg-yellow-500 mb-8 skew-x-[10deg]" aria-hidden="true"></div>
                        <div className="space-y-4 skew-x-[10deg]">
                            <button onClick={() => { handleUiClick(); setGameState('PLAYING'); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-white hover:text-yellow-400 transition-colors group/btn w-full" aria-label="Resume Game">
                                <span className="text-lg md:text-xl uppercase tracking-[0.2em] font-bold">Resume Game</span>
                            </button>
                            <button onClick={() => { handleUiClick(); openSettings(); }} onMouseEnter={handleUiHover} className="flex items-center gap-4 text-gray-400 hover:text-white transition-colors group/btn w-full" aria-label="Open Settings">
                                <span className="text-xs md:text-sm uppercase tracking-[0.2em] font-bold">Settings</span>
                            </button>
                            <button 
                                onClick={() => { 
                                    handleUiClick(); 
                                    if (engine.current) {
                                        engine.current.saveGame();
                                    }
                                    setGameState('MENU'); 
                                }} 
                                onMouseEnter={handleUiHover} 
                                className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-colors group/btn w-full pt-4" 
                                aria-label="Save and Quit to Main Menu"
                            >
                                <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                                    Save & Quit
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'BOOSTER_SELECTION' && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyBoosterSelectionModal 
                        onStartGame={(config, assist, boosters) => {
                            resetGame(0, 'ADVENTURE', config, assist, boosters, difficulty);
                            setGameState('COUNTDOWN');
                        }}
                        onBack={() => setGameState('MAP')}
                        handleUiHover={handleUiHover}
                        handleUiClick={handleUiClick}
                        currentLevelConfig={currentAdventureConfig}
                        ownedBoosters={ownedBoosters}
                        activeBoosters={activeBoosters}
                        toggleActiveBooster={toggleActiveBooster}
                        coins={coins}
                    />
                </Suspense>
            )}

            {gameState === 'WILDCARD_SELECTION' && wildcardPieceActive && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyWildcardSelectionModal
                        onSelectPiece={(type) => chooseWildcardPiece(type)}
                        handleUiHover={handleUiHover}
                        handleUiClick={handleUiClick}
                    />
                </Suspense>
            )}

            {gameState === 'BOMB_SELECTION' && isSelectingBombRows && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyBombSelectionModal
                        onConfirm={(startRow, numRows) => confirmBombBooster(startRow, numRows)}
                        onCancel={cancelBombBoosterSelection}
                        handleUiHover={handleUiHover}
                        handleUiClick={handleUiClick}
                        bombRowsToClear={bombRowsToClear}
                        flippedGravity={flippedGravity}
                        gridHeight={gridHeight} 
                    />
                </Suspense>
            )}

            {gameState === 'LINE_SELECTION' && isSelectingLine && (
                <Suspense fallback={<LoadingFallback />}>
                    <LazyLineSelectionModal
                        onConfirm={(selectedRow) => confirmLineClearer(selectedRow)}
                        onCancel={cancelLineClearerSelection}
                        handleUiHover={handleUiHover}
                        handleUiClick={handleUiClick}
                        selectedLine={selectedLineToClear}
                        flippedGravity={flippedGravity} 
                        gridHeight={gridHeight}
                    />
                </Suspense>
            )}
        </>
    );
};

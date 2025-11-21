
import React, { useEffect, useCallback, Suspense } from 'react';
import { GameState, LevelRewards, AdventureLevelConfig, BoosterType, TetrominoType, GameMode } from '../types';
import { Trophy, AlertTriangle, RefreshCw, Share2, PauseCircle, Settings as SettingsIcon } from 'lucide-react';
import { useGameContext } from '../contexts/GameContext';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { audioManager } from '../utils/audioManager';
import { BOOSTERS, MAX_STARS_PER_LEVEL } from '../constants';
import { BoosterSelectionModal } from './modals/BoosterSelectionModal';
import { WildcardSelectionModal } from './modals/WildcardSelectionModal';
import { BombSelectionModal } from './modals/BombSelectionModal';
import { LineSelectionModal } from './modals/LineSelectionModal';

// Lazy Load MainMenu
const LazyMainMenu = React.lazy(() => import('./MainMenu'));

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
        flippedGravity
    } = useGameContext();

    const { getCurrentLevelConfig } = useAdventureStore();
    const { coins, ownedBoosters, activeBoosters, toggleActiveBooster } = useBoosterStore();

    const handleUiHover = () => audioManager.playUiHover();
    const handleUiClick = () => audioManager.playUiClick();

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

    const currentAdventureConfig = getCurrentLevelConfig();

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
                                    const config = getCurrentLevelConfig();
                                    const failedAttempts = useAdventureStore.getState().getFailedAttempts(config?.id || '');
                                    const assistRows = failedAttempts >= 3 ? 1 : 0;
                                    resetGame(0, gameMode, config, assistRows, useBoosterStore.getState().activeBoosters);
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
                    ownedBoosters={ownedBoosters}
                    activeBoosters={activeBoosters}
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

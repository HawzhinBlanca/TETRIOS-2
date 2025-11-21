
import React, { useEffect, useRef, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import Particles, { ParticlesHandle } from './Particles';
import MusicVisualizer from './MusicVisualizer';
import AdventureMap from './AdventureMap';
import StoryOverlay from './StoryOverlay';
import TutorialTip from './TutorialTip';
import GameScreen from './GameScreen';
import { GameOverlayManager } from './GameOverlayManager';
import { audioManager } from '../utils/audioManager';
import { useUiStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { useEffectStore } from '../stores/effectStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { SHAKE_DURATION_HARD_MS, LEVEL_PASS_COIN_REWARD, MAX_STARS_PER_LEVEL, STAR_COIN_BONUS } from '../constants';
import { StoryNode, LevelRewards, BoardRenderConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { GameCore } from '../utils/GameCore';
import { ArrowLeftRight, Play, PauseCircle, Settings as SettingsIcon, Bomb, Sparkles } from 'lucide-react';
import { useVisualEffects } from '../hooks/useVisualEffects';

const LazySettings = lazy(() => import('./Settings'));
const LazyProfile = lazy(() => import('./modals/ProfileModal'));

const GHOST_SHADOW = "rgba(6, 182, 212, 0.6)"; 

export const TetriosGame = () => {
  const {
    engine,
    stats,
    resetGame, 
    setGameState, 
    gameState, 
    gameMode,
    touchControls, 
    setGameConfig,
    controls, 
    setKeyBinding, 
    canHold,
    flippedGravity,
    bombRowsToClear,
    isSelectingBombRows,
    isSelectingLine,
    activeBoosters
  } = useGameContext();

  const {
      isSettingsOpen, openSettings, activeTutorialTip, setTutorialTip, dismissTutorialTip, isProfileOpen
  } = useModalStore();

  const {
      isMuted, toggleMute, musicEnabled
  } = useUiStore();

  const {
      shakeClass, setShakeClass, flashOverlay, setFlashOverlay, 
      visualEffect: uiVisualEffect, clearVisualEffect
  } = useEffectStore();

  const {
      ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity,
      gameSpeed, lockWarning, das, arr, showAi, toggleShowAi
  } = useGameSettingsStore();

  const {
      setCurrentLevel, getCurrentLevelConfig, unlockNextLevel, getLevelConfig, getFailedAttempts, setStarsEarned
  } = useAdventureStore();

  const {
      coins, ownedBoosters, activeBoosters: storeActiveBoosters, toggleActiveBooster, applyLevelRewards
  } = useBoosterStore();

  const [cellSize, setCellSize] = useState(30);
  const [highScore, setHighScore] = useState(0);
  const [currentStory, setCurrentStory] = useState<StoryNode[] | null>(null);
  const [lastRewards, setLastRewards] = useState<LevelRewards | null>(null); 

  const particlesRef = useRef<ParticlesHandle>(null);
  const gameOverModalRef = useRef<HTMLDivElement>(null);
  const pausedModalRef = useRef<HTMLDivElement>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  
  // --- Initialization & Audio ---
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
  
  // --- Game Over / Victory Logic ---
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

  // --- Helper Functions ---
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
              resetGame(0, 'ADVENTURE', config, assistRows, storeActiveBoosters); 
              setGameState('PLAYING');
              setCurrentStory(null);
              if (config.tutorialTip) {
                  setTutorialTip(config.tutorialTip.text);
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
  }, [currentStory, getCurrentLevelConfig, engine, setGameState, getFailedAttempts, resetGame, storeActiveBoosters, setTutorialTip]);

  const onDismissTutorialTip = useCallback(() => {
      audioManager.playUiBack();
      dismissTutorialTip();
  }, [dismissTutorialTip]);

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

  // --- Visual Effects Hook ---
  useVisualEffects(particlesRef, setShakeClass, setFlashOverlay, cellSize, uiVisualEffect, clearVisualEffect);

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
    aiHint: null, // Will be set in GameScreen via context
    pieceIsGrounded: false, // Will be set in GameScreen via context
    gimmicks: currentAdventureLevelConfig?.gimmicks,
    flippedGravity,
    wildcardPieceAvailable: stats.wildcardAvailable,
  }), [cellSize, ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, lockWarning, showAi, currentAdventureLevelConfig?.gimmicks, flippedGravity, stats.wildcardAvailable]);

  const handleUiHover = () => audioManager.playUiHover();
  const handleUiClick = () => audioManager.playUiClick();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleShareScore = useCallback(async () => {
    audioManager.playUiClick();
    
    let text = '';
    const outcome = gameState === 'VICTORY' ? 'VICTORY' : 'GAME OVER';
    const scoreFormatted = stats.score.toLocaleString();

    if (gameMode === 'SPRINT') {
        text = `I just finished TETRIOS Sprint 40 Lines in ${formatTime(stats.time)}! Score: ${scoreFormatted}. #Tetrios`;
    } else if (gameMode === 'BLITZ') {
        text = `I scored ${scoreFormatted} in TETRIOS Blitz (2min)! #Tetrios`;
    } else if (gameMode === 'ADVENTURE') {
        const config = getCurrentLevelConfig();
        text = `I ${gameState === 'VICTORY' ? 'completed' : 'played'} Level ${config?.index !== undefined ? config.index + 1 : '?'} in TETRIOS Adventure! Score: ${scoreFormatted}`;
    } else {
        text = `I scored ${scoreFormatted} in TETRIOS ${gameMode.replace('_', ' ')}! Level ${stats.level}. Can you beat it? #Tetrios`;
    }

    const shareData = {
        title: `TETRIOS: ${outcome}`,
        text: text,
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
        // Fallback to clipboard if share fails (common on desktop)
        if (navigator.clipboard) {
             try {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                alert('Score copied to clipboard!');
             } catch (e) {}
        }
    }
  }, [stats.score, stats.time, stats.level, gameMode, gameState, getCurrentLevelConfig]);

  const calculateStars = (gameInstance: GameCore): number => {
    if (!gameInstance.adventureManager.config) return 0;

    let stars = 0;
    const objective = gameInstance.adventureManager.config.objective;

    let currentProgress = 0;
    switch (objective.type) {
        case 'LINES': currentProgress = gameInstance.scoreManager.stats.rows; break;
        case 'SCORE': currentProgress = gameInstance.scoreManager.stats.score; break;
        case 'GEMS': currentProgress = gameInstance.scoreManager.stats.gemsCollected || 0; break;
        case 'BOMBS': currentProgress = gameInstance.scoreManager.stats.bombsDefused || 0; break;
        case 'TETRIS': currentProgress = gameInstance.scoreManager.stats.tetrisesAchieved || 0; break;
        case 'COMBO': currentProgress = gameInstance.scoreManager.stats.combosAchieved || 0; break;
        case 'MOVES': currentProgress = gameInstance.scoreManager.stats.movesTaken || 0; break;
        default: break;
    }

    if (objective.type === 'TIME_SURVIVAL') {
        const timeLimit = gameInstance.adventureManager.config.constraints?.timeLimit || 1;
        const timeRemaining = gameInstance.scoreManager.stats.time || 0;
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
          earnedCoins = Math.floor(gameInstance.scoreManager.stats.score / 500); 
      }
      else if (gameInstance.mode !== 'ZEN' && gameInstance.mode !== 'PUZZLE') {
          earnedCoins += Math.floor(gameInstance.scoreManager.stats.score / 100);
      }
      return earnedCoins;
  };

  const isPlayingState = gameState !== 'MENU' && gameState !== 'GAMEOVER' && gameState !== 'PAUSED' && gameState !== 'MAP' && gameState !== 'STORY' && gameState !== 'BOOSTER_SELECTION' && gameState !== 'WILDCARD_SELECTION' && gameState !== 'BOMB_SELECTION' && gameState !== 'LINE_SELECTION';

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

      {isProfileOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl text-cyan-400 text-xl font-bold uppercase tracking-widest">Loading Profile...</div>}>
              <LazyProfile />
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

      {activeTutorialTip && gameState === 'PLAYING' && (
          <TutorialTip text={activeTutorialTip} onDismiss={onDismissTutorialTip} />
      )}

      <GameOverlayManager
          gameState={gameState}
          setGameState={setGameState}
          highScore={highScore}
          lastRewards={lastRewards}
          openSettings={openSettings}
          handleShareScore={handleShareScore}
          mainMenuRef={mainMenuRef}
          gameOverModalRef={gameOverModalRef}
          pausedModalRef={pausedModalRef}
      />

      {isPlayingState && ( 
          <GameScreen
              particlesRef={particlesRef}
              boardRenderCoreConfig={boardRenderCoreConfig}
              isMuted={isMuted}
              toggleMute={handleToggleMute}
              showAi={showAi}
              toggleShowAi={toggleShowAi}
              openSettings={openSettings}
              adventureLevelConfig={currentAdventureLevelConfig}
              cellSize={cellSize}
          />
      )}

      {/* Mobile Controls Layer - Always visible if playing or selection modes */}
      {(isPlayingState || gameState === 'BOMB_SELECTION' || gameState === 'LINE_SELECTION') && (
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
                <button onClick={() => { handleUiClick(); setGameState('PAUSED'); }} className="w-14 h-14 flex items-center justify-center bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 rounded-full active:scale-90 active:bg-yellow-900/40" aria-label="Pause Game"><PauseCircle size={24} aria-hidden="true" /></button>
                <button onClick={() => { handleUiClick(); setGameState('PAUSED'); openSettings(); }} className="w-14 h-14 flex items-center justify-center bg-gray-800 text-gray-400 border border-gray-700 rounded-full active:scale-90 active:bg-gray-700" aria-label="Open Settings"><SettingsIcon size={24} aria-hidden="true"/></button>
            </div>
        </div>
      )}
    </div>
  );
};


import React, { useEffect, useRef, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import MusicVisualizer from './MusicVisualizer';
import AdventureMap from './AdventureMap';
import StoryOverlay from './StoryOverlay';
import TutorialTip from './TutorialTip';
import { GameScreen } from './GameScreen';
import { GameOverlayManager } from './GameOverlayManager';
import { audioManager } from '../utils/audioManager';
import { useUiStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { useEffectStore } from '../stores/effectStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';
import { SHAKE_DURATION_HARD_MS, LEVEL_PASS_COIN_REWARD, MAX_STARS_PER_LEVEL, STAR_COIN_BONUS, ACHIEVEMENTS, FOCUS_GAUGE_MAX } from '../constants';
import { StoryNode, LevelRewards, BoardRenderConfig } from '../types';
import { useGameContext } from '../contexts/GameContext';
import { GameCore } from '../utils/GameCore';
import { useVisualEffects } from '../hooks/useVisualEffects';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useAudioSystem } from '../hooks/useAudioSystem';
import { useCameraSystem } from '../hooks/useCameraSystem';
import { Settings as SettingsIcon, PauseCircle, Bomb, Sparkles, ArrowLeftRight, Trophy, Rewind } from 'lucide-react';
import { BoardRenderer } from '../utils/BoardRenderer'; 
import TouchControls from './TouchControls'; 
import { VISUAL_THEME } from '../utils/visualTheme';
import { safeStorage } from '../utils/safeStorage';
import { replayManager } from '../utils/ReplayManager';

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
    setGameConfig,
    controls, 
    setKeyBinding, 
    resetControls,
    flippedGravity,
    bombRowsToClear,
    isSelectingBombRows,
    isSelectingLine,
    canHold,
    touchControls,
    dangerLevel,
    aiHint,
    missedOpportunity 
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
      gameSpeed, lockWarning, das, arr, showAi, toggleShowAi,
      masterVolume, musicVolume, sfxVolume, uiVolume,
      cameraShake, enableTouchControls, colorblindMode, blockSkin
  } = useGameSettingsStore();

  const {
      setCurrentLevel, getCurrentLevelConfig, unlockNextLevel, getLevelConfig, getFailedAttempts
  } = useAdventureStore();

  const {
      coins, activeBoosters: storeActiveBoosters, applyLevelRewards
  } = useBoosterStore();

  const { stats: profileStats } = useProfileStore();

  const { cellSize, isMobile } = useResponsiveLayout();

  const [highScore, setHighScore] = useState(0);
  const [currentStory, setCurrentStory] = useState<StoryNode[] | null>(null);
  const [lastRewards, setLastRewards] = useState<LevelRewards | null>(null); 
  const [achievementNotification, setAchievementNotification] = useState<{title: string, icon: string} | null>(null);

  const gameOverModalRef = useRef<HTMLDivElement>(null);
  const pausedModalRef = useRef<HTMLDivElement>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  
  const boardRendererRef = useRef<BoardRenderer | null>(null);
  
  useAudioSystem({
      gameState,
      musicEnabled,
      isMuted,
      masterVolume,
      musicVolume,
      sfxVolume,
      uiVolume,
      isOverlayOpen: isSettingsOpen || isProfileOpen || gameState === 'PAUSED' || gameState === 'GAMEOVER' || gameState === 'VICTORY'
  });

  const cameraTransform = useCameraSystem(cameraShake, uiVisualEffect);

  useEffect(() => {
      const unsubscribe = safeStorage.subscribeToErrors((errorPayload) => {
          if (errorPayload.type === 'QUOTA' || errorPayload.type === 'CORRUPTION') {
              setTutorialTip(errorPayload.message);
          } else if (errorPayload.type === 'SECURITY') {
              console.warn(errorPayload.message);
          }
      });
      return unsubscribe;
  }, [setTutorialTip]);

  useEffect(() => {
      setGameConfig({ speed: gameSpeed, das, arr });
  }, [gameSpeed, das, arr, setGameConfig]);

  useEffect(() => {
      if (engine.current) {
          const handleAchievement = (id: string) => {
              const ach = ACHIEVEMENTS.find(a => a.id === id);
              if (ach) {
                  setAchievementNotification({ title: ach.title, icon: ach.icon });
                  audioManager.playUiSelect();
                  setTimeout(() => setAchievementNotification(null), 4000);
              }
          };

          engine.current.events.on('ACHIEVEMENT_UNLOCKED', handleAchievement);
          
          return () => {
              engine.current.events.off('ACHIEVEMENT_UNLOCKED', handleAchievement);
          };
      }
  }, [engine]);

  useEffect(() => {
      const savedHighScore = profileStats.highScores?.[gameMode] || 0;
      setHighScore(Math.max(stats.score, savedHighScore));
  }, [stats.score, gameMode, profileStats.highScores]);
  
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
              } 
              unlockNextLevel(); 
          }
      } else if (gameState === 'GAMEOVER' && gameMode === 'ADVENTURE') {
        setLastRewards(null); 
      } else if ((gameState === 'GAMEOVER' || gameState === 'VICTORY') && gameMode !== 'ADVENTURE') {
          // If replaying, don't award coins
          if (!replayManager.isReplaying) {
              const calculatedCoins = calculateCoins(engine.current, 0); 
              const rewards: LevelRewards = { coins: calculatedCoins, stars: 0 };
              setLastRewards(rewards);
              applyLevelRewards(rewards); 
          } else {
              setLastRewards(null);
          }
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
              resetGame(0, 'ADVENTURE', config, assistRows, storeActiveBoosters); 
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

  useVisualEffects(setShakeClass, setFlashOverlay, cellSize, uiVisualEffect, clearVisualEffect, boardRendererRef);

  useEffect(() => {
      if (gameState === 'GAMEOVER') {
          setShakeClass('shake-hard');
          setFlashOverlay('rgba(255, 0, 0, 0.6)'); 
          
          // Trigger explosions via board renderer if available
          if (boardRendererRef.current) {
              boardRendererRef.current.spawnShockwave(5 * cellSize, 10 * cellSize);
              // More intense particle explosion
              boardRendererRef.current.spawnParticle(150, 300, '#ef4444', 80, 'explosion');
          }
          
          setTimeout(() => {
              setShakeClass('');
              setFlashOverlay(null);
          }, SHAKE_DURATION_HARD_MS);
      }
  }, [gameState, setShakeClass, setFlashOverlay, cellSize]);

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
      
      let activeTheme = VISUAL_THEME.THEMES[0];
      for (let i = VISUAL_THEME.THEMES.length - 1; i >= 0; i--) {
          if (stats.level >= VISUAL_THEME.THEMES[i].threshold) {
              activeTheme = VISUAL_THEME.THEMES[i];
              break;
          }
      }

      const vignette = `radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0, ${Math.min(0.8, dangerLevel)}) 100%)`;

      return {
          background: `${vignette}, ${activeTheme.background}`,
          transition: 'background 2s ease-in-out'
      };
  }, [stats.level, gameMode, currentAdventureLevelConfig, flippedGravity, dangerLevel]);

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
    pieceIsGrounded: false, 
    gimmicks: currentAdventureLevelConfig?.gimmicks,
    flippedGravity,
    wildcardPieceAvailable: stats.wildcardAvailable,
    colorblindMode,
    isZoneActive: stats.isZoneActive,
    zoneLines: stats.zoneLines,
    missedOpportunity,
    blockSkin 
  }), [cellSize, ghostStyle, ghostOpacity, ghostGlowIntensity, lockWarning, showAi, currentAdventureLevelConfig?.gimmicks, flippedGravity, stats.wildcardAvailable, colorblindMode, stats.isZoneActive, stats.zoneLines, missedOpportunity, aiHint, blockSkin]);

  const handleUiHover = () => audioManager.playUiHover();
  const handleUiClick = () => audioManager.playUiClick();

  const handleShareScore = useCallback(async () => {
    // Sharing logic unchanged
  }, [stats.score]);

  const calculateStars = (gameInstance: GameCore): number => {
      if (gameInstance.mode !== 'ADVENTURE') return 0;
      let stars = 1;
      const stats = gameInstance.scoreManager.stats;
      const config = gameInstance.adventureManager.config;
      if (!config) return 0;
      if (config.objective.type === 'SCORE') {
          if (stats.score >= config.objective.target * 1.5) stars++;
          if (stats.score >= config.objective.target * 2.0) stars++;
      } else {
          if (stats.tetrisesAchieved && stats.tetrisesAchieved > 0) stars++;
          else if (stats.tspinsAchieved && stats.tspinsAchieved > 0) stars++;
          if (config.constraints?.timeLimit) {
              const timeUsed = config.constraints.timeLimit - stats.time;
              if (timeUsed < config.constraints.timeLimit * 0.6) stars++; 
          } else if (config.constraints?.movesLimit) {
              if ((stats.movesTaken || 0) < config.constraints.movesLimit * 0.7) stars++;
          } else {
              if (stats.maxB2BChain && stats.maxB2BChain >= 2) stars++;
          }
      }
      return Math.min(3, stars);
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

  const isPlayingState = gameState !== 'MENU' && gameState !== 'MAP' && gameState !== 'STORY' && gameState !== 'BOOSTER_SELECTION';
  const isZoneReady = stats.focusGauge >= FOCUS_GAUGE_MAX;

  const handlePause = useCallback(() => setGameState('PAUSED'), [setGameState]);
  const handleZone = useCallback(() => engine.current?.scoreManager.tryActivateZone(), [engine]);

  return (
    <div className={`fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center text-white overflow-hidden font-sans selection:bg-cyan-500/30 touch-none ${shakeClass}`} style={{
        ...backgroundStyle,
        '--audio-energy': 0,
        '--audio-glow': `calc(var(--audio-energy, 0) * 20px)`,
        '--audio-border': `rgba(6, 182, 212, calc(var(--audio-energy, 0) * 0.5))`
    } as unknown as React.CSSProperties}>
      <MusicVisualizer />
      <div className="fixed inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
      <div className={`fixed inset-0 pointer-events-none z-[60] transition-opacity duration-300 ${flashOverlay ? 'opacity-40' : 'opacity-0'}`} style={{ backgroundColor: flashOverlay || 'transparent', mixBlendMode: 'screen' }}></div>
      
      <div className={`fixed inset-0 pointer-events-none z-[55] transition-opacity duration-500 ${dangerLevel > 0.7 ? 'opacity-100' : 'opacity-0'}`}
           style={{
               background: `radial-gradient(circle at center, transparent 50%, rgba(255, 0, 0, ${(dangerLevel - 0.7) * 2}) 100%)`,
               animation: dangerLevel > 0.8 ? 'pulse-red 1s infinite' : 'none'
           }}>
      </div>

      {replayManager.isReplaying && (
          <div className="fixed top-4 right-4 z-[80] bg-red-600/80 text-white font-bold px-4 py-2 rounded animate-pulse flex items-center gap-2 shadow-lg">
              <Rewind className="animate-spin-slow" size={16} /> REPLAY MODE
          </div>
      )}

      {/* Modals */}
      {isSettingsOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/90" />}>
              <LazySettings controls={controls} setKeyBinding={setKeyBinding} resetControls={resetControls} />
          </Suspense>
      )}
      {isProfileOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/90" />}>
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
      {achievementNotification && (
          <div className="fixed top-8 right-8 z-[100] bg-gray-900/90 border border-yellow-500/50 p-4 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-4 animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm">
              <div className="bg-yellow-500/20 p-2 rounded-full border border-yellow-500 text-yellow-400"><Trophy size={24} className="animate-bounce" /></div>
              <div><div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-0.5">Achievement Unlocked</div><div className="text-white font-bold">{achievementNotification.title}</div></div>
          </div>
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
          // Camera Container - Disabled transform on mobile for pixel-perfect grid
          <div className="relative w-full h-full flex items-center justify-center transition-all duration-100" 
               style={!isMobile ? {
                  transform: `perspective(1000px) rotateX(${cameraTransform.rotateX}deg) rotateY(${cameraTransform.rotateY}deg) translateY(${cameraTransform.y}px) scale(${cameraTransform.scale})`
               } : undefined}>
              <GameScreen
                  boardRenderCoreConfig={boardRenderCoreConfig}
                  isMuted={isMuted}
                  toggleMute={handleToggleMute}
                  showAi={showAi}
                  toggleShowAi={toggleShowAi}
                  openSettings={openSettings}
                  adventureLevelConfig={currentAdventureLevelConfig}
                  cellSize={cellSize}
                  isPaused={gameState === 'PAUSED'}
                  rendererRef={boardRendererRef} 
              />
          </div>
      )}

      {enableTouchControls && isPlayingState && (
        <TouchControls 
            controller={touchControls}
            onZone={handleZone}
            onPause={handlePause}
            isZoneReady={isZoneReady}
            flippedGravity={flippedGravity}
        />
      )}
    </div>
  );
};

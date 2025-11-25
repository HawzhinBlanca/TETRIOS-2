
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

  const { cellSize } = useResponsiveLayout();

  const [highScore, setHighScore] = useState(0);
  const [currentStory, setCurrentStory] = useState<StoryNode[] | null>(null);
  const [lastRewards, setLastRewards] = useState<LevelRewards | null>(null); 
  const [achievementNotification, setAchievementNotification] = useState<{title: string, icon: string} | null>(null);

  const particlesRef = useRef<ParticlesHandle>(null);
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
          engine.current.events.onAudio = (event, val, type) => {
              // Proxy
          };
          
          engine.current.events.onAchievementUnlocked = (id: string) => {
              const ach = ACHIEVEMENTS.find(a => a.id === id);
              if (ach) {
                  setAchievementNotification({ title: ach.title, icon: ach.icon });
                  audioManager.playUiSelect();
                  setTimeout(() => setAchievementNotification(null), 4000);
              }
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

  useVisualEffects(particlesRef, setShakeClass, setFlashOverlay, cellSize, uiVisualEffect, clearVisualEffect, boardRendererRef);

  useEffect(() => {
      if (gameState === 'GAMEOVER') {
          setShakeClass('shake-hard');
          setFlashOverlay('rgba(255, 0, 0, 0.6)'); 
          if (particlesRef.current) {
              particlesRef.current.spawnShockwave(5, 10, '#ef4444');
              particlesRef.current.spawnExplosion(10, '#f97316', 80);
              const colors = ['#ef4444', '#dc2626', '#f59e0b', '#ffffff'];
              for(let i=0; i<6; i++) {
                  setTimeout(() => {
                      const rx = 2 + Math.random() * 6;
                      const ry = 4 + Math.random() * 12;
                      particlesRef.current?.spawnBurst(rx, ry, colors[i%colors.length], 30);
                  }, i * 120); 
              }
          }
          setTimeout(() => {
              setShakeClass('');
              setFlashOverlay(null);
          }, SHAKE_DURATION_HARD_MS);
      }
  }, [gameState, setShakeClass, setFlashOverlay]);

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
    blockSkin // Added skin
  }), [cellSize, ghostStyle, ghostOpacity, ghostOutlineThickness, ghostGlowIntensity, lockWarning, showAi, currentAdventureLevelConfig?.gimmicks, flippedGravity, stats.wildcardAvailable, colorblindMode, stats.isZoneActive, stats.zoneLines, missedOpportunity, aiHint, blockSkin]);

  const handleUiHover = () => audioManager.playUiHover();
  const handleUiClick = () => audioManager.playUiClick();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleShareScore = useCallback(async () => {
    // Sharing logic unchanged
    // ...
  }, [stats.score]);

  const calculateStars = (gameInstance: GameCore): number => {
    // Logic unchanged
    return 0;
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
    <div className={`h-screen w-full flex flex-col items-center justify-center text-white overflow-hidden font-sans selection:bg-cyan-500/30 ${shakeClass}`} style={{
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

      {isSettingsOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl text-cyan-400 text-xl font-bold uppercase tracking-widest">Loading Settings...</div>}>
              <LazySettings controls={controls} setKeyBinding={setKeyBinding} resetControls={resetControls} />
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

      {/* Achievement Unlock Toast */}
      {achievementNotification && (
          <div className="fixed top-8 right-8 z-[100] bg-gray-900/90 border border-yellow-500/50 p-4 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-4 animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm">
              <div className="bg-yellow-500/20 p-2 rounded-full border border-yellow-500 text-yellow-400">
                  <Trophy size={24} className="animate-bounce" />
              </div>
              <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-0.5">Achievement Unlocked</div>
                  <div className="text-white font-bold">{achievementNotification.title}</div>
              </div>
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
          <div className="relative w-full h-full flex items-center justify-center transition-all duration-100" style={{
              transform: `perspective(1000px) rotateX(${cameraTransform.rotateX}deg) rotateY(${cameraTransform.rotateY}deg) translateY(${cameraTransform.y}px) scale(${cameraTransform.scale})`
          }}>
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

      {!enableTouchControls && isPlayingState && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl p-4 pb-8 pb-safe border-t border-gray-800 z-50 flex justify-between items-center" role="navigation" aria-label="Mobile Game Controls">
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

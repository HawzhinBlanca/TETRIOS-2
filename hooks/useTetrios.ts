
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { GameMode, TetrominoType, AdventureLevelConfig, BoosterType, LevelRewards, Difficulty } from '../types';
import { useEffectStore } from '../stores/effectStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS, KICKS, DIFFICULTY_SETTINGS, DEFAULT_CONTROLS } from '../constants';
import { useGameLoop } from './useGameLoop';
import { useGameAudio } from './useGameAudio';
import { useGameInput } from './useGameInput';
import { useEngineStore } from '../stores/engineStore';

export const useTetrios = () => {
  // Select state directly from the reactive store
  const stats = useEngineStore(state => state.stats);
  const gameState = useEngineStore(state => state.gameState);
  const nextQueue = useEngineStore(state => state.nextQueue);
  const heldPiece = useEngineStore(state => state.heldPiece);
  const canHold = useEngineStore(state => state.canHold);
  const lastHoldTime = useEngineStore(state => state.lastHoldTime);
  const gameMode = useEngineStore(state => state.gameMode);
  const difficulty = useEngineStore(state => state.difficulty);
  const comboCount = useEngineStore(state => state.comboCount);
  const isBackToBack = useEngineStore(state => state.isBackToBack);
  const garbagePending = useEngineStore(state => state.garbagePending);
  const pieceIsGrounded = useEngineStore(state => state.pieceIsGrounded);
  const flippedGravity = useEngineStore(state => state.flippedGravity);
  const wildcardPieceActive = useEngineStore(state => state.wildcardPieceActive);
  const isSelectingBombRows = useEngineStore(state => state.isSelectingBombRows);
  const bombRowsToClear = useEngineStore(state => state.bombRowsToClear);
  const isSelectingLine = useEngineStore(state => state.isSelectingLine);
  const selectedLineToClear = useEngineStore(state => state.selectedLineToClear);
  const dangerLevel = useEngineStore(state => state.dangerLevel);
  const aiHint = useEngineStore(state => state.aiHint);
  const missedOpportunity = useEngineStore(state => state.missedOpportunity);

  // Refs
  const aiWorker = useRef<Worker | null>(null);
  const engine = useRef<GameCore>(null!);
  const turnId = useRef<number>(0); // Track current turn to prevent stale AI results

  // External Stores
  const triggerVisualEffect = useEffectStore((state) => state.triggerVisualEffect);
  const { trackFailedLevel, clearFailedAttempts, setStarsEarned } = useAdventureStore();
  const { addCoins, applyLevelRewards, resetActiveBoosters, consumeActiveBoosters } = useBoosterStore();
  const { updateStats } = useProfileStore();

  // Composed Hooks
  const { handleAudioEvent } = useGameAudio();
  const { controls, setKeyBinding, resetControls } = useGameInput();

  // Initialize Game Engine ONCE
  if (!engine.current) {
      engine.current = new GameCore({
          keyMap: DEFAULT_CONTROLS,
          das: DEFAULT_DAS,
          arr: DEFAULT_ARR
      });
      
      // Wire up ephemeral events that don't fit in the store (Visuals/Audio)
      engine.current.events.onVisualEffect = (effect) => triggerVisualEffect(effect.type, effect.payload);
      engine.current.events.onAudio = handleAudioEvent;
      engine.current.events.onGameOver = (s, levelId, rewards) => {
            if (s === 'GAMEOVER' && levelId) {
                trackFailedLevel(levelId); 
            } else if (s === 'VICTORY' && levelId && rewards) {
                clearFailedAttempts(levelId); 
                setStarsEarned(levelId, rewards.stars); 
                applyLevelRewards(rewards, engine.current.adventureManager.config || undefined);
            } else if ((s === 'GAMEOVER' || s === 'VICTORY') && rewards) { 
                addCoins(rewards.coins); 
            }
            
            if (s === 'GAMEOVER' || s === 'VICTORY') {
               updateStats(
                   { score: engine.current.scoreManager.stats.score, rows: engine.current.scoreManager.stats.rows, level: engine.current.scoreManager.stats.level },
                   engine.current.mode
               );
            }
            resetActiveBoosters(); 
      };
  }

  // --- Hook Game Loop ---
  useGameLoop(engine, gameState, { das: DEFAULT_DAS, arr: DEFAULT_ARR });

  // --- AI Worker Setup ---
  useEffect(() => {
    engine.current.setInputConfig({ keyMap: controls });
    const worker = createAiWorker();
    if (worker) {
        aiWorker.current = worker;
        aiWorker.current.postMessage({ type: 'INIT', payload: { STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS, KICKS }});
        aiWorker.current.onmessage = (e: MessageEvent) => {
            // Race condition check: only accept results for the current turn
            if (e.data && e.data.id === turnId.current) {
                useEngineStore.setState({ aiHint: e.data.result });
            }
        };
    }
    return () => { aiWorker.current?.terminate(); engine.current?.destroy(); };
  }, []);

  // --- Actions ---
  
  const resetGame = useCallback((
      startLevel: number = 0, 
      mode: GameMode = 'MARATHON', 
      adventureLevelConfig: AdventureLevelConfig | undefined = undefined, 
      assistRows: number = 0, 
      activeBoosters: BoosterType[] = [],
      difficultySetting: Difficulty = 'MEDIUM'
  ) => {
      const diffConfig = DIFFICULTY_SETTINGS[difficultySetting];
      const currentSettings = useGameSettingsStore.getState();
      
      // Apply Difficulty Settings to Engine (Handling Only)
      // Use stored gameSpeed to allow user override via Settings
      engine.current.setGameConfig({ 
          speed: currentSettings.gameSpeed, 
          das: diffConfig.das, 
          arr: diffConfig.arr 
      });
      
      engine.current.resetGame(mode, startLevel, adventureLevelConfig, assistRows, activeBoosters);
      
      // Sync Difficulty Settings to Global Store so Settings Menu reflects the active Difficulty Handling
      // NOTE: We do NOT overwrite gameSpeed here to preserve user preference
      const settingsStore = useGameSettingsStore.getState();
      settingsStore.setDas(diffConfig.das);
      settingsStore.setArr(diffConfig.arr);

      useEngineStore.getState().setGameMode(mode, difficultySetting);
      consumeActiveBoosters(); 
  }, []);

  const setGameState = useCallback((newState: any) => engine.current.stateManager.transitionTo(newState), []);
  
  const setGameConfig = useCallback((config: any) => engine.current.setGameConfig(config), []);

  const touchControls = useMemo(() => ({
      move: (dir: number) => engine.current.handleAction(dir === -1 ? 'moveLeft' : 'moveRight'),
      rotate: (dir: number) => engine.current.handleAction(dir === 1 ? 'rotateCW' : 'rotateCCW'),
      softDrop: () => engine.current.handleAction('softDrop'),
      hardDrop: () => engine.current.handleAction('hardDrop'),
      hold: () => engine.current.handleAction('hold'),
      useLineClearer: (y: number) => engine.current.executeLineClearer(y), 
      triggerBombBooster: () => engine.current.activateBombBoosterSelection(),
      triggerLineClearer: () => engine.current.activateLineClearerSelection(),
  }), []); 

  // --- AI Trigger ---
  useEffect(() => {
      if(aiWorker.current && engine.current.pieceManager.player.tetromino.type) {
          turnId.current++; // Increment turn ID to invalidate previous pending requests
          aiWorker.current.postMessage({
              id: turnId.current,
              stage: engine.current.boardManager.stage, 
              type: engine.current.pieceManager.player.tetromino.type,
              rotationState: engine.current.pieceManager.rotationState,
              flippedGravity: engine.current.flippedGravity, 
          });
      }
  }, [nextQueue, pieceIsGrounded, heldPiece]); // Trigger when queue changes, piece lands, OR piece is held

  return {
      engine,
      stats,
      gameState,
      nextQueue,
      heldPiece,
      canHold,
      lastHoldTime,
      gameMode,
      difficulty,
      comboCount,
      isBackToBack,
      garbagePending,
      pieceIsGrounded,
      flippedGravity,
      wildcardPieceActive,
      isSelectingBombRows,
      bombRowsToClear,
      isSelectingLine,
      selectedLineToClear,
      dangerLevel,
      aiHint,
      missedOpportunity,
      // Controls / Actions
      resetGame,
      setGameState,
      setGameConfig,
      controls,
      setKeyBinding,
      resetControls,
      touchControls,
      activateWildcardSelection: () => {
          useEngineStore.setState({ wildcardPieceActive: true });
          setGameState('WILDCARD_SELECTION');
      },
      chooseWildcardPiece: (type: TetrominoType) => {
          engine.current.chooseWildcardPiece(type);
          useEngineStore.setState({ wildcardPieceActive: false });
          setGameState('PLAYING');
      },
      triggerBombBoosterSelection: () => engine.current.activateBombBoosterSelection(),
      confirmBombBooster: (s: number, n: number) => engine.current.executeBombBooster(s, n),
      cancelBombBoosterSelection: () => {
          engine.current.callbacks.onBombSelectionEnd();
          setGameState('PLAYING');
      },
      triggerLineClearerSelection: () => engine.current.activateLineClearerSelection(),
      confirmLineClearer: (r: number) => engine.current.executeLineClearer(r),
      cancelLineClearerSelection: () => {
          engine.current.callbacks.onLineSelectionEnd();
          setGameState('PLAYING');
      },
      blitzSpeedThresholdIndex: 0, 
      activeBoosters: useBoosterStore.getState().activeBoosters,
      previousGameState: null, 
  };
};

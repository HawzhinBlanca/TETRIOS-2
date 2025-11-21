
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { GameState, GameStats, MoveScore, GameMode, TetrominoType, AdventureLevelConfig, BoosterType, LevelRewards } from '../types';
import { useUiStore } from '../stores/uiStore';
import { useEffectStore } from '../stores/effectStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED } from '../constants';
import { useGameLoop } from './useGameLoop';
import { useGameAudio } from './useGameAudio';
import { useGameInput, DEFAULT_CONTROLS } from './useGameInput';

export const useTetrios = () => {
  const [stats, setStats] = useState<GameStats>({ 
    score: 0, rows: 0, level: 0, time: 0, movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
    isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
    wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false, flippedGravityActive: false, flippedGravityTimer: 0,
  });
  const [gameState, setGameStateLocal] = useState<GameState>('MENU'); 
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [aiHint, setAiHint] = useState<MoveScore | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('MARATHON');
  const [lastHoldTime, setLastHoldTime] = useState<number>(0);
  const [comboCount, setComboCount] = useState<number>(-1);
  const [isBackToBack, setIsBackToBack] = useState<boolean>(false);
  const [garbagePending, setGarbagePending] = useState<number>(0);
  const [pieceIsGrounded, setPieceIsGrounded] = useState<boolean>(false); 
  const [flippedGravity, setFlippedGravity] = useState<boolean>(false); 
  const [wildcardPieceActive, setWildcardPieceActive] = useState<boolean>(false); 
  const [isSelectingBombRows, setIsSelectingBombRows] = useState<boolean>(false); 
  const [bombRowsToClear, setBombRowsToClear] = useState<number>(0); 
  const [isSelectingLine, setIsSelectingLine] = useState<boolean>(false); 
  const [selectedLineToClear, setSelectedLineToClear] = useState<number | null>(null); 
  const [blitzSpeedThresholdIndex, setBlitzSpeedThresholdIndex] = useState<number>(0); 
  
  // Config State
  const [inputConfig, setInputConfig] = useState({ das: DEFAULT_DAS, arr: DEFAULT_ARR });
  const [gameSpeedMultiplier, setGameSpeedMultiplier] = useState(DEFAULT_GAMESPEED);

  // Refs
  const aiWorker = useRef<Worker | null>(null);
  const engine = useRef<GameCore>(null!);

  // External Stores
  const triggerVisualEffect = useEffectStore((state) => state.triggerVisualEffect);
  const { trackFailedLevel, clearFailedAttempts, setStarsEarned } = useAdventureStore();
  const { addCoins, applyLevelRewards, resetActiveBoosters, consumeActiveBoosters } = useBoosterStore();
  const { updateStats } = useProfileStore();

  // Composed Hooks
  const { handleAudioEvent } = useGameAudio();
  const { controls, setKeyBinding } = useGameInput();

  const setGameState = useCallback((newState: GameState) => {
      if (engine.current) {
          engine.current.stateManager.transitionTo(newState);
      } else {
          setGameStateLocal(newState);
      }
  }, []);

  // Initialize Game Engine
  if (!engine.current) {
      engine.current = new GameCore({
          onStateChange: (newState: GameState) => setGameStateLocal(newState),
          onStatsChange: (s: GameStats) => setStats({...s}),
          onQueueChange: (q: TetrominoType[]) => setNextQueue(q),
          onHoldChange: (p: TetrominoType | null, c: boolean) => { setHeldPiece(p); setCanHold(c); if(!c) setLastHoldTime(Date.now()); },
          onVisualEffect: (effect) => triggerVisualEffect(effect.type, effect.payload),
          onGameOver: (s: GameState, currentLevelId?: string, rewards?: LevelRewards) => { 
            if (s === 'GAMEOVER' && currentLevelId) {
                trackFailedLevel(currentLevelId); 
            } else if (s === 'VICTORY' && currentLevelId && rewards) {
                clearFailedAttempts(currentLevelId); 
                setStarsEarned(currentLevelId, rewards.stars); 
                applyLevelRewards(rewards, engine.current.adventureManager.config || undefined);
            } else if ((s === 'GAMEOVER' || s === 'VICTORY') && rewards) { 
                addCoins(rewards.coins); 
            }
            
            if (s === 'GAMEOVER' || s === 'VICTORY') {
               updateStats({ score: engine.current.scoreManager.stats.score, rows: engine.current.scoreManager.stats.rows, level: engine.current.scoreManager.stats.level });
            }
            
            resetActiveBoosters(); 
          },
          onAiTrigger: () => triggerAi(),
          onComboChange: (c: number, b2b: boolean) => { setComboCount(c); setIsBackToBack(b2b); },
          onGarbageChange: (g: number) => setGarbagePending(g),
          onGroundedChange: (isGrounded: boolean) => setPieceIsGrounded(isGrounded),
          onFlippedGravityChange: (isFlipped: boolean) => setFlippedGravity(isFlipped), 
          onWildcardSelectionTrigger: () => {
              setWildcardPieceActive(true);
              engine.current.stateManager.transitionTo('WILDCARD_SELECTION');
          },
          onWildcardAvailableChange: (available: boolean) => setStats(prev => ({...prev, wildcardAvailable: available})),
          onSlowTimeChange: (active: boolean, timer: number) => setStats(prev => ({...prev, slowTimeActive: active, slowTimeTimer: timer})), 
          onBombBoosterReadyChange: (ready: boolean) => setStats(prev => ({...prev, bombBoosterReady: ready})), 
          onBombSelectionStart: (rows: number) => { 
            setIsSelectingBombRows(true); 
            setBombRowsToClear(rows);
            engine.current.stateManager.transitionTo('BOMB_SELECTION');
          },
          onBombSelectionEnd: () => { 
            setIsSelectingBombRows(false);
            setBombRowsToClear(0);
            if (engine.current.stateManager.currentState === 'BOMB_SELECTION') {
                engine.current.stateManager.transitionTo('PLAYING');
            }
          },
          onLineClearerActiveChange: (active: boolean) => setStats(prev => ({...prev, lineClearerActive: active})), 
          onLineSelectionStart: () => { 
            setIsSelectingLine(true);
            engine.current.stateManager.transitionTo('LINE_SELECTION');
          },
          onLineSelectionEnd: () => { 
            setIsSelectingLine(false);
            setSelectedLineToClear(null);
            if (engine.current.stateManager.currentState === 'LINE_SELECTION') {
                engine.current.stateManager.transitionTo('PLAYING');
            }
          },
          onBlitzSpeedUp: (threshold: number) => triggerVisualEffect('BLITZ_SPEED_THRESHOLD', { threshold }), 
          onFlippedGravityTimerChange: (active: boolean, timer: number) => setStats(prev => ({...prev, flippedGravityActive: active, flippedGravityTimer: timer})),
          onAudio: handleAudioEvent,
      }, {
          keyMap: DEFAULT_CONTROLS,
          das: DEFAULT_DAS,
          arr: DEFAULT_ARR
      });
  }

  // Hook the game loop logic
  useGameLoop(engine, gameState, {
      das: inputConfig.das,
      arr: inputConfig.arr
  });

  const triggerAi = useCallback(() => {
      if(aiWorker.current && engine.current.pieceManager.player.tetromino.type) {
          aiWorker.current.postMessage({
              stage: engine.current.boardManager.stage, 
              type: engine.current.pieceManager.player.tetromino.type,
              rotationState: engine.current.pieceManager.rotationState,
              flippedGravity: engine.current.flippedGravity, 
          });
      }
  }, [gameState]);

  // Initialize Worker and Controls Sync
  useEffect(() => {
    // Sync initial controls to engine
    engine.current.setInputConfig({ keyMap: controls });

    aiWorker.current = createAiWorker();
    aiWorker.current.onmessage = (e: MessageEvent<MoveScore | null>) => setAiHint(e.data);

    return () => { 
        aiWorker.current?.terminate(); 
        engine.current?.destroy();
    };
  }, []);

  // Sync inputs effect when controls change
  useEffect(() => {
    engine.current.setInputConfig({ keyMap: controls });
  }, [controls]);

  const resetGame = useCallback((startLevel: number = 0, mode: GameMode = 'MARATHON', adventureLevelConfig: AdventureLevelConfig | undefined = undefined, assistRows: number = 0, activeBoosters: BoosterType[] = []) => {
      engine.current.resetGame(mode, startLevel, adventureLevelConfig, assistRows, activeBoosters);
      setGameMode(mode);
      setPieceIsGrounded(false); 
      setFlippedGravity(false); 
      setWildcardPieceActive(false); 
      setIsSelectingBombRows(false); 
      setIsSelectingLine(false); 
      setSelectedLineToClear(null); 
      setBlitzSpeedThresholdIndex(0); 
      consumeActiveBoosters(); 
  }, []);

  const setGameConfig = useCallback((config: { speed?: number, das?: number, arr?: number }) => {
      engine.current.setGameConfig(config);
      
      // Update local state for UI inputs if needed
      if (config.speed !== undefined) setGameSpeedMultiplier(config.speed);
      setInputConfig(prev => ({
          das: config.das ?? prev.das,
          arr: config.arr ?? prev.arr
      }));
  }, []);

  // Touch controls mapping
  const touchControls = useMemo(() => ({
      move: (dir: number) => engine.current.handleAction(dir === -1 ? 'moveLeft' : 'moveRight'),
      rotate: (dir: number) => engine.current.handleAction(dir === 1 ? 'rotateCW' : 'rotateCCW'),
      softDrop: () => engine.current.handleAction('softDrop'),
      hardDrop: () => engine.current.handleAction('hardDrop'),
      hold: () => engine.current.handleAction('hold'),
      useLineClearer: (y: number) => engine.current.executeLineClearer(y), 
      triggerBombBooster: () => engine.current.activateBombBoosterSelection(),
      triggerLineClearer: () => engine.current.activateLineClearerSelection(),
  }), [gameState]); 

  const activateWildcardSelection = useCallback(() => {
      setWildcardPieceActive(true);
      setGameState('WILDCARD_SELECTION');
  }, [setGameState]);

  const chooseWildcardPiece = useCallback((type: TetrominoType) => {
      engine.current.chooseWildcardPiece(type);
      setWildcardPieceActive(false);
      setGameState('PLAYING'); 
  }, [setGameState]);

  const triggerBombBoosterSelection = useCallback(() => {
      if (stats.bombBoosterReady && gameState === 'PLAYING') {
          engine.current.activateBombBoosterSelection();
      }
  }, [stats.bombBoosterReady, gameState]);

  const confirmBombBooster = useCallback((startRow: number, numRows: number) => {
      if (isSelectingBombRows) {
          engine.current.executeBombBooster(startRow, numRows);
      }
  }, [isSelectingBombRows]);

  const cancelBombBoosterSelection = useCallback(() => {
      if (isSelectingBombRows) {
          engine.current.callbacks.onBombSelectionEnd(); 
          setGameState('PLAYING');
      }
  }, [isSelectingBombRows, setGameState]);

  const triggerLineClearerSelection = useCallback(() => {
      if (stats.lineClearerActive && gameState === 'PLAYING') {
          engine.current.activateLineClearerSelection();
      }
  }, [stats.lineClearerActive, gameState]);

  const confirmLineClearer = useCallback((selectedRow: number) => {
      if (isSelectingLine) {
          engine.current.executeLineClearer(selectedRow);
      }
  }, [isSelectingLine]);

  const cancelLineClearerSelection = useCallback(() => {
      if (isSelectingLine) {
          engine.current.callbacks.onLineSelectionEnd(); 
          setGameState('PLAYING');
      }
  }, [isSelectingLine, setGameState]);

  return {
      engine, 
      stats, 
      nextQueue,
      heldPiece,
      canHold,
      lastHoldTime,
      resetGame,
      setGameState,
      gameState,
      gameMode,
      touchControls,
      aiHint,
      setGameConfig,
      controls,
      setKeyBinding,
      comboCount,
      isBackToBack,
      garbagePending,
      pieceIsGrounded,
      flippedGravity, 
      activateWildcardSelection,
      chooseWildcardPiece,
      wildcardPieceActive,
      triggerBombBoosterSelection,
      confirmBombBooster,
      cancelBombBoosterSelection,
      isSelectingBombRows,
      bombRowsToClear, 
      triggerLineClearerSelection,
      confirmLineClearer,
      cancelLineClearerSelection,
      isSelectingLine,
      selectedLineToClear, 
      blitzSpeedThresholdIndex, 
      activeBoosters: useBoosterStore.getState().activeBoosters 
  };
};

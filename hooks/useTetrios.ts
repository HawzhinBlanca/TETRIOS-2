
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { GameState, GameStats, MoveScore, GameMode, KeyAction, KeyMap, TetrominoType, AdventureLevelConfig, BoosterType, LevelRewards, AudioEvent } from '../types';
import { STAGE_WIDTH, DEFAULT_DAS, DEFAULT_ARR } from '../constants';
import { InputManager } from '../utils/InputManager';
import { useUiStore } from '../stores/uiStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { audioManager } from '../utils/audioManager';

const DEFAULT_CONTROLS: KeyMap = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: [' '],
    rotateCW: ['ArrowUp', 'x'],
    rotateCCW: ['z', 'Control'],
    hold: ['c', 'Shift'],
};

export const useTetrios = () => {
  const [stats, setStats] = useState<GameStats>({ 
    score: 0, rows: 0, level: 0, time: 0, movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
    isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
    wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false, flippedGravityActive: false, flippedGravityTimer: 0,
  });
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>([]);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [aiHint, setAiHint] = useState<MoveScore | null>(null);
  const [controls, setControlsState] = useState<KeyMap>(DEFAULT_CONTROLS);
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

  const aiWorker = useRef<Worker | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const engine = useRef<GameCore>(null!);
  const inputManager = useRef<InputManager>(null!);

  const triggerVisualEffect = useUiStore((state) => state.triggerVisualEffect);
  const { trackFailedLevel, clearFailedAttempts, setStarsEarned } = useAdventureStore();
  const { addCoins, applyLevelRewards, resetActiveBoosters, consumeActiveBoosters } = useBoosterStore();

  // Audio Handler
  const handleAudioEvent = useCallback((event: AudioEvent) => {
      switch(event) {
          case 'MOVE': audioManager.playMove(); break;
          case 'ROTATE': audioManager.playRotate(); break;
          case 'SOFT_DROP': /* Handle soft drop loop if needed */ break;
          case 'HARD_DROP': audioManager.playHardDrop(); break;
          case 'LOCK': audioManager.playLock(); break;
          case 'SOFT_LAND': audioManager.playSoftLand(); break;
          case 'TSPIN': audioManager.playTSpin(); break;
          case 'CLEAR_1': audioManager.playClear(1); break;
          case 'CLEAR_2': audioManager.playClear(2); break;
          case 'CLEAR_3': audioManager.playClear(3); break;
          case 'CLEAR_4': audioManager.playClear(4); break;
          case 'GAME_OVER': audioManager.playGameOver(); break;
          case 'VICTORY': audioManager.playClear(4); break; // Victory sound
          case 'FRENZY_START': audioManager.playFrenzyStart(); break;
          case 'FRENZY_END': audioManager.playFrenzyEnd(); break;
          case 'WILDCARD_SPAWN': audioManager.playWildcardSpawn(); break;
          case 'LASER_CLEAR': audioManager.playLaserClear(); break;
          case 'NUKE_CLEAR': audioManager.playNukeClear(); break;
          case 'NUKE_SPAWN': audioManager.playNukeSpawn(); break;
          case 'BOMB_ACTIVATE': audioManager.playBombBoosterActivate(); break;
          case 'LINE_CLEARER_ACTIVATE': audioManager.playLineClearerActivate(); break;
          case 'BLITZ_SPEEDUP': audioManager.playBlitzSpeedUp(); break;
          case 'GRAVITY_FLIP_START': audioManager.playFlippedGravityActivate(); break;
          case 'GRAVITY_FLIP_END': audioManager.playFlippedGravityEnd(); break;
          case 'UI_HOVER': audioManager.playUiHover(); break;
          case 'UI_CLICK': audioManager.playUiClick(); break;
          case 'UI_SELECT': audioManager.playUiSelect(); break;
          case 'UI_BACK': audioManager.playUiBack(); break;
      }
  }, []);

  if (!engine.current) {
      engine.current = new GameCore({
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
            setGameState(s);
            resetActiveBoosters(); 
          },
          onAiTrigger: () => triggerAi(),
          onComboChange: (c: number, b2b: boolean) => { setComboCount(c); setIsBackToBack(b2b); },
          onGarbageChange: (g: number) => setGarbagePending(g),
          onGroundedChange: (isGrounded: boolean) => setPieceIsGrounded(isGrounded),
          onFlippedGravityChange: (isFlipped: boolean) => setFlippedGravity(isFlipped), 
          onWildcardSelectionTrigger: () => setWildcardPieceActive(true),
          onWildcardAvailableChange: (available: boolean) => setStats(prev => ({...prev, wildcardAvailable: available})),
          onSlowTimeChange: (active: boolean, timer: number) => setStats(prev => ({...prev, slowTimeActive: active, slowTimeTimer: timer})), 
          onBombBoosterReadyChange: (ready: boolean) => setStats(prev => ({...prev, bombBoosterReady: ready})), 
          onBombSelectionStart: (rows: number) => { 
            setIsSelectingBombRows(true); 
            setBombRowsToClear(rows);
            setGameState('BOMB_SELECTION'); 
          },
          onBombSelectionEnd: () => { 
            setIsSelectingBombRows(false);
            setBombRowsToClear(0);
            if (gameState === 'BOMB_SELECTION') setGameState('PLAYING'); 
          },
          onLineClearerActiveChange: (active: boolean) => setStats(prev => ({...prev, lineClearerActive: active})), 
          onLineSelectionStart: () => { 
            setIsSelectingLine(true);
            setGameState('LINE_SELECTION'); 
          },
          onLineSelectionEnd: () => { 
            setIsSelectingLine(false);
            setSelectedLineToClear(null);
            if (gameState === 'LINE_SELECTION') setGameState('PLAYING'); 
          },
          onBlitzSpeedUp: (threshold: number) => triggerVisualEffect('BLITZ_SPEED_THRESHOLD', { threshold }), 
          onFlippedGravityTimerChange: (active: boolean, timer: number) => setStats(prev => ({...prev, flippedGravityActive: active, flippedGravityTimer: timer})),
          onAudio: handleAudioEvent,
      }, DEFAULT_CONTROLS);

      inputManager.current = new InputManager({
        keyMap: engine.current.keyMap,
        das: engine.current.das,
        arr: engine.current.arr
      });
      
      inputManager.current.addActionListener((action: KeyAction) => {
          if (gameState !== 'PLAYING' && gameState !== 'BOMB_SELECTION' && gameState !== 'LINE_SELECTION') return; 
          engine.current.handleAction(action); 
      });
  }

  const triggerAi = useCallback(() => {
      if(aiWorker.current && engine.current.player.tetromino.type) {
          aiWorker.current.postMessage({
              stage: engine.current.stage,
              type: engine.current.player.tetromino.type,
              rotationState: engine.current.rotationState,
              flippedGravity: engine.current.flippedGravity, 
          });
      }
  }, [gameState]);

  useEffect(() => {
    const savedControls = localStorage.getItem('tetrios_controls');
    if (savedControls) {
        try {
            const parsedControls: KeyMap = JSON.parse(savedControls);
            engine.current.keyMap = parsedControls;
            setControlsState(parsedControls);
            inputManager.current.updateConfig({ keyMap: parsedControls });
        } catch(e) {
            console.error("Failed to parse saved controls", e);
        }
    }

    aiWorker.current = createAiWorker();
    aiWorker.current.onmessage = (e: MessageEvent<MoveScore | null>) => setAiHint(e.data);

    return () => { 
        aiWorker.current?.terminate(); 
        inputManager.current?.destroy();
    };
  }, []);

  const resetGame = useCallback((startLevel: number = 0, mode: GameMode = 'MARATHON', adventureLevelConfig?: AdventureLevelConfig | undefined, assistRows?: number, activeBoosters?: BoosterType[]) => {
      engine.current.resetGame(mode, startLevel, adventureLevelConfig, assistRows || 0, activeBoosters || []);
      setGameMode(mode);
      setGameState('PLAYING');
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
      inputManager.current.updateConfig({ das: config.das, arr: config.arr });
  }, []);

  const setKeyBinding = useCallback((action: KeyAction, key: string) => {
      const newControls: KeyMap = { ...engine.current.keyMap };
      Object.keys(newControls).forEach(k => {
          const act = k as KeyAction;
          newControls[act] = newControls[act].filter((k_item: string) => k_item !== key);
      });
      newControls[action] = [key]; 
      engine.current.keyMap = newControls;
      setControlsState(newControls);
      localStorage.setItem('tetrios_controls', JSON.stringify(newControls));
      inputManager.current.updateConfig({ keyMap: newControls });
  }, []);

  const update = useCallback((time: number) => {
      if (gameState !== 'PLAYING' && gameState !== 'WILDCARD_SELECTION' && gameState !== 'BOMB_SELECTION' && gameState !== 'LINE_SELECTION') return; 
      
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (gameState === 'PLAYING') { 
          engine.current.update(deltaTime);
      } else if (gameState === 'WILDCARD_SELECTION' || gameState === 'BOMB_SELECTION' || gameState === 'LINE_SELECTION') {
        engine.current.updateEphemeralStates(deltaTime); 
      }
      
      requestRef.current = requestAnimationFrame(update);
  }, [gameState]);

  useEffect(() => {
      if (gameState === 'PLAYING' || gameState === 'WILDCARD_SELECTION' || gameState === 'BOMB_SELECTION' || gameState === 'LINE_SELECTION') {
          lastTimeRef.current = performance.now();
          requestRef.current = requestAnimationFrame(update);
      }
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, update]);

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
  }, []);

  const chooseWildcardPiece = useCallback((type: TetrominoType) => {
      engine.current.chooseWildcardPiece(type);
      setWildcardPieceActive(false);
      setGameState('PLAYING'); 
  }, []);

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
  }, [isSelectingBombRows]);

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
  }, [isSelectingLine]);

  return {
      engine, 
      stats, // Expose the whole object
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
  };
};

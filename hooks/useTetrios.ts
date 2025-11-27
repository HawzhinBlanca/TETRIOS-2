
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { GameCore } from '../utils/GameCore';
import { createAiWorker } from '../utils/aiWorker';
import { GameMode, TetrominoType, AdventureLevelConfig, BoosterType, LevelRewards, Difficulty } from '../types';
import { useEffectStore } from '../stores/effectStore';
import { useAdventureStore } from '../stores/adventureStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useProfileStore } from '../stores/profileStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { DEFAULT_DAS, DEFAULT_ARR, STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS, KICKS, DIFFICULTY_SETTINGS, DEFAULT_CONTROLS } from '../constants';
import { useGameLoop } from './useGameLoop';
import { useGameAudio } from './useGameAudio';
import { useGameInput } from './useGameInput';
import { useEngineStore } from '../stores/engineStore';
import { useResponsiveLayout } from './useResponsiveLayout';

export const useTetrios = () => {
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

  const aiWorker = useRef<Worker | null>(null);
  const engine = useRef<GameCore>(null!);
  const turnId = useRef<number>(0); 

  const triggerVisualEffect = useEffectStore((state) => state.triggerVisualEffect);
  const { trackFailedLevel, clearFailedAttempts, setStarsEarned } = useAdventureStore();
  const { addCoins, applyLevelRewards, resetActiveBoosters, consumeActiveBoosters } = useBoosterStore();
  const { updateStats } = useProfileStore();

  const { handleAudioEvent } = useGameAudio();
  const { controls, setKeyBinding, resetControls } = useGameInput();
  
  const layout = useResponsiveLayout();

  // Initialize Engine Once
  if (!engine.current) {
      engine.current = new GameCore({
          keyMap: DEFAULT_CONTROLS,
          das: DEFAULT_DAS,
          arr: DEFAULT_ARR,
          initialGrid: { width: layout.cols, height: layout.rows }
      });
      
      engine.current.events.on('VISUAL_EFFECT', (effect) => triggerVisualEffect(effect.type, effect.payload));
      engine.current.events.on('AUDIO', (payload) => handleAudioEvent(payload.event, payload.val, payload.type));
      
      engine.current.events.on('GAME_OVER', ({ state, levelId, rewards }) => {
            if (state === 'GAMEOVER' && levelId) {
                trackFailedLevel(levelId); 
            } else if (state === 'VICTORY' && levelId && rewards) {
                clearFailedAttempts(levelId); 
                setStarsEarned(levelId, rewards.stars); 
                applyLevelRewards(rewards, engine.current.adventureManager.config || undefined);
            } else if ((state === 'GAMEOVER' || state === 'VICTORY') && rewards) { 
                addCoins(rewards.coins); 
            }
            
            if (state === 'GAMEOVER' || state === 'VICTORY') {
               updateStats(
                   { score: engine.current.scoreManager.stats.score, rows: engine.current.scoreManager.stats.rows, level: engine.current.scoreManager.stats.level },
                   engine.current.mode
               );
            }
            resetActiveBoosters(); 
      });
  }

  useGameLoop(engine, gameState, { das: DEFAULT_DAS, arr: DEFAULT_ARR });

  // Update Engine Grid when Layout Changes (don't destroy engine)
  useEffect(() => {
      if (engine.current) {
          engine.current.grid = { width: layout.cols, height: layout.rows };
          engine.current.inputManager.updateConfig({ stageWidth: layout.cols });
          // Re-init board if in menu to match new size immediately
          if (engine.current.stateManager.isMenu()) {
              engine.current.boardManager.initialize('MARATHON', 0);
          }
      }
  }, [layout.cols, layout.rows]);

  // Lifecycle for Worker and Input
  useEffect(() => {
    engine.current.setInputConfig({ keyMap: controls });
    
    const worker = createAiWorker();
    if (worker) {
        aiWorker.current = worker;
        aiWorker.current.postMessage({ type: 'INIT', payload: { STAGE_WIDTH: layout.cols, STAGE_HEIGHT: layout.rows, TETROMINOS, KICKS }});
        aiWorker.current.onmessage = (e: MessageEvent) => {
            if (e.data && e.data.id === turnId.current) {
                useEngineStore.setState({ aiHint: e.data.result });
            }
        };
    }
    
    return () => { 
        aiWorker.current?.terminate(); 
    };
  }, [layout.cols, layout.rows, controls]); 

  // Cleanup on unmount ONLY
  useEffect(() => {
      return () => {
          engine.current?.destroy();
      };
  }, []);

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
      
      engine.current.setGameConfig({ 
          speed: currentSettings.gameSpeed, 
          das: diffConfig.das, 
          arr: diffConfig.arr 
      });
      
      engine.current.resetGame(mode, startLevel, adventureLevelConfig, assistRows, activeBoosters, difficulty, { width: layout.cols, height: layout.rows });
      
      const settingsStore = useGameSettingsStore.getState();
      settingsStore.setDas(diffConfig.das);
      settingsStore.setArr(diffConfig.arr);

      useEngineStore.getState().setGameMode(mode, difficultySetting);
      consumeActiveBoosters(); 
  }, [layout]);

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

  useEffect(() => {
      if(aiWorker.current && engine.current.pieceManager.player.tetromino.type) {
          turnId.current++; 
          aiWorker.current.postMessage({
              id: turnId.current,
              stage: engine.current.boardManager.stage, 
              type: engine.current.pieceManager.player.tetromino.type,
              rotationState: engine.current.pieceManager.rotationState,
              flippedGravity: engine.current.flippedGravity, 
          });
      }
  }, [nextQueue, pieceIsGrounded, heldPiece]); 

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
          engine.current.events.emit('BOMB_SELECTION_END');
          setGameState('PLAYING');
      },
      triggerLineClearerSelection: () => engine.current.activateLineClearerSelection(),
      confirmLineClearer: (r: number) => engine.current.executeLineClearer(r),
      cancelLineClearerSelection: () => {
          engine.current.events.emit('LINE_SELECTION_END');
          setGameState('PLAYING');
      },
      blitzSpeedThresholdIndex: 0, 
      activeBoosters: useBoosterStore.getState().activeBoosters,
      previousGameState: null, 
  };
};

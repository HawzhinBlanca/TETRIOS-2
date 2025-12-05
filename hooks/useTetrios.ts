import { useEngineStore } from '../stores/engineStore';
import { useBoosterStore } from '../stores/boosterStore';
import { useGameSettingsStore } from '../stores/gameSettingsStore';
import { DEFAULT_DAS, DEFAULT_ARR } from '../constants';
import { useGameLoop } from './useGameLoop';
import { useGameInput } from './useGameInput';
import { useResponsiveLayout } from './useResponsiveLayout';
import { useGameEngine } from './useGameEngine';
import { useAiAssistant } from './useAiAssistant';
import { useGameController } from './useGameController';
import { useGameAudioEvents } from './useGameAudioEvents';
import { useGameEffectEvents } from './useGameEffectEvents';
import { useGameStateEvents } from './useGameStateEvents';
import { useGameInputWiring } from './useGameInputWiring';

export const useTetrios = () => {
  // 1. Layout & Core Engine
  const layout = useResponsiveLayout();
  const { engine, savedGameExists, setSavedGameExists } = useGameEngine(layout);

  // 2. State Selectors (Aggregated for Context consumption)
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

  // 3. Configuration & Input
  const { das, arr } = useGameSettingsStore(state => ({ 
      das: state.das || DEFAULT_DAS, 
      arr: state.arr !== undefined ? state.arr : DEFAULT_ARR 
  }));
  const { controls, setKeyBinding, resetControls } = useGameInput();

  // 4. Sub-Systems & Event Wiring
  useAiAssistant(engine, layout);
  useGameAudioEvents(engine);
  useGameEffectEvents(engine);
  useGameStateEvents(engine, setSavedGameExists);
  useGameInputWiring(engine, controls);
  
  const controller = useGameController(engine, layout, setSavedGameExists);

  // 5. Game Loop
  useGameLoop(engine, gameState, { das, arr });

  // Return aggregated API
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
      
      // Control Methods
      resetGame: controller.resetGame,
      continueGame: controller.continueGame,
      savedGameExists,
      setGameState: controller.setGameState,
      setGameConfig: controller.setGameConfig,
      controls,
      setKeyBinding,
      resetControls,
      touchControls: controller.touchControls,
      
      // Specific Actions
      activateWildcardSelection: controller.activateWildcardSelection,
      chooseWildcardPiece: controller.chooseWildcardPiece,
      triggerBombBoosterSelection: controller.triggerBombBoosterSelection,
      confirmBombBooster: controller.confirmBombBooster,
      cancelBombBoosterSelection: controller.cancelBombBoosterSelection,
      triggerLineClearerSelection: controller.triggerLineClearerSelection,
      confirmLineClearer: controller.confirmLineClearer,
      cancelLineClearerSelection: controller.cancelLineClearerSelection,
      
      // Misc
      blitzSpeedThresholdIndex: 0, 
      activeBoosters: useBoosterStore.getState().activeBoosters,
      previousGameState: null, 
  };
};
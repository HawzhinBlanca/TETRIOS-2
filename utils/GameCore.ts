
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED } from '../constants';
import { GameState, TetrominoType, GameMode, KeyAction, FloatingTextVariant, GameCallbacks, BoosterType, LevelRewards, AdventureLevelConfig, KeyMap } from '../types';
import { AdventureManager } from './AdventureManager';
import { BoosterManager } from './BoosterManager';
import { ScoreManager } from './ScoreManager';
import { BoardManager } from './BoardManager';
import { PieceManager } from './PieceManager';
import { FXManager } from './FXManager';
import { GameStateManager } from './GameStateManager';
import { InputManager } from './InputManager';

export class GameCore {
    mode: GameMode = 'MARATHON';
    callbacks: GameCallbacks;
    
    // Managers
    stateManager: GameStateManager;
    adventureManager: AdventureManager;
    boosterManager: BoosterManager;
    scoreManager: ScoreManager;
    boardManager: BoardManager;
    pieceManager: PieceManager;
    fxManager: FXManager;
    inputManager: InputManager;

    // Core State
    flippedGravity: boolean = false;
    initialFlippedGravityGimmick: boolean = false;
    speedMultiplier = DEFAULT_GAMESPEED;
    
    private _gameLoopPaused: boolean = false;

    constructor(callbacks: GameCallbacks, inputConfig: { keyMap: KeyMap, das: number, arr: number }) {
        this.callbacks = callbacks;
        
        // Initialize Input Manager
        this.inputManager = new InputManager({
            keyMap: inputConfig.keyMap,
            das: inputConfig.das,
            arr: inputConfig.arr,
            flippedGravity: false
        });
        this.inputManager.addActionListener((action) => this.handleAction(action));

        // Initialize Sub-Managers
        this.stateManager = new GameStateManager(this);
        this.fxManager = new FXManager(this);
        this.scoreManager = new ScoreManager(this);
        this.boardManager = new BoardManager(this);
        this.pieceManager = new PieceManager(this);
        this.adventureManager = new AdventureManager(this);
        this.boosterManager = new BoosterManager(this);
    }

    destroy(): void {
        this.inputManager.destroy();
    }

    setGameConfig(config: { speed?: number, das?: number, arr?: number }): void {
        if (config.speed !== undefined) this.speedMultiplier = config.speed;
        
        // Update Input Manager Config
        this.inputManager.updateConfig({
            das: config.das,
            arr: config.arr
        });
    }

    setInputConfig(config: { keyMap?: KeyMap, das?: number, arr?: number }): void {
        this.inputManager.updateConfig(config);
    }

    setFlippedGravity(isFlipped: boolean): void {
        this.flippedGravity = isFlipped;
        this.inputManager.updateConfig({ flippedGravity: isFlipped });
        this.callbacks.onFlippedGravityChange(isFlipped);
    }

    resetGame(mode: GameMode = 'MARATHON', startLevel: number = 0, adventureLevelConfig: AdventureLevelConfig | undefined, assistRows: number = 0, activeBoosters: BoosterType[] = []): void {
        this.mode = mode;
        
        this.initialFlippedGravityGimmick = adventureLevelConfig?.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY') || false;
        this.setFlippedGravity(this.initialFlippedGravityGimmick);

        this.scoreManager.reset(mode, startLevel);
        this.adventureManager.reset(adventureLevelConfig);
        this.boosterManager.reset(activeBoosters);
        this.boardManager.initialize(mode, startLevel, adventureLevelConfig, assistRows);
        this.fxManager.clear();
        
        this._clearEphemeralStates();
        
        this.pieceManager.reset(startLevel, adventureLevelConfig); // Must be called after board init
        
        // Force state to PLAYING via FSM
        this.stateManager.forceState('PLAYING');
    }

    private _clearEphemeralStates(): void {
        this.boosterManager.isSelectingBombRows = false;
        this.callbacks.onBombSelectionEnd();
        this.boosterManager.isSelectingLine = false;
        this.boosterManager.selectedLineToClear = null;
        this.callbacks.onLineSelectionEnd();
    }

    public triggerGameOver(state: GameState, rewards?: LevelRewards): void {
        // Notify external handlers via existing callback, but handle state transition internally
        this.callbacks.onGameOver(state, this.adventureManager.config?.id, rewards);
        
        if (state === 'VICTORY') {
            this.stateManager.transitionTo('VICTORY');
        } else {
            this.stateManager.transitionTo('GAMEOVER');
        }
    }

    public pauseGameLoop(): void {
        this._gameLoopPaused = true;
    }

    public resumeGameLoop(): void {
        this._gameLoopPaused = false;
    }

    public applyScore(result: { score: number }): void {
        this.scoreManager.applyScore(result.score);
    }

    handleAction(action: KeyAction): void {
        // Only allow actions if playing
        if (!this.stateManager.isPlaying() && this.stateManager.currentState !== 'BOMB_SELECTION' && this.stateManager.currentState !== 'LINE_SELECTION') {
            return;
        }

        if (this.boosterManager.isSelectingBombRows || this.boosterManager.isSelectingLine) return;

        switch (action) {
            case 'moveLeft': this.pieceManager.move(-1); break;
            case 'moveRight': this.pieceManager.move(1); break;
            case 'softDrop': this.pieceManager.softDrop(); break;
            case 'hardDrop': this.pieceManager.hardDrop(); break;
            case 'rotateCW': this.pieceManager.rotate(1); break;
            case 'rotateCCW': this.pieceManager.rotate(-1); break;
            case 'hold': this.pieceManager.hold(); break;
        }
    }

    // Delegates to Managers
    spawnPiece(): void { this.pieceManager.spawnPiece(); }
    sweepRows(newStage: any, isTSpinDetected: boolean = false, manualClearedRows?: number[]): void { 
        this.boardManager.sweepRows(newStage, isTSpinDetected, manualClearedRows); 
    }
    clearBottomLine(): void { this.boardManager.clearBottomLine(); }
    nukeBoard(): void { this.boardManager.nukeBoard(); }
    chooseWildcardPiece(type: TetrominoType): void { this.pieceManager.chooseWildcardPiece(type); }
    activateLineClearerSelection(): void { this.boosterManager.activateLineClearerSelection(); }
    executeLineClearer(selectedRow: number): void { this.boosterManager.executeLineClearer(selectedRow); }
    activateBombBoosterSelection(): void { this.boosterManager.activateBombBoosterSelection(); }
    executeBombBooster(startRow: number, numRows: number): void { this.boosterManager.executeBombBooster(startRow, numRows); }

    // Delegate to FXManager
    addFloatingText(text: string, color: string, scale: number = 0.5, variant: FloatingTextVariant = 'default'): void {
        this.fxManager.addFloatingText(text, color, scale, variant);
    }

    update(deltaTime: number): void {
        if (this._gameLoopPaused) return;

        // Drive Input Manager
        this.inputManager.update(deltaTime);

        this.adventureManager.update(deltaTime);
        this.scoreManager.update(deltaTime);
        this.adventureManager.checkObjectives();
        this.boosterManager.update(deltaTime);
        this.pieceManager.update(deltaTime); // Handles gravity
        this.updateEphemeralStates(deltaTime);
    }

    updateEphemeralStates(deltaTime: number): void {
        this.fxManager.update(deltaTime);
    }
}

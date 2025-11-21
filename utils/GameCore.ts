




import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED, BLITZ_INITIAL_DROPTIME, SURVIVAL_INITIAL_GARBAGE_INTERVAL, SURVIVAL_MIN_GARBAGE_INTERVAL, SURVIVAL_GARBAGE_DECREMENT } from '../constants';
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
    
    // Survival Mode State
    survivalTimer: number = 0;
    currentGarbageInterval: number = 0;
    
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
        if (config.speed !== undefined) {
            this.speedMultiplier = config.speed;
            // Recalculate speed immediately when settings change
            this.updateSpeed();
        }
        
        // Update Input Manager Config
        this.inputManager.updateConfig({
            das: config.das,
            arr: config.arr
        });
    }
    
    // External hooks can still force drop time if needed, but internal logic prefers handleLevelUp
    setDropTime(ms: number): void {
        this.pieceManager.dropTime = ms;
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
        
        if (mode === 'SURVIVAL') {
            this.survivalTimer = 0;
            this.currentGarbageInterval = SURVIVAL_INITIAL_GARBAGE_INTERVAL;
        }
        
        // Calculate initial speed
        const initialSpeed = this._calculateBaseSpeed(startLevel);
        this.pieceManager.dropTime = initialSpeed;
        
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

    /**
     * Centralized Level Progression Logic.
     * Updates stats, recalculates speed, and triggers feedback.
     */
    public handleLevelUp(newLevel: number): void {
        if (newLevel <= this.scoreManager.stats.level) return;

        this.scoreManager.stats.level = newLevel;
        
        // 1. Calculate and set new base speed
        this.updateSpeed();

        // 2. Visuals/Audio
        this.addFloatingText(`LEVEL ${newLevel}`, '#fbbf24', 1.0); // Gold text
        this.callbacks.onAudio('LEVEL_UP');
        
        // 3. Difficulty scaling: Reduce Lock Delay in very high levels for "Master" feel
        // Standard lock delay is 500ms.
        if (newLevel >= 20) {
             this.pieceManager.lockDelayDuration = Math.max(150, 500 - (newLevel - 20) * 15);
        } else {
             this.pieceManager.lockDelayDuration = 500;
        }
    }

    /**
     * Recalculates and sets the current drop speed based on level and settings.
     */
    public updateSpeed(): void {
        const currentLevel = this.scoreManager.stats.level;
        const speed = this._calculateBaseSpeed(currentLevel);
        this.pieceManager.dropTime = speed;
    }

    /**
     * Calculates the base gravity (drop interval in ms) based on level and game mode.
     */
    private _calculateBaseSpeed(level: number): number {
        let baseDropTime = 1000;

        if (this.mode === 'ZEN' || this.mode === 'PUZZLE') {
            return 1000000; // Effectively infinite
        } 
        if (this.mode === 'MASTER') {
            return 0; // Instant
        } 
        if (this.mode === 'BLITZ') {
            return BLITZ_INITIAL_DROPTIME; // Blitz speed is handled via score thresholds in ScoreManager
        }
        if (this.mode === 'SURVIVAL' || this.mode === 'COMBO_MASTER') {
            // Moderate speed that ramps up
            const effectiveLevel = Math.max(1, level);
            baseDropTime = Math.max(150, Math.pow(0.85 - ((effectiveLevel - 1) * 0.005), effectiveLevel - 1) * 800);
            return baseDropTime / this.speedMultiplier;
        }

        // Standard Curve
        if (this.mode === 'ADVENTURE') {
             // Adventure scaling based on level index
             const lvlIndex = this.adventureManager.config?.index || 0;
             baseDropTime = Math.max(100, Math.pow(0.95, lvlIndex) * 1000);
        } else {
             // Marathon scaling: Standard Tetris-like curve
             // Formula: (0.8 - ((Level - 1) * 0.007)) ^ (Level - 1) * 1000
             const effectiveLevel = Math.max(1, level);
             baseDropTime = Math.max(100, Math.pow(0.8 - ((effectiveLevel - 1) * 0.007), effectiveLevel - 1) * 1000);
        }

        // Apply Global Speed Multiplier from Settings
        return baseDropTime / this.speedMultiplier;
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
        
        // Survival Mode Logic
        if (this.mode === 'SURVIVAL' && this.stateManager.isPlaying()) {
            this.survivalTimer += deltaTime;
            if (this.survivalTimer >= this.currentGarbageInterval) {
                this.boardManager.addGarbage(1);
                this.addFloatingText("SURVIVE!", "#ef4444", 0.8, 'frenzy');
                this.survivalTimer = 0;
                this.currentGarbageInterval = Math.max(SURVIVAL_MIN_GARBAGE_INTERVAL, this.currentGarbageInterval - SURVIVAL_GARBAGE_DECREMENT);
            }
        }

        this.updateEphemeralStates(deltaTime);
    }

    updateEphemeralStates(deltaTime: number): void {
        this.fxManager.update(deltaTime);
    }
}
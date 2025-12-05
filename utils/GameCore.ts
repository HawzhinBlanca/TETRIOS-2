
import { EventManager } from './EventManager';
import { GameStateManager } from './GameStateManager';
import { ScoreManager } from './ScoreManager';
import { BoardManager } from './BoardManager';
import { PieceManager } from './PieceManager';
import { InputManager, InputConfig } from './InputManager';
import { AdventureManager } from './AdventureManager';
import { BoosterManager } from './BoosterManager';
import { FXManager } from './FXManager';
import { StateSyncManager } from './StateSyncManager';
import { AbilityManager } from './AbilityManager';
import { SeededRNG } from './gameUtils';
import { GameMode, Difficulty, AdventureLevelConfig, BoosterType, MoveScore, KeyMap, KeyAction, TetrominoType } from '../types';
import { safeStorage } from './safeStorage';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { createInitialState, gameTick, movePiece, rotatePiece, hardDrop, softDrop, spawnPiece, holdPiece } from '../logic/tetris';
import { GameState as InternalGameState } from '../types/internal';
import { telemetry } from './TelemetryManager';

interface GameCoreConfig {
    keyMap: KeyMap;
    das: number;
    arr: number;
    initialGrid?: { width: number; height: number };
}

export class GameCore {
    public events: EventManager;
    public stateManager: GameStateManager;
    public scoreManager: ScoreManager;
    public boardManager: BoardManager;
    public pieceManager: PieceManager;
    public inputManager: InputManager;
    public adventureManager: AdventureManager;
    public boosterManager: BoosterManager;
    public fxManager: FXManager;
    public stateSyncManager: StateSyncManager;
    public abilityManager: AbilityManager;

    public state: InternalGameState;
    public rng: SeededRNG;
    public grid: { width: number; height: number };
    
    public mode: GameMode = 'MARATHON';
    public difficulty: Difficulty = 'MEDIUM';
    public flippedGravity: boolean = false;
    public initialFlippedGravityGimmick: boolean = false;
    public isRewinding: boolean = false;
    public missedOpportunity: MoveScore | null = null;

    private history: string[] = [];
    private gameLoopRunning: boolean = false;
    private startTime: number = 0;
    private pausedTime: number = 0;
    private pauseStart: number = 0;

    constructor(config: GameCoreConfig) {
        this.grid = config.initialGrid || { width: STAGE_WIDTH, height: STAGE_HEIGHT };
        this.events = new EventManager();
        this.rng = new SeededRNG(Date.now().toString());
        
        // Initial Dummy State
        this.state = createInitialState(this.rng, undefined, this.grid);

        // Managers
        this.stateManager = new GameStateManager(this);
        this.scoreManager = new ScoreManager(this);
        this.boardManager = new BoardManager(this);
        this.pieceManager = new PieceManager(this);
        this.inputManager = new InputManager({
            keyMap: config.keyMap,
            das: config.das,
            arr: config.arr,
            flippedGravity: false,
            stageWidth: this.grid.width
        });
        this.inputManager.addActionListener(this.handleAction.bind(this));
        
        this.adventureManager = new AdventureManager(this);
        this.boosterManager = new BoosterManager(this);
        this.fxManager = new FXManager(this);
        this.stateSyncManager = new StateSyncManager(this);
        this.abilityManager = new AbilityManager(this);

        telemetry.log('INFO', 'GameCore Initialized', { 
            grid: this.grid, 
            das: config.das, 
            arr: config.arr 
        });
    }

    public destroy() {
        this.inputManager.destroy();
        this.events.clear();
        telemetry.log('INFO', 'GameCore Destroyed');
    }

    public resetGame(
        mode: GameMode, 
        startLevel: number, 
        adventureConfig?: AdventureLevelConfig, 
        assistRows: number = 0, 
        activeBoosters: BoosterType[] = [],
        difficulty: Difficulty = 'MEDIUM'
    ) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.rng = new SeededRNG(Date.now().toString());
        
        telemetry.log('INFO', 'Game Session Started', {
            mode,
            level: startLevel,
            difficulty,
            boosters: activeBoosters,
            adventureId: adventureConfig?.id
        });
        
        telemetry.incrementCounter('game_start_total', 1, { mode, difficulty });

        // Reset Managers
        this.adventureManager.reset(adventureConfig);
        this.boosterManager.reset(activeBoosters);
        this.scoreManager.reset(mode, startLevel);
        this.stateSyncManager.reset();
        this.fxManager.clear();
        this.abilityManager.initialize([]); 

        // Initialize State
        this.initialFlippedGravityGimmick = adventureConfig?.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY') || false;
        this.setFlippedGravity(this.initialFlippedGravityGimmick || this.boosterManager.flippedGravityActive);

        this.state = createInitialState(this.rng, adventureConfig?.piecePool, this.grid);
        this.boardManager.initialize(mode, startLevel);
        
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.history = [];
    }

    public update(deltaTime: number) {
        if (!this.gameLoopRunning) return;

        // Performance Tracking
        if (deltaTime > 34) { // < 30 FPS
            telemetry.recordHistogram('frame_duration_ms', deltaTime, { mode: this.mode });
        }

        this.inputManager.update(deltaTime);
        this.boosterManager.update(deltaTime);
        this.scoreManager.update(deltaTime);
        this.adventureManager.update(deltaTime);
        this.fxManager.update(deltaTime);
        this.abilityManager.update(deltaTime);

        // Game Tick Logic
        if (!this.state.flags.isPaused && !this.state.flags.isGameOver) {
            let speed = this.state.gravity.speed;
            if (this.boosterManager.slowTimeActive) speed *= 2;
            if (this.boosterManager.timeFreezeActive) speed = Infinity;
            if (this.scoreManager.stats.isFrenzyActive) speed *= 0.8;
            
            const tickRes = gameTick({ ...this.state, gravity: { ...this.state.gravity, speed } }, deltaTime, this.flippedGravity, this.rng);
            this.state = tickRes.state;
            this.processEffects(tickRes.effects);
        }

        // Failsafe: If state flags indicate Game Over but we are not in GAMEOVER state manager, force it.
        // This catches edge cases where the effect might have been processed before a re-render or during a pause transition
        if (this.state.flags.isGameOver && this.stateManager.currentState !== 'GAMEOVER') {
            telemetry.log('WARN', 'State Mismatch: Flag isGameOver but StateManager is not', { currentState: this.stateManager.currentState });
            this.triggerGameOver('GAMEOVER');
        }

        this.adventureManager.checkObjectives();
        this.stateSyncManager.sync();
        
        if (this.state.flags.isLocking) {
             // Optional: handle lock specific logic if needed
        }
    }

    public updateEphemeralStates(deltaTime: number) {
        this.fxManager.update(deltaTime);
        this.stateSyncManager.sync();
    }

    private processEffects(effects: any[]) {
        effects.forEach(e => {
            if (e.type === 'AUDIO') this.events.emit('AUDIO', e);
            if (e.type === 'VISUAL') this.events.emit('VISUAL_EFFECT', e);
            if (e.type === 'UI') this.events.emit(e.event as any, e.payload);
            if (e.type === 'LOCK') {
                this.saveHistory();
                this.scoreManager.handleClearEffects(e.payload); 
            }
            if (e.type === 'GAME_OVER') this.triggerGameOver('GAMEOVER');
        });
    }

    public handleAction(action: KeyAction) {
        if (this.state.flags.isPaused || this.state.flags.isGameOver) return;

        let res;
        switch (action) {
            case 'moveLeft': res = movePiece(this.state, -1, this.flippedGravity); break;
            case 'moveRight': res = movePiece(this.state, 1, this.flippedGravity); break;
            case 'rotateCW': res = rotatePiece(this.state, 1, this.flippedGravity); break;
            case 'rotateCCW': res = rotatePiece(this.state, -1, this.flippedGravity); break;
            case 'softDrop': res = softDrop(this.state, this.flippedGravity); break;
            case 'hardDrop': 
                res = hardDrop(this.state, this.flippedGravity, this.rng); 
                this.saveHistory(); 
                break;
            case 'hold': 
                res = holdPiece(this.state, this.flippedGravity, this.rng);
                break; 
            case 'zone': 
                this.scoreManager.tryActivateZone(); 
                return;
            case 'rewind':
                this.rewind();
                return;
            case 'ability1': this.abilityManager.triggerAbility(0); return;
            case 'ability2': this.abilityManager.triggerAbility(1); return;
            case 'ability3': this.abilityManager.triggerAbility(2); return;
        }

        if (res) {
            this.state = res.state;
            this.processEffects(res.effects);
            this.stateSyncManager.sync();
        }
    }

    private saveHistory() {
        if (this.mode === 'ADVENTURE' || this.mode === 'ZEN' || this.mode === 'PUZZLE') {
            const stateStr = JSON.stringify(this.state);
            this.history.push(stateStr);
            if (this.history.length > 50) this.history.shift();
        }
    }

    private rewind() {
        if (this.mode !== 'ADVENTURE' && this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
            this.events.emit('AUDIO', { event: 'UI_BACK' });
            return;
        }

        if (this.history.length === 0) return;

        telemetry.incrementCounter('rewind_used', 1, { mode: this.mode });

        const previousStateStr = this.history.pop();
        if (previousStateStr) {
            const previousState = JSON.parse(previousStateStr) as InternalGameState;
            this.state = previousState;
            this.rng.state = previousState.rngState;
            
            this.isRewinding = true;
            this.events.emit('AUDIO', { event: 'REWIND' });
            this.events.emit('VISUAL_EFFECT', { type: 'ABERRATION' });
            this.stateSyncManager.sync();
            
            setTimeout(() => {
                this.isRewinding = false;
                this.stateSyncManager.sync();
            }, 200);
        }
    }

    public setInputConfig(config: Partial<InputConfig>) {
        this.inputManager.updateConfig(config);
    }

    public setGameConfig(config: { speed: number; das: number; arr: number }) {
        this.state.gravity.speed = 1000 / config.speed;
        this.inputManager.updateConfig({ das: config.das, arr: config.arr });
    }

    public setFlippedGravity(flipped: boolean) {
        this.flippedGravity = flipped;
        this.inputManager.updateConfig({ flippedGravity: flipped });
    }

    public pauseGameLoop() {
        this.gameLoopRunning = false;
        this.pauseStart = Date.now();
        this.state.flags.isPaused = true;
        telemetry.log('INFO', 'Game Paused');
    }

    public resumeGameLoop() {
        if (this.pauseStart > 0) {
            this.pausedTime += Date.now() - this.pauseStart;
            this.pauseStart = 0;
        }
        this.gameLoopRunning = true;
        this.state.flags.isPaused = false;
        telemetry.log('INFO', 'Game Resumed');
    }

    public getElapsedGameTime() {
        if (this.pauseStart > 0) {
            return Date.now() - this.startTime - this.pausedTime - (Date.now() - this.pauseStart);
        }
        return Date.now() - this.startTime - this.pausedTime;
    }

    public calculateStressLevel(): number {
        const board = this.state.board;
        const h = board.length;
        let highestBlock = 0;
        for(let y=0; y<h; y++) {
            if(board[y].some(c => c[1] !== 'clear')) {
                const height = this.flippedGravity ? (y + 1) : (h - y);
                highestBlock = Math.max(highestBlock, height);
                if (!this.flippedGravity) break;
            }
        }
        return Math.min(1, highestBlock / h);
    }

    public updateSpeed() {
        const level = this.state.level;
        const baseSpeed = Math.pow(0.8 - ((level - 1) * 0.007), level - 1) * 1000;
        this.state.gravity.speed = Math.max(50, baseSpeed);
    }

    public triggerGameOver(state: 'GAMEOVER' | 'VICTORY', rewards?: any) {
        this.stateManager.transitionTo(state);
        this.events.emit('GAME_OVER', { state, rewards });
        
        telemetry.log('INFO', state === 'VICTORY' ? 'Game Won' : 'Game Lost', {
            finalScore: this.scoreManager.stats.score,
            level: this.scoreManager.stats.level,
            lines: this.scoreManager.stats.rows,
            mode: this.mode,
            duration: this.getElapsedGameTime() / 1000
        });

        telemetry.incrementCounter('game_over_total', 1, { 
            result: state,
            mode: this.mode 
        });
    }

    public saveGame() {
        if (this.state.flags.isGameOver) return;
        const saveData = {
            state: this.state,
            mode: this.mode,
            difficulty: this.difficulty,
            stats: this.scoreManager.stats,
            timestamp: Date.now()
        };
        safeStorage.setItem('tetrios-saved-game', JSON.stringify(saveData));
    }

    public loadGame(): boolean {
        const raw = safeStorage.getJson<any>('tetrios-saved-game');
        if (!raw) return false;
        
        this.state = raw.state;
        this.mode = raw.mode;
        this.difficulty = raw.difficulty;
        this.scoreManager.stats = raw.stats;
        this.boosterManager.restoreState(raw.stats);
        
        this.startTime = Date.now() - raw.stats.time * 1000;
        this.pausedTime = 0;
        
        telemetry.log('INFO', 'Game Loaded from Save');
        return true;
    }

    public clearSavedGame() {
        safeStorage.removeItem('tetrios-saved-game');
    }
    
    public static hasSavedGame(): boolean {
        return !!safeStorage.getItem('tetrios-saved-game');
    }

    public activateBombBoosterSelection() {
        this.boosterManager.activateBombBoosterSelection();
    }
    
    public executeBombBooster(startRow: number, numRows: number) {
        this.boosterManager.executeBombBooster(startRow, numRows);
    }
    
    public activateLineClearerSelection() {
        this.boosterManager.activateLineClearerSelection();
    }
    
    public executeLineClearer(row: number) {
        this.boosterManager.executeLineClearer(row);
    }
    
    public chooseWildcardPiece(type: TetrominoType) {
        this.pieceManager.injectRewardPiece(type);
    }
    
    public applyScore(amount: number) {
        this.scoreManager.applyScore(amount);
    }
    
    public addFloatingText(text: string, color: string, scale?: number, variant?: any) {
        this.fxManager.addFloatingText(text, color, scale, variant);
    }
    
    public sweepRows(board: any, ...args: any[]) {
        this.boardManager.sweepRows(board, ...args);
    }

    public spawnPiece() {
        if (this.state.flags.isGameOver) return;
        const res = spawnPiece(this.state, this.flippedGravity, this.rng, []);
        this.state = res.state;
        this.processEffects(res.effects);
        this.stateSyncManager.sync();
    }
}

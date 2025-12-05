
import { createInitialState, gameTick, movePiece, rotatePiece, hardDrop, softDrop, holdPiece } from '../logic/tetris';
import { GameState, TickResult, GameEffect } from '../types/internal';
import { KeyAction } from '../types';
import { SeededRNG } from './gameUtils';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

type StateListener = (state: GameState) => void;
type EffectListener = (effects: GameEffect[]) => void;

interface EngineConfig {
    seed?: string;
    width?: number;
    height?: number;
    flippedGravity?: boolean;
}

/**
 * GameEngine: The authoritative source of truth.
 * Unlike GameCore, this class does NOT hold references to UI Managers.
 * It is a pure state container + loop.
 */
export class GameEngine {
    private _state: GameState;
    private rng: SeededRNG;
    private loopId: number | null = null;
    private lastTime: number = 0;
    
    // Config
    public flippedGravity: boolean = false;
    
    // Observers
    private stateListeners: Set<StateListener> = new Set();
    private effectListeners: Set<EffectListener> = new Set();

    constructor(config: EngineConfig = {}) {
        this.rng = new SeededRNG(config.seed || Date.now().toString());
        this.flippedGravity = config.flippedGravity || false;
        
        this._state = createInitialState(
            this.rng, 
            undefined, 
            { width: config.width || STAGE_WIDTH, height: config.height || STAGE_HEIGHT }
        );
    }

    public get state(): GameState {
        return this._state;
    }

    public start() {
        if (this.loopId) return;
        this.lastTime = performance.now();
        this.loop();
    }

    public stop() {
        if (this.loopId) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }
    }

    public setPaused(paused: boolean) {
        this._state.flags.isPaused = paused;
        this.notifyState();
    }

    public dispatch(action: KeyAction) {
        if (this._state.flags.isGameOver || this._state.flags.isPaused) return;

        let result: TickResult;

        switch (action) {
            case 'moveLeft': 
                result = movePiece(this._state, -1, this.flippedGravity); 
                break;
            case 'moveRight': 
                result = movePiece(this._state, 1, this.flippedGravity); 
                break;
            case 'rotateCW': 
                result = rotatePiece(this._state, 1, this.flippedGravity); 
                break;
            case 'rotateCCW': 
                result = rotatePiece(this._state, -1, this.flippedGravity); 
                break;
            case 'softDrop': 
                result = softDrop(this._state, this.flippedGravity); 
                break;
            case 'hardDrop': 
                result = hardDrop(this._state, this.flippedGravity, this.rng); 
                break;
            case 'hold':
                result = holdPiece(this._state, this.flippedGravity, this.rng);
                break;
            default: 
                return; // Unknown action
        }

        this.applyResult(result);
    }

    private loop = () => {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        const result = gameTick(this._state, dt, this.flippedGravity, this.rng);
        this.applyResult(result);

        this.loopId = requestAnimationFrame(this.loop);
    };

    private applyResult(result: TickResult) {
        if (!result) return;
        
        // Optimistic check: only notify if state changed
        const stateChanged = this._state !== result.state;
        
        this._state = result.state;
        
        if (result.effects && result.effects.length > 0) {
            this.effectListeners.forEach(fn => fn(result.effects));
        }

        // We can throttle this if needed, but for now we trust the loop
        if (stateChanged) {
            this.notifyState();
        }
    }

    // --- Subscription System ---
    
    public subscribe(fn: StateListener) {
        this.stateListeners.add(fn);
        // Initial emit
        fn(this._state);
        return () => this.stateListeners.delete(fn);
    }

    public onEffect(fn: EffectListener) {
        this.effectListeners.add(fn);
        return () => this.effectListeners.delete(fn);
    }

    private notifyState() {
        this.stateListeners.forEach(fn => fn(this._state));
    }
    
    // --- Serialization (For Rewind/Save) ---
    public serialize(): string {
        return JSON.stringify(this._state);
    }
    
    public hydrate(json: string) {
        try {
            const loaded = JSON.parse(json);
            // In a real app, validate schema here
            this._state = loaded;
            // Restore RNG state
            this.rng.state = loaded.rngState || Date.now();
            this.notifyState();
        } catch(e) {
            console.error("Failed to hydrate game state", e);
        }
    }
}

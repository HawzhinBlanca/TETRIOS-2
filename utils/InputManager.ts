
import { KeyMap, KeyAction } from '../types';
import { engineStore } from '../stores/engineStore';
import { STAGE_WIDTH } from '../constants';

export interface InputConfig {
    keyMap: KeyMap;
    das: number;
    arr: number;
    flippedGravity?: boolean;
    stageWidth?: number;
}

type ActionListener = (action: KeyAction) => void;

export class InputManager {
    private config: InputConfig;
    private heldKeys: Set<string> = new Set();
    private keyTimestamps: Map<string, number> = new Map();
    private keyActionMap: Map<string, KeyAction> = new Map();
    private actionListeners: Set<ActionListener> = new Set();
    private actionQueue: KeyAction[] = [];

    // Sub-Frame State
    private activeHorizDir: 'moveLeft' | 'moveRight' | null = null;
    private horizTimeHeld: number = 0; 
    private lastMoveCount: number = 0; 

    private isSoftDropping: boolean = false;
    private softDropTimeHeld: number = 0;
    private lastDropCount: number = 0;

    // Gamepad State
    private gamepadIndex: number | null = null;
    private lastGamepadState: Set<string> = new Set();
    private axisState: Map<string, boolean> = new Map();

    private isDestroyed: boolean = false;

    constructor(config: InputConfig) {
        this.config = config;
        this.rebuildKeyMap();

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.boundKeyDown);
            window.addEventListener('keyup', this.boundKeyUp);
            window.addEventListener('blur', this.boundBlur);
            window.addEventListener("gamepadconnected", (e) => {
                console.log("[Input] Gamepad connected:", e.gamepad.id);
                this.gamepadIndex = e.gamepad.index;
            });
            window.addEventListener("gamepaddisconnected", (e) => {
                if (this.gamepadIndex === e.gamepad.index) {
                    this.gamepadIndex = null;
                }
            });
        }
    }

    public updateConfig(newConfig: Partial<InputConfig>): void {
        if (newConfig.das !== undefined) this.config.das = newConfig.das;
        if (newConfig.arr !== undefined) this.config.arr = newConfig.arr;
        if (newConfig.flippedGravity !== undefined) this.config.flippedGravity = newConfig.flippedGravity;
        if (newConfig.stageWidth !== undefined) this.config.stageWidth = newConfig.stageWidth;

        if (newConfig.keyMap) {
            this.config.keyMap = newConfig.keyMap;
            this.rebuildKeyMap();
        }
    }

    private rebuildKeyMap(): void {
        this.keyActionMap.clear();
        for (const [action, keys] of Object.entries(this.config.keyMap)) {
            for (const key of keys) {
                this.keyActionMap.set(key, action as KeyAction);
            }
        }
    }

    public addActionListener(listener: ActionListener): void {
        this.actionListeners.add(listener);
    }

    private emitAction(action: KeyAction): void {
        this.actionListeners.forEach(listener => listener(action));
    }

    private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    private boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
    private boundBlur = () => this.handleBlur();

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.repeat) return; 
        const key = e.key;
        const action = this.getActionFromKey(key);
        
        if (action) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Backspace'].includes(key)) {
                e.preventDefault();
            }
            
            this.heldKeys.add(key);
            this.keyTimestamps.set(key, performance.now());
            
            const effectiveAction = this.getEffectiveAction(action);
            
            if (['rotateCW', 'rotateCCW', 'hardDrop', 'hold', 'zone', 'rewind'].includes(effectiveAction)) {
                this.emitAction(effectiveAction);
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.heldKeys.delete(e.key);
        this.keyTimestamps.delete(e.key);
    }

    private handleBlur(): void {
        this.heldKeys.clear();
        this.keyTimestamps.clear();
        this.lastGamepadState.clear();
        this.axisState.clear();
        this.actionQueue = [];
        this.activeHorizDir = null;
        this.horizTimeHeld = 0;
        this.lastMoveCount = 0;
        this.isSoftDropping = false;
        this.softDropTimeHeld = 0;
        this.lastDropCount = 0;
        
        engineStore.setState({ inputVector: { x: 0, y: 0 } });
    }

    public isRewindHeld(): boolean {
        for (const key of this.heldKeys) {
            if (this.getActionFromKey(key) === 'rewind') return true;
        }
        return false;
    }

    private getEffectiveAction(action: KeyAction): KeyAction {
        if (this.config.flippedGravity) {
            if (action === 'softDrop') return 'softDrop'; 
            if (action === 'hardDrop') return 'hardDrop';
        }
        return action;
    }

    public reset(): void {
        this.handleBlur();
    }

    private getActionFromKey(key: string): KeyAction | null {
        return this.keyActionMap.get(key) || null;
    }

    private pollGamepad(): void {
        const gamepads = navigator.getGamepads();
        
        // Auto-detect or refresh invalid index
        if (this.gamepadIndex === null || !gamepads[this.gamepadIndex]) {
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    this.gamepadIndex = i;
                    break;
                }
            }
        }

        if (this.gamepadIndex === null) return;
        
        const gamepad = gamepads[this.gamepadIndex];
        if (!gamepad) return;

        const currentKeys = new Set<string>();

        // Buttons
        gamepad.buttons.forEach((btn, i) => {
            if (btn.pressed) currentKeys.add(`GP_BTN_${i}`);
        });

        // Axes
        const PRESS_THRESH = 0.5;
        const RELEASE_THRESH = 0.3;

        gamepad.axes.forEach((val, i) => {
            const keyNeg = `GP_AXIS_${i}-`;
            const wasNeg = this.axisState.get(keyNeg) || false;
            const isNeg = val < -PRESS_THRESH || (wasNeg && val < -RELEASE_THRESH);
            
            if (isNeg) {
                currentKeys.add(keyNeg);
                this.axisState.set(keyNeg, true);
            } else {
                this.axisState.set(keyNeg, false);
            }

            const keyPos = `GP_AXIS_${i}+`;
            const wasPos = this.axisState.get(keyPos) || false;
            const isPos = val > PRESS_THRESH || (wasPos && val > RELEASE_THRESH);
            
            if (isPos) {
                currentKeys.add(keyPos);
                this.axisState.set(keyPos, true);
            } else {
                this.axisState.set(keyPos, false);
            }
        });

        for (const key of currentKeys) {
            if (!this.lastGamepadState.has(key)) {
                this.heldKeys.add(key);
                this.keyTimestamps.set(key, performance.now());

                const action = this.getActionFromKey(key);
                if (action) {
                    const effectiveAction = this.getEffectiveAction(action);
                    if (['rotateCW', 'rotateCCW', 'hardDrop', 'hold', 'zone', 'rewind'].includes(effectiveAction)) {
                        this.emitAction(effectiveAction);
                    }
                }
            }
        }

        for (const key of this.lastGamepadState) {
            if (!currentKeys.has(key)) {
                this.heldKeys.delete(key);
                this.keyTimestamps.delete(key);
            }
        }

        this.lastGamepadState = currentKeys;
    }

    private syncInputVector(x: number, y: number) {
        const current = engineStore.getState().inputVector;
        if (current.x !== x || current.y !== y) {
            engineStore.setState({ inputVector: { x, y } });
        }
    }

    private handleHorizontalInput(deltaTime: number): { x: number } {
        let leftPressed = false;
        let rightPressed = false;
        let leftTime = 0;
        let rightTime = 0;

        for (const key of this.heldKeys) {
            const raw = this.getActionFromKey(key);
            if (!raw) continue;
            const action = this.getEffectiveAction(raw);
            const ts = this.keyTimestamps.get(key) || 0;
            if (action === 'moveLeft') { leftPressed = true; leftTime = Math.max(leftTime, ts); }
            if (action === 'moveRight') { rightPressed = true; rightTime = Math.max(rightTime, ts); }
        }

        let nextHorizDir: 'moveLeft' | 'moveRight' | null = null;
        if (leftPressed && rightPressed) {
            nextHorizDir = leftTime > rightTime ? 'moveLeft' : 'moveRight';
        } else if (leftPressed) {
            nextHorizDir = 'moveLeft';
        } else if (rightPressed) {
            nextHorizDir = 'moveRight';
        }

        if (nextHorizDir !== this.activeHorizDir) {
            this.activeHorizDir = nextHorizDir;
            this.horizTimeHeld = 0;
            this.lastMoveCount = 0;
            
            if (nextHorizDir) {
                this.emitAction(nextHorizDir);
                this.lastMoveCount = 1;
            }
        } else if (nextHorizDir) {
            this.horizTimeHeld += deltaTime;
            
            if (this.horizTimeHeld >= this.config.das) {
                const timeInDas = this.horizTimeHeld - this.config.das;
                
                if (this.config.arr === 0) {
                    const width = this.config.stageWidth || STAGE_WIDTH;
                    for (let i = 0; i < width; i++) this.emitAction(nextHorizDir);
                } else {
                    const arrMoves = Math.floor(timeInDas / this.config.arr);
                    const totalMovesExpected = 1 + arrMoves;
                    const movesNeeded = totalMovesExpected - this.lastMoveCount;
                    
                    for(let i=0; i<movesNeeded; i++) {
                        this.emitAction(nextHorizDir);
                    }
                    
                    this.lastMoveCount = totalMovesExpected;
                }
            }
        }

        return { x: nextHorizDir === 'moveLeft' ? -1 : (nextHorizDir === 'moveRight' ? 1 : 0) };
    }

    private handleVerticalInput(deltaTime: number): { y: number } {
        let softDropPressed = false;
        for (const key of this.heldKeys) {
            const raw = this.getActionFromKey(key);
            if (raw && this.getEffectiveAction(raw) === 'softDrop') softDropPressed = true;
        }

        if (softDropPressed) {
            if (!this.isSoftDropping) {
                this.isSoftDropping = true;
                this.softDropTimeHeld = 0;
                this.lastDropCount = 0;
                this.emitAction('softDrop'); 
                this.lastDropCount = 1;
            } else {
                this.softDropTimeHeld += deltaTime;
                const dropDas = Math.min(this.config.das, 100); 
                
                if (this.softDropTimeHeld >= dropDas) {
                    const timeInArr = this.softDropTimeHeld - dropDas;
                    const dropArr = this.config.arr === 0 ? 2 : Math.min(this.config.arr, 30);
                    
                    const arrDrops = Math.floor(timeInArr / dropArr);
                    const totalDropsExpected = 1 + arrDrops;
                    const dropsNeeded = totalDropsExpected - this.lastDropCount;
                    
                    for(let i=0; i<dropsNeeded; i++) {
                        this.emitAction('softDrop');
                    }
                    
                    this.lastDropCount = totalDropsExpected;
                }
            }
        } else {
            this.isSoftDropping = false;
            this.softDropTimeHeld = 0;
            this.lastDropCount = 0;
        }

        return { y: softDropPressed ? 1 : 0 };
    }

    public update(deltaTime: number): void {
        if (this.isDestroyed) return;
        this.pollGamepad();

        const hState = this.handleHorizontalInput(deltaTime);
        const vState = this.handleVerticalInput(deltaTime);

        this.syncInputVector(hState.x, vState.y);
    }

    public destroy(): void {
        this.isDestroyed = true;
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.boundKeyDown);
            window.removeEventListener('keyup', this.boundKeyUp);
            window.removeEventListener('blur', this.boundBlur);
        }
    }
}

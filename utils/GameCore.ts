
import { createStage, createPuzzleStage, addGarbageLines, checkCollision, rotateMatrix, generateBag, getWallKicks, isTSpin } from './gameUtils';
import { calculateScore } from './scoreRules';
import { audioManager } from './audioManager';
import { STAGE_WIDTH, STAGE_HEIGHT, SCORES, TETROMINOS, PUZZLE_LEVELS } from '../constants';
import { Player, Board, GameState, TetrominoType, GameStats, GameMode, KeyMap, KeyAction, FloatingText } from '../types';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;

export interface GameCallbacks {
    onStatsChange: (stats: GameStats) => void;
    onQueueChange: (queue: TetrominoType[]) => void;
    onHoldChange: (piece: TetrominoType | null, canHold: boolean) => void;
    onVisualEffect: (type: 'SHAKE' | 'PARTICLE' | 'FLASH', payload?: any) => void;
    onGameOver: (state: GameState) => void;
    onAiTrigger: () => void;
}

export class GameCore {
    stage: Board = createStage();
    player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: { shape: [[0]], color: '0,0,0', type: 'I' },
        collided: false,
    };
    stats: GameStats = { score: 0, rows: 0, level: 0, time: 0 };
    mode: GameMode = 'MARATHON';
    
    // Queue System
    nextQueue: TetrominoType[] = [];
    
    heldPiece: TetrominoType | null = null;
    canHold = true;
    rotationState = 0;
    
    // Lock Logic
    lockTimer: any = null;
    lockStartTime = 0;
    lockDelayDuration = LOCK_DELAY_MS;
    movesOnGround = 0;
    lastMoveWasRotation = false;
    
    // Scoring State
    comboCount = -1;
    isBackToBack = false;
    
    // Interpolation Data
    dropCounter = 0;
    dropTime = 1000;
    speedMultiplier = 1;
    
    // Tuning
    das = 133; 
    arr = 10;

    // Battle / Puzzle
    battleTimer = 0;
    garbagePending = 0;
    puzzleIndex = 0;

    // Visuals
    lockResetFlash = 0;
    tSpinFlash = 0;
    floatingTexts: FloatingText[] = [];
    visualEffectsQueue: { type: 'SHAKE' | 'PARTICLE' | 'FLASH', payload?: any }[] = [];

    // Input
    moveStack: string[] = [];
    keyTimers: Record<string, number> = { left: 0, right: 0, down: 0 };
    keys: Record<string, boolean> = { down: false, left: false, right: false };
    keyMap: KeyMap;

    callbacks: GameCallbacks;

    constructor(callbacks: GameCallbacks, defaultKeyMap: KeyMap) {
        this.callbacks = callbacks;
        this.keyMap = JSON.parse(JSON.stringify(defaultKeyMap));
        this.nextQueue = generateBag();
    }

    setGameConfig(config: { speed?: number, das?: number, arr?: number }) {
        if (config.speed !== undefined) this.speedMultiplier = config.speed;
        if (config.das !== undefined) this.das = config.das;
        if (config.arr !== undefined) this.arr = config.arr;
    }

    // --- GAME STATE MANAGEMENT ---

    spawnPiece() {
        // Check Victory Condition for Puzzle
        if (this.mode === 'PUZZLE' && this.nextQueue.length === 0) {
            if (this.isBoardEmpty()) {
                this.triggerGameOver('VICTORY', 4);
            } else {
                this.triggerGameOver('GAMEOVER');
            }
            return;
        }
        
        if (this.mode !== 'PUZZLE') {
          while (this.nextQueue.length < 7) {
              this.nextQueue = [...this.nextQueue, ...generateBag()];
          }
        }
        
        if (this.nextQueue.length === 0) return;

        const type = this.nextQueue.shift()!;
        this.callbacks.onQueueChange([...this.nextQueue]);

        this.resetPlayerState(type);
        
        if (checkCollision(this.player, this.stage, { x: 0, y: 0 })) {
            if (this.mode === 'ZEN') {
                this.resetZenMode();
            } else {
                this.triggerGameOver('GAMEOVER');
            }
        } else {
            this.callbacks.onAiTrigger();
        }
    }

    private resetPlayerState(type: TetrominoType) {
        this.player = {
            pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
            tetromino: TETROMINOS[type], 
            collided: false
        };
        this.rotationState = 0;
        this.movesOnGround = 0;
        this.lastMoveWasRotation = false;
        this.canHold = this.mode !== 'PUZZLE'; 
        this.callbacks.onHoldChange(this.heldPiece, this.canHold);
        
        this.lockResetFlash = 0;
        this.tSpinFlash = 0;
        this.clearLockTimer();
    }

    resetGame(mode: GameMode = 'MARATHON', startLevel = 0) {
        this.mode = mode;
        this.initializeStage(startLevel);
        this.initializeStats(startLevel);
        this.initializeDropSpeed(startLevel);
        
        this.heldPiece = null;
        this.comboCount = -1;
        this.isBackToBack = false;
        this.floatingTexts = [];
        this.visualEffectsQueue = [];
        this.lockStartTime = 0;
        this.battleTimer = 0;
        this.garbagePending = 0;
        
        this.callbacks.onHoldChange(null, true);
        this.spawnPiece();
        audioManager.init();
    }

    private initializeStage(startLevel: number) {
        if (this.mode === 'PUZZLE') {
            this.puzzleIndex = startLevel;
            this.stage = createPuzzleStage(PUZZLE_LEVELS[startLevel]);
            this.nextQueue = [...PUZZLE_LEVELS[startLevel].bag];
        } else {
            this.stage = createStage();
            this.nextQueue = generateBag();
        }
        this.callbacks.onQueueChange([...this.nextQueue]);
    }

    private initializeStats(startLevel: number) {
        this.stats = { 
            score: 0, 
            rows: 0, 
            level: (this.mode === 'TIME_ATTACK' || this.mode === 'SPRINT' || this.mode === 'PUZZLE') ? 0 : startLevel, 
            time: this.mode === 'TIME_ATTACK' ? 180 : 0 
        };
        this.callbacks.onStatsChange(this.stats);
    }

    private initializeDropSpeed(startLevel: number) {
        if (this.mode === 'ZEN' || this.mode === 'PUZZLE') {
            this.dropTime = 1000000; 
        } else if (this.mode === 'MASTER') {
            this.dropTime = 0; 
        } else {
            // Standard Tetris curve approx
            this.dropTime = Math.max(100, Math.pow(0.8 - ((startLevel - 1) * 0.007), startLevel) * 1000);
        }
    }

    private isBoardEmpty(): boolean {
        return this.stage.every(row => row.every(cell => cell[1] === 'clear'));
    }

    private resetZenMode() {
        this.stage = createStage();
        audioManager.playClear(4);
        this.addFloatingText('ZEN RESET', '#06b6d4');
    }

    private triggerGameOver(state: GameState, soundLevel?: number) {
        this.callbacks.onGameOver(state);
        if (state === 'VICTORY') {
            audioManager.playClear(soundLevel || 4);
        } else {
            audioManager.playGameOver();
        }
    }

    // --- SCORING & MECHANICS ---

    sweepRows(newStage: Board, isTSpin: boolean = false) {
        // 1. Identify full rows
        const fullRowIndices: number[] = [];
        newStage.forEach((row, y) => {
            if (row.every(cell => cell[1] !== 'clear')) {
                fullRowIndices.push(y);
            }
        });

        const rowsCleared = fullRowIndices.length;

        if (rowsCleared === 0) {
             // Handle T-Spin Zero
            if (isTSpin) {
                this.applyScore({ score: SCORES.TSPIN });
                this.addFloatingText('T-SPIN', '#d946ef', 0.7);
            }
            this.comboCount = -1; // Reset combo on no clear
            this.stage = newStage;
            return;
        }

        // 2. Construct new board (Remove full rows, add empty at top)
        const sweepedStage = newStage.filter((_, index) => !fullRowIndices.includes(index));
        while (sweepedStage.length < STAGE_HEIGHT) {
            sweepedStage.unshift(new Array(STAGE_WIDTH).fill([null, 'clear']));
        }
        
        // 3. Update Game State using Score Utils
        this.comboCount += 1;
        const result = calculateScore(rowsCleared, this.stats.level, isTSpin, this.isBackToBack, this.comboCount);
        
        this.isBackToBack = result.isBackToBack;
        this.applyScore(result);
        
        // 4. Visuals
        fullRowIndices.forEach(y => {
             this.callbacks.onVisualEffect('PARTICLE', { isExplosion: true, y, color: 'white' });
        });
        if (result.visualShake) this.callbacks.onVisualEffect('SHAKE', result.visualShake);
        if (result.text) this.addFloatingText(result.text, isTSpin ? '#d946ef' : '#fff', isTSpin ? 0.9 : 0.5);
        
        audioManager.playClear(rowsCleared);

        // 5. Leveling & Mode Specifics
        this.handleLevelProgression(rowsCleared, sweepedStage);

        this.stage = sweepedStage;
        
        // 6. Garbage Interaction
        if (this.garbagePending > 0) {
            this.applyGarbage();
        }
    }

    private applyScore(result: { score: number }) {
        if (this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
            this.stats.score += result.score;
            this.callbacks.onStatsChange(this.stats);
        }
    }

    private handleLevelProgression(rowsCleared: number, currentStage: Board) {
        this.stats.rows += rowsCleared;

        if (this.mode === 'MARATHON') {
            const newLevel = Math.floor(this.stats.rows / 10);
            if (newLevel > this.stats.level) {
                this.stats.level = newLevel;
                this.dropTime = Math.max(100, 1000 * Math.pow(0.95, this.stats.level));
            }
        } else if (this.mode === 'SPRINT') {
            if (this.stats.rows >= 40) {
                this.triggerGameOver('VICTORY', 4);
            }
        } else if (this.mode === 'PUZZLE') {
            const isClear = currentStage.every(row => row.every(c => c[1] === 'clear'));
            if (isClear) {
                this.triggerGameOver('VICTORY', 4);
            }
        }
        this.callbacks.onStatsChange(this.stats);
    }

    private applyGarbage() {
        this.stage = addGarbageLines(this.stage, this.garbagePending);
        this.garbagePending = 0;
        this.callbacks.onVisualEffect('SHAKE', 'soft');
        this.addFloatingText("WARNING!", "#ef4444");
    }

    lockPiece() {
        const { player, stage } = this;
        let tSpinDetected = false;

        // T-Spin detection logic before merging
        if (player.tetromino.type === 'T' && this.lastMoveWasRotation) {
             if (isTSpin(player, stage)) {
                 tSpinDetected = true;
                 this.triggerTSpinVisuals(player);
             }
        }

        // Merge piece to stage
        const newStage = stage.map(row => [...row]);
        player.tetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const ny = y + player.pos.y;
                    const nx = x + player.pos.x;
                    if (ny >= 0 && ny < STAGE_HEIGHT) {
                        newStage[ny][nx] = [player.tetromino.type, 'merged'];
                    }
                }
            });
        });

        this.stage = newStage;
        this.callbacks.onVisualEffect('SHAKE', 'soft');
        audioManager.playLock();
        
        this.sweepRows(this.stage, tSpinDetected);
        this.spawnPiece(); 
    }

    private triggerTSpinVisuals(player: Player) {
         this.tSpinFlash = 1.0;
         this.callbacks.onVisualEffect('FLASH', { color: '#d946ef', duration: 300 });
         this.callbacks.onVisualEffect('PARTICLE', { 
             x: player.pos.x + 1, 
             y: player.pos.y + 1, 
             color: '#d946ef',
             amount: 50,
             isBurst: true
         });
         audioManager.playTSpin();
    }

    // --- INPUT & MOVEMENT ---

    handleInput(action: KeyAction, isPressed: boolean) {
        // Movement Actions (Left/Right)
        if (action === 'moveLeft' || action === 'moveRight') {
            const dir = action === 'moveLeft' ? 'left' : 'right';
            const delta = action === 'moveLeft' ? -1 : 1;

            if (isPressed) {
                if (!this.keys[dir]) {
                    this.keys[dir] = true;
                    this.moveStack.push(dir);
                    this.keyTimers[dir] = 0;
                    this.move(delta); // Initial Move
                }
            } else {
                this.keys[dir] = false;
                this.moveStack = this.moveStack.filter(k => k !== dir);
                this.keyTimers[dir] = 0;
            }
            return;
        }

        if (action === 'softDrop') {
            this.keys.down = isPressed;
            return;
        }

        // Discrete Actions (On Press only)
        if (isPressed) {
             switch (action) {
                case 'rotateCW': this.rotate(1); break;
                case 'rotateCCW': this.rotate(-1); break;
                case 'hold': this.hold(); break;
                case 'hardDrop': this.hardDrop(); break;
            }
        }
    }

    move(dir: number): boolean {
        if (!checkCollision(this.player, this.stage, { x: dir, y: 0 })) {
            this.player.pos.x += dir;
            this.lastMoveWasRotation = false;
            this.updateLockTimerOnMove();
            audioManager.playMove();
            return true;
        }
        return false;
    }

    rotate(dir: number) {
        const rotatedShape = rotateMatrix(this.player.tetromino.shape, dir);
        const clonedPlayer = { ...this.player, tetromino: { ...this.player.tetromino, shape: rotatedShape } };

        const kicks = getWallKicks(this.player.tetromino.type, this.rotationState, dir);
        
        for (const offset of kicks) {
            if (!checkCollision(clonedPlayer, this.stage, { x: offset[0], y: offset[1] })) {
                this.player.tetromino.shape = rotatedShape;
                this.player.pos.x += offset[0];
                this.player.pos.y += offset[1];
                this.rotationState = (this.rotationState + dir + 4) % 4;
                this.lastMoveWasRotation = true;
                
                this.updateLockTimerOnMove();
                audioManager.playRotate();
                this.callbacks.onAiTrigger();
                return;
            }
        }
    }

    softDrop(): boolean {
        if (!checkCollision(this.player, this.stage, { x: 0, y: 1 })) {
            this.player.pos.y += 1;
            this.lastMoveWasRotation = false;
            if(this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
                this.stats.score += SCORES.SOFT_DROP;
                this.callbacks.onStatsChange(this.stats);
            }
            return true;
        }
        return false;
    }

    hardDrop() {
        let dropped = 0;
        while (!checkCollision(this.player, this.stage, { x: 0, y: 1 })) {
            this.player.pos.y += 1;
            dropped++;
        }
        
        if(this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
            this.stats.score += dropped * SCORES.HARD_DROP;
            this.callbacks.onStatsChange(this.stats);
        }
        
        if (dropped > 0) {
            this.lastMoveWasRotation = false;
        }

        this.callbacks.onVisualEffect('PARTICLE', { 
            x: this.player.pos.x, 
            y: this.player.pos.y, 
            color: this.player.tetromino.color,
            isExplosion: false 
        });
        
        audioManager.playHardDrop();
        this.lockPiece();
    }

    hold() {
        if (!this.canHold) return;

        const currentType = this.player.tetromino.type;
        if (this.heldPiece) {
            this.player.tetromino = TETROMINOS[this.heldPiece];
            this.heldPiece = currentType;
        } else {
            this.heldPiece = currentType;
            this.spawnPiece(); 
        }
        
        // If piece didn't change (e.g. spawn logic weirdness), don't reset
        if (this.player.tetromino.type !== currentType || !this.heldPiece) { 
             this.player.pos = { x: STAGE_WIDTH / 2 - 2, y: 0 };
             this.rotationState = 0;
             this.clearLockTimer();
        }
        
        this.canHold = false;
        this.callbacks.onHoldChange(this.heldPiece, false);
        audioManager.playUiSelect();
        this.callbacks.onAiTrigger();
    }

    // --- TIMERS & LOOPS ---

    private updateLockTimerOnMove() {
        if (this.lockTimer) {
            this.movesOnGround++;
            if(this.movesOnGround < MAX_MOVES_BEFORE_LOCK) {
                this.clearLockTimer();
                this.lockResetFlash = 0.5;
            }
        }
    }

    private clearLockTimer() {
        if (this.lockTimer) clearTimeout(this.lockTimer);
        this.lockTimer = null;
        this.lockStartTime = 0;
    }

    addFloatingText(text: string, color: string = '#fff', scale: number = 0.5) {
        this.floatingTexts.push({
            id: Date.now() + Math.random(),
            text,
            x: this.player.pos.x + 1,
            y: this.player.pos.y,
            life: 1.0,
            color,
            scale
        });
    }

    update(deltaTime: number) {
        this.updateModeLogic(deltaTime);
        this.updateGravity(deltaTime);
        this.updateInputRepeat(deltaTime);
        this.processVisualsQueue();
    }

    private updateModeLogic(deltaTime: number) {
        if (this.mode === 'TIME_ATTACK') {
            this.stats.time -= deltaTime / 1000;
            if (this.stats.time <= 0) {
                this.stats.time = 0;
                this.triggerGameOver('GAMEOVER');
            }
        } else if (this.mode === 'SPRINT') {
            this.stats.time += deltaTime / 1000;
        } else if (this.mode === 'BATTLE') {
            this.battleTimer += deltaTime;
            const interval = Math.max(2000, 8000 - (this.stats.rows * 100)); 
            if (this.battleTimer > interval) {
                const garbageAmount = 1 + Math.floor(Math.random() * 2); 
                this.garbagePending += garbageAmount;
                this.battleTimer = 0;
            }
        }
    }

    private updateGravity(deltaTime: number) {
        const effectiveGravity = ((this.mode === 'ZEN' || this.mode === 'PUZZLE') && !this.keys.down) ? Infinity : this.dropTime;
        this.dropCounter += deltaTime * this.speedMultiplier;
        
        if (this.dropCounter > effectiveGravity) {
            if (!checkCollision(this.player, this.stage, { x: 0, y: 1 })) {
                this.player.pos.y += 1;
                this.lastMoveWasRotation = false;
            } else {
                if (!this.lockTimer) {
                    this.lockTimer = setTimeout(() => {
                        if (checkCollision(this.player, this.stage, { x: 0, y: 1 })) {
                            this.lockPiece();
                        }
                    }, LOCK_DELAY_MS);
                    this.lockStartTime = Date.now();
                }
            }
            this.dropCounter = 0;
        }
    }

    private updateInputRepeat(deltaTime: number) {
        const activeKey = this.moveStack[this.moveStack.length - 1];
        if (activeKey && (activeKey === 'left' || activeKey === 'right')) {
            if (this.keyTimers[activeKey] === undefined) {
                 this.keyTimers[activeKey] = 0; 
            }
            this.keyTimers[activeKey] += deltaTime;
            
            if (this.keyTimers[activeKey] > this.das) {
                 const arrSpeed = this.arr;
                 if (arrSpeed === 0) {
                     while(this.move(activeKey === 'left' ? -1 : 1)) {}
                 } else if ((this.keyTimers[activeKey] - this.das) % arrSpeed < deltaTime) {
                     this.move(activeKey === 'left' ? -1 : 1);
                 }
            }
        }
        
        if (this.keys.down) {
            this.softDrop();
        }
    }

    private processVisualsQueue() {
        while (this.visualEffectsQueue.length > 0) {
            const effect = this.visualEffectsQueue.shift();
            if (effect) this.callbacks.onVisualEffect(effect.type, effect.payload);
        }
    }
}

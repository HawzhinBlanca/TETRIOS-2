
import { GameCore } from './GameCore';
import { Player, TetrominoType, TetrominoShape, MoveScore } from '../types';
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT, DEFAULT_GAMESPEED, BLITZ_INITIAL_DROPTIME, KICKS, COLORS } from '../constants';
import { generateBag, checkCollision, rotateMatrix, getWallKicks, isTSpin } from './gameUtils';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;

export class PieceManager {
    private core: GameCore;
    
    public player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOS[0],
        collided: false,
    };
    public nextQueue: TetrominoType[] = [];
    public heldPiece: TetrominoType | null = null;
    public canHold: boolean = true;
    public rotationState: number = 0;
    public lockTimer: ReturnType<typeof setTimeout> | null = null;
    public lockStartTime: number = 0;
    public lockDelayDuration: number = LOCK_DELAY_MS;
    public movesOnGround: number = 0;
    public lastMoveWasRotation: boolean = false;
    public dropCounter: number = 0;
    public dropTime: number = 1000;
    public pieceIsGrounded: boolean = false;
    
    public wildcardNextPieceType: TetrominoType | null = null;

    constructor(core: GameCore) {
        this.core = core;
        this.nextQueue = generateBag();
    }

    public reset(startLevel: number, adventureLevelConfig?: any): void {
        this.nextQueue = generateBag();
        if (this.core.mode === 'PUZZLE' && this.core.boardManager.stage) {
             // Puzzle mode logic if needed
        }
        
        this._initDropSpeed(startLevel, adventureLevelConfig);
        this.heldPiece = null;
        this.canHold = true;
        this.wildcardNextPieceType = null;
        this.core.callbacks.onQueueChange([...this.nextQueue]);
        this.core.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this.core.callbacks.onGroundedChange(false);
        
        this.spawnPiece();
    }

    private _initDropSpeed(startLevel: number, adventureLevelConfig?: any): void {
        if (this.core.mode === 'ZEN' || this.core.mode === 'PUZZLE') this.dropTime = 1000000;
        else if (this.core.mode === 'MASTER') this.dropTime = 0;
        else if (this.core.mode === 'ADVENTURE') {
             const lvl = adventureLevelConfig ? adventureLevelConfig.index : 0;
             this.dropTime = Math.max(100, Math.pow(0.95, lvl) * 1000);
        }
        else if (this.core.mode === 'BLITZ') {
            this.dropTime = BLITZ_INITIAL_DROPTIME;
        }
        else this.dropTime = Math.max(100, Math.pow(0.8 - ((startLevel - 1) * 0.007), startLevel) * 1000);
    }

    public spawnPiece(): void {
        if (this.wildcardNextPieceType) {
            const type = this.wildcardNextPieceType;
            this.wildcardNextPieceType = null;
            this.core.callbacks.onWildcardAvailableChange(false);
            this._resetPlayerState(type);
            this.core.callbacks.onAiTrigger();
            return;
        }

        if (this.core.mode === 'PUZZLE' && this.nextQueue.length === 0) {
            if (this.core.boardManager.isBoardEmpty()) this.core.triggerGameOver('VICTORY', { coins: 1500, stars: 3 });
            else this.core.triggerGameOver('GAMEOVER');
            return;
        }
        
        if (this.core.mode !== 'PUZZLE') {
          while (this.nextQueue.length < 7) this.nextQueue = [...this.nextQueue, ...generateBag()];
        }
        
        if (this.nextQueue.length === 0) return;
        
        const type: TetrominoType = this.nextQueue.shift()!;
        this.core.callbacks.onQueueChange([...this.nextQueue]);
        this._resetPlayerState(type);
        
        if (checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: 0 }, this.core.flippedGravity)) {
            if (this.core.mode === 'ZEN') this.core.boardManager.resetZenMode();
            else this.core.triggerGameOver('GAMEOVER');
        } else {
            this.core.callbacks.onAiTrigger();
        }
    }

    private _resetPlayerState(type: TetrominoType): void {
        const shapeHeight = TETROMINOS[type].shape.length;
        this.player = {
            pos: { 
                x: STAGE_WIDTH / 2 - 2, 
                y: this.core.flippedGravity ? STAGE_HEIGHT - shapeHeight : 0 
            },
            tetromino: TETROMINOS[type], 
            collided: false
        };
        this.rotationState = 0;
        this.movesOnGround = 0;
        this.lastMoveWasRotation = false;
        this.canHold = this.core.mode !== 'PUZZLE' || this.core.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.core.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this._clearLockTimer();
        this._setPieceGrounded(false);
    }

    public update(deltaTime: number): void {
        this.dropCounter += deltaTime;
        let currentDropTime = this.dropTime;
        
        if (this.core.scoreManager.frenzyActive) {
            currentDropTime /= this.core.scoreManager.frenzyMultiplier;
        }
        if (this.core.boosterManager.slowTimeActive) {
            currentDropTime *= 2; 
        }

        if (this.dropCounter > currentDropTime) {
            const moveY = this.core.flippedGravity ? -1 : 1;
            if (!checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: moveY }, this.core.flippedGravity)) {
                this.player.pos.y += moveY;
            } else {
                if (!this.pieceIsGrounded) {
                    this._setPieceGrounded(true);
                }
            }
            this.dropCounter = 0;
        }
    }

    public move(dir: number): boolean {
        if (!checkCollision(this.player, this.core.boardManager.stage, { x: dir, y: 0 }, this.core.flippedGravity)) {
            this.player.pos.x += dir;
            this.lastMoveWasRotation = false;
            this._updateLockTimerOnMove();
            this.core.callbacks.onAudio('MOVE');
            return true;
        }
        return false;
    }

    public rotate(dir: number): void {
        const rotatedShape = rotateMatrix(this.player.tetromino.shape, dir);
        const clonedPlayer = { ...this.player, tetromino: { ...this.player.tetromino, shape: rotatedShape } };
        const kicks = getWallKicks(this.player.tetromino.type, this.rotationState, dir);
        
        for (const offset of kicks) {
            if (!checkCollision(clonedPlayer, this.core.boardManager.stage, { x: offset[0], y: offset[1] }, this.core.flippedGravity)) {
                this.player.tetromino.shape = rotatedShape;
                this.player.pos.x += offset[0];
                this.player.pos.y += offset[1];
                this.rotationState = (this.rotationState + dir + 4) % 4;
                this.lastMoveWasRotation = true;
                this._updateLockTimerOnMove();
                this.core.callbacks.onAudio('ROTATE');
                this.core.callbacks.onAiTrigger();
                this._setPieceGrounded(false);
                return;
            }
        }
    }

    public softDrop(): boolean {
        const moveY = this.core.flippedGravity ? -1 : 1;
        if (!checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: moveY }, this.core.flippedGravity)) {
            this.player.pos.y += moveY;
            this.lastMoveWasRotation = false;
            this.core.scoreManager.applySoftDrop();
            return true;
        }
        return false;
    }

    public hardDrop(): void {
        let dropped: number = 0;
        const moveY = this.core.flippedGravity ? -1 : 1;
        while (!checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: moveY }, this.core.flippedGravity)) {
            this.player.pos.y += moveY;
            dropped++;
        }
        this.core.scoreManager.applyHardDrop(dropped);
        if (dropped > 0) this.lastMoveWasRotation = false;
        this.core.callbacks.onVisualEffect({type: 'PARTICLE', payload: { x: this.player.pos.x, y: this.player.pos.y, color: this.player.tetromino.color, isExplosion: false, amount: 20 }});
        this.core.callbacks.onAudio('HARD_DROP');
        this.lockPiece();
    }

    public hold(): void {
        if (!this.canHold) return;
        const currentType: TetrominoType = this.player.tetromino.type;
        const currentShapeHeight = TETROMINOS[currentType].shape.length;
        if (this.heldPiece) {
            this.player.tetromino = TETROMINOS[this.heldPiece];
            this.heldPiece = currentType;
        } else {
            this.heldPiece = currentType;
            this.spawnPiece();
        }
        if (this.player.tetromino.type !== currentType || !this.heldPiece) { 
             this.player.pos = { 
                x: STAGE_WIDTH / 2 - 2, 
                y: this.core.flippedGravity ? STAGE_HEIGHT - currentShapeHeight : 0 
            }; 
             this.rotationState = 0;
             this._clearLockTimer();
        }
        this.canHold = this.core.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.core.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this.core.callbacks.onAudio('UI_SELECT');
        this.core.callbacks.onAiTrigger();
        this._setPieceGrounded(false);
    }

    public chooseWildcardPiece(type: TetrominoType): void {
        if (!this.core.boosterManager.wildcardAvailable) return;
        this.wildcardNextPieceType = type;
        this.core.boosterManager.wildcardAvailable = false; 
        this.core.callbacks.onWildcardAvailableChange(false);
        this.spawnPiece();
    }

    private lockPiece(): void {
        let tSpinDetected = false;
        if (this.player.tetromino.type === 'T' && this.lastMoveWasRotation) {
             if (isTSpin(this.player, this.core.boardManager.stage, this.rotationState)) {
                 tSpinDetected = true;
                 this._triggerTSpinVisuals();
             }
        }

        // Perform the merge
        const stage = this.core.boardManager.stage;
        const newStage = stage.map(row => [...row]);
        
        this.player.tetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const ny = y + this.player.pos.y;
                    const nx = x + this.player.pos.x;
                    if (ny >= 0 && ny < STAGE_HEIGHT) {
                        const cell = newStage[ny][nx];
                        // Ice interaction
                        if (cell[2]?.type === 'ICE' || cell[2]?.type === 'CRACKED_ICE') {
                            cell[2].hits = (cell[2].hits || 0) - 1;
                            if (cell[2].hits <= 0) {
                                newStage[ny][nx] = [this.player.tetromino.type, 'merged'];
                            } else {
                                cell[2].type = 'CRACKED_ICE';
                                cell[1] = 'merged';
                            }
                        } else {
                            newStage[ny][nx] = [this.player.tetromino.type, 'merged'];
                        }
                    }
                }
            });
        });

        // Tick bombs
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            for (let x = 0; x < STAGE_WIDTH; x++) {
                if (newStage[y][x][2]?.type === 'BOMB') {
                    newStage[y][x][2]!.timer = (newStage[y][x][2]!.timer || 0) - 1;
                }
            }
        }

        this.core.boardManager.stage = newStage; // Commit stage
        this.core.boardManager.revision++; // Mark board as dirty
        this.core.callbacks.onVisualEffect({type: 'SHAKE', payload: 'soft'});
        this.core.callbacks.onAudio('LOCK');
        
        this.core.boardManager.sweepRows(newStage, tSpinDetected);
        
        this.spawnPiece();
        this._setPieceGrounded(false);
        this.core.scoreManager.stats.movesTaken = (this.core.scoreManager.stats.movesTaken || 0) + 1;
        this.core.callbacks.onStatsChange(this.core.scoreManager.stats);
        this.core.adventureManager.checkObjectives();
    }

    private _triggerTSpinVisuals(): void {
         this.core.fxManager.triggerTSpinFlash(); // Use FXManager
         this.core.callbacks.onVisualEffect({type: 'FLASH', payload: { color: '#d946ef', duration: 300 }});
         this.core.callbacks.onVisualEffect({type: 'PARTICLE', payload: { x: this.player.pos.x + 1, y: this.player.pos.y + 1, color: '#d946ef', amount: 50, isBurst: true }});
         this.core.callbacks.onAudio('TSPIN');
    }

    private _clearLockTimer(): void {
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
        this.lockStartTime = 0;
        this.movesOnGround = 0;
    }

    private _setPieceGrounded(grounded: boolean): void {
        if (this.pieceIsGrounded !== grounded) {
            this.pieceIsGrounded = grounded;
            this.core.callbacks.onGroundedChange(grounded);
            if (grounded) {
                this.core.callbacks.onAudio('SOFT_LAND');
                this._startLockTimer();
            } else {
                this._clearLockTimer();
            }
        }
    }

    private _startLockTimer(): void {
        if (this.lockTimer) return; 
        this.lockStartTime = Date.now();
        this.lockTimer = setTimeout(() => {
            this.lockPiece();
        }, this.lockDelayDuration);
    }

    private _updateLockTimerOnMove(): void {
        if (this.pieceIsGrounded) {
            this.movesOnGround++;
            if (this.movesOnGround < MAX_MOVES_BEFORE_LOCK) {
                this._clearLockTimer();
                this._startLockTimer();
                this.core.fxManager.triggerLockResetFlash(); 
            }
        }
        this.core.callbacks.onAiTrigger();
    }
}

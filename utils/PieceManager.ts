
import type { GameCore } from './GameCore';
import { Player, TetrominoType, AdventureLevelConfig } from '../types';
import { TETROMINOS, CHAOS_COLORS, EXTENDED_SHAPES } from '../constants';
import { generateBag, rotateMatrix } from './gameUtils';
import { audioManager } from './audioManager';
import { useProfileStore } from '../stores/profileStore';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;

export class PieceManager {
    private core: GameCore;
    
    public player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOS[0],
        collided: false,
        trail: [],
        ghostY: 0 
    };
    
    private _dummyGhostPlayer: Player = {
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOS[0], 
        collided: false,
        trail: []
    };

    private _collisionOffset = { x: 0, y: 0 }; // Reusable object for collision checks to reduce GC

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
    public spawnTime: number = 0; 
    public wildcardNextPieceType: TetrominoType | null = null;
    
    private customPiecePool: TetrominoType[] | undefined;
    private isColorChaos: boolean = false;

    private currentPieceRotations: number = 0;
    private lastRotationDir: number = 0;

    private _lastGhostState: { x: number, rotation: number, boardRevision: number, gravity: boolean } | null = null;

    constructor(core: GameCore) {
        this.core = core;
        this.nextQueue = generateBag();
    }

    get isLocking(): boolean {
        return this.pieceIsGrounded;
    }

    private getTetrominoCopy(type: TetrominoType) {
        const original = TETROMINOS[type];
        return {
            ...original,
            shape: original.shape.map(row => [...row])
        };
    }

    public reset(startLevel: number, adventureLevelConfig?: AdventureLevelConfig): void {
        this.isColorChaos = adventureLevelConfig?.rules?.includes('COLOR_CHAOS') || false;
        
        if (adventureLevelConfig?.piecePool) {
            this.customPiecePool = adventureLevelConfig.piecePool;
        } else {
            const profileDeck = useProfileStore.getState().stats.enabledShapes;
            this.customPiecePool = profileDeck.length > 0 ? profileDeck : undefined;
        }

        this.nextQueue = generateBag(this.customPiecePool);
        
        this.heldPiece = null;
        this.canHold = this.core.mode !== 'PUZZLE' && (!adventureLevelConfig?.rules?.includes('NO_HOLD'));
        this.wildcardNextPieceType = null;
        this.core.events.emit('QUEUE_CHANGE', [...this.nextQueue]);
        this.core.events.emit('HOLD_CHANGE', { piece: this.heldPiece, canHold: this.canHold });
        this.core.events.emit('GROUNDED_CHANGE', false);
        
        this.spawnPiece();
    }

    public injectRewardPiece(type: TetrominoType): void {
        this.nextQueue.unshift(type);
        this.core.events.emit('QUEUE_CHANGE', [...this.nextQueue]);
        
        this.core.events.emit('VISUAL_EFFECT', { 
            type: 'PARTICLE', 
            payload: { 
                isBurst: true, 
                x: Math.floor(this.core.grid.width / 2) + 2, 
                y: 2, 
                color: TETROMINOS[type].color, 
                amount: 30 
            } 
        });
        this.core.events.emit('AUDIO', { event: 'WILDCARD_SPAWN' });
        this.core.addFloatingText('REWARD!', '#fbbf24', 0.7, 'powerup');
    }

    private _calculateGhostY(): void {
        const { x } = this.player.pos;
        const { rotationState } = this;
        const { stage, revision } = this.core.boardManager;
        const flipped = this.core.flippedGravity;

        // Cache check
        if (this._lastGhostState && 
            this._lastGhostState.x === x && 
            this._lastGhostState.rotation === rotationState && 
            this._lastGhostState.boardRevision === revision &&
            this._lastGhostState.gravity === flipped &&
            this.player.ghostY !== undefined
        ) {
            return;
        }

        this._dummyGhostPlayer.pos.x = x;
        this._dummyGhostPlayer.pos.y = this.player.pos.y;
        this._dummyGhostPlayer.tetromino = this.player.tetromino;

        const moveY = flipped ? -1 : 1;
        
        // Optimization: Use reused offset object to prevent garbage collection
        this._collisionOffset.x = 0;
        this._collisionOffset.y = moveY;

        while (!this.core.collisionManager.checkCollision(this._dummyGhostPlayer, stage, this._collisionOffset, flipped)) {
            this._dummyGhostPlayer.pos.y += moveY;
        }
        
        this.player.ghostY = this._dummyGhostPlayer.pos.y;

        this._lastGhostState = {
            x,
            rotation: rotationState,
            boardRevision: revision,
            gravity: flipped
        };
    }

    public spawnPiece(): void {
        if (this.wildcardNextPieceType) {
            const type = this.wildcardNextPieceType;
            this.wildcardNextPieceType = null;
            this.core.events.emit('WILDCARD_AVAILABLE_CHANGE', false);
            this._resetPlayerState(type);
            this.core.events.emit('AI_TRIGGER');
            return;
        }

        if (this.core.mode === 'PUZZLE' && this.nextQueue.length === 0) {
            if (this.core.boardManager.isBoardEmpty()) this.core.triggerGameOver('VICTORY', { coins: 1500, stars: 3 });
            else this.core.triggerGameOver('GAMEOVER');
            return;
        }
        
        if (this.core.mode !== 'PUZZLE') {
          while (this.nextQueue.length < 7) this.nextQueue = [...this.nextQueue, ...generateBag(this.customPiecePool)];
        }

        if (this.core.mode !== 'PUZZLE') {
             const topY = this.core.boardManager.getHighestBlockY();
             let isInDanger = false;
             
             if (!this.core.flippedGravity) {
                 if (topY < 10 && topY !== this.core.grid.height) isInDanger = true;
             } else {
                 if (topY > (this.core.grid.height - 10) && topY !== -1) isInDanger = true;
             }

             if (isInDanger && Math.random() < 0.08 && !this.core.scoreManager.stats.isZoneActive) {
                 const r = Math.random();
                 const type: TetrominoType = r < 0.5 ? 'M1' : (r < 0.8 ? 'D2' : 'T3');
                 
                 this.nextQueue.unshift(type);
                 this.core.events.emit('QUEUE_CHANGE', [...this.nextQueue]);
                 this.core.addFloatingText("RESCUE DROP!", "#4ade80", 0.8, 'powerup');
                 this.core.events.emit('AUDIO', { event: 'WILDCARD_SPAWN' });
             }
        }
        
        if (this.nextQueue.length === 0) return;
        
        const type: TetrominoType = this.nextQueue.shift()!;
        this.core.events.emit('QUEUE_CHANGE', [...this.nextQueue]);
        this._resetPlayerState(type);
        
        if (EXTENDED_SHAPES.includes(type)) {
             this.core.addFloatingText("SPECIAL UNIT", TETROMINOS[type].color, 0.8, 'powerup');
             this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: TETROMINOS[type].color, duration: 300 } });
             this.core.events.emit('VISUAL_EFFECT', { 
                 type: 'PARTICLE', 
                 payload: { isBurst: true, x: this.player.pos.x + 1, y: this.player.pos.y, color: TETROMINOS[type].color, amount: 40 } 
             });
        }
        
        if (this.core.collisionManager.checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: 0 }, this.core.flippedGravity)) {
            if (this.core.mode === 'ZEN') this.core.boardManager.resetZenMode();
            else this.core.triggerGameOver('GAMEOVER');
        } else {
            this.core.events.emit('AI_TRIGGER');
        }
    }

    private _resetPlayerState(type: TetrominoType): void {
        const tetromino = this.getTetrominoCopy(type);
        
        if (this.isColorChaos) {
            tetromino.color = CHAOS_COLORS[Math.floor(Math.random() * CHAOS_COLORS.length)];
        }

        const shapeHeight = tetromino.shape.length;
        this.player = {
            pos: { 
                x: Math.floor(this.core.grid.width / 2 - shapeHeight / 2), 
                y: this.core.flippedGravity ? this.core.grid.height - shapeHeight : 0 
            },
            tetromino: tetromino, 
            collided: false,
            trail: [],
            colorOverride: this.isColorChaos ? tetromino.color : undefined,
            ghostY: 0
        };
        this.rotationState = 0;
        this.movesOnGround = 0;
        this.lastMoveWasRotation = false;
        this.spawnTime = Date.now();
        this.currentPieceRotations = 0;
        this.lastRotationDir = 0;
        
        this._lastGhostState = null; 
        this._calculateGhostY();
        this._clearLockTimer();
        this._setPieceGrounded(false);
    }

    private _updateTrail(): void {
        this.player.trail.push({ ...this.player.pos });
        if (this.player.trail.length > 4) {
            this.player.trail.shift();
        }
    }

    public update(deltaTime: number): void {
        this._calculateGhostY();

        if (this.core.boosterManager.timeFreezeActive) {
            return;
        }

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
            if (!this.core.collisionManager.checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: moveY }, this.core.flippedGravity)) {
                this.player.pos.y += moveY;
                this._updateTrail();
            } else {
                if (!this.pieceIsGrounded) {
                    this._setPieceGrounded(true);
                }
            }
            this.dropCounter = 0;
        }
    }

    public move(dir: number): boolean {
        if (!this.core.collisionManager.checkCollision(this.player, this.core.boardManager.stage, { x: dir, y: 0 }, this.core.flippedGravity)) {
            this.player.pos.x += dir;
            this._updateTrail();
            this._calculateGhostY();
            this.lastMoveWasRotation = false;
            this._updateLockTimerOnMove();
            this.core.events.emit('AUDIO', { event: 'MOVE', val: this.player.pos.x });
            return true;
        }
        return false;
    }

    public rotate(dir: number): void {
        const rotatedShape = rotateMatrix(this.player.tetromino.shape, dir);
        const clonedPlayer = { ...this.player, tetromino: { ...this.player.tetromino, shape: rotatedShape } };
        const kicks = this.core.collisionManager.getWallKicks(this.player.tetromino.type, this.rotationState, dir);
        
        for (const offset of kicks) {
            const kickY = this.core.flippedGravity ? -offset[1] : offset[1];

            if (!this.core.collisionManager.checkCollision(clonedPlayer, this.core.boardManager.stage, { x: offset[0], y: kickY }, this.core.flippedGravity)) {
                this.player.tetromino.shape = rotatedShape;
                this.player.pos.x += offset[0];
                this.player.pos.y += kickY;
                this.rotationState = (this.rotationState + dir + 4) % 4;
                this.lastMoveWasRotation = true;
                this._calculateGhostY();
                this._updateLockTimerOnMove();
                this.core.events.emit('AUDIO', { event: 'ROTATE', val: this.player.pos.x });
                this.core.events.emit('AI_TRIGGER');
                this._setPieceGrounded(false);
                
                if (this.lastRotationDir === dir) {
                    this.currentPieceRotations++;
                } else {
                    this.currentPieceRotations = 1;
                }
                this.lastRotationDir = dir;

                if (this.currentPieceRotations >= 3) {
                    this.core.addFloatingText('FINESSE FAULT', '#ff0000', 0.7, 'fault');
                    this.core.events.emit('AUDIO', { event: 'FINESSE_FAULT' });
                    this.core.scoreManager.stats.finesseFaults = (this.core.scoreManager.stats.finesseFaults || 0) + 1;
                }

                return;
            }
        }
    }

    public softDrop(): boolean {
        const moveY = this.core.flippedGravity ? -1 : 1;
        if (!this.core.collisionManager.checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: moveY }, this.core.flippedGravity)) {
            this.player.pos.y += moveY;
            this._updateTrail();
            this.lastMoveWasRotation = false;
            this.core.scoreManager.applySoftDrop();
            return true;
        }
        return false;
    }

    public hardDrop(): void {
        // Optimization: Use the cached ghost position instead of recalculating the drop iteratively.
        this._calculateGhostY(); // Ensure ghost position is up-to-date
        
        if (this.player.ghostY === undefined) return; // Should not happen given _calculateGhostY logic

        const startY = this.player.pos.y;
        const dropped = Math.abs(this.player.ghostY - startY);
        
        // Instant teleport
        this.player.pos.y = this.player.ghostY;
        this._updateTrail(); // Update trail to reflect new position
        
        this.core.events.emit('VISUAL_EFFECT', {
            type: 'HARD_DROP_BEAM',
            payload: {
                x: this.player.pos.x,
                startY: startY,
                endY: this.player.pos.y,
                color: this.player.tetromino.color
            }
        });

        const isOnBeat = audioManager.isOnBeat();
        if (isOnBeat) {
            this.core.addFloatingText("PERFECT!", "#fbbf24", 0.8, 'powerup');
            this.core.events.emit('VISUAL_EFFECT', {
                type: 'PARTICLE', 
                payload: { isExplosion: true, x: this.player.pos.x * 30, y: this.player.pos.y * 30, color: 'gold', amount: 40 }
            });
            this.core.scoreManager.applyScore(200); 
            audioManager.playPerfectDrop(0);
        }

        this.core.scoreManager.applyHardDrop(dropped);
        if (dropped > 0) this.lastMoveWasRotation = false;
        
        const particleAmount = isOnBeat ? 40 : 20;
        const particleColor = isOnBeat ? 'gold' : this.player.tetromino.color;
        
        this.core.events.emit('VISUAL_EFFECT', {
            type: 'PARTICLE', 
            payload: { x: this.player.pos.x, y: this.player.pos.y, color: particleColor, isExplosion: false, amount: particleAmount }
        });
        
        if (!isOnBeat) {
            this.core.events.emit('AUDIO', { event: 'HARD_DROP', val: this.player.pos.x });
        }
        
        this.lockPiece();
    }

    public hold(): void {
        if (!this.canHold) return;
        const currentType = this.player.tetromino.type;
        
        if (this.heldPiece) {
            const typeToSpawn = this.heldPiece;
            this.heldPiece = currentType;
            this._resetPlayerState(typeToSpawn);
            
            if (this.core.collisionManager.checkCollision(this.player, this.core.boardManager.stage, { x: 0, y: 0 }, this.core.flippedGravity)) {
                 if (this.core.mode === 'ZEN') this.core.boardManager.resetZenMode();
                 else this.core.triggerGameOver('GAMEOVER');
            } else {
                 this.core.events.emit('AI_TRIGGER');
            }
        } else {
            this.heldPiece = currentType;
            this.spawnPiece(); 
        }
        
        this.canHold = this.core.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.core.events.emit('HOLD_CHANGE', { piece: this.heldPiece, canHold: this.canHold });
        this.core.events.emit('AUDIO', { event: 'UI_SELECT' });
    }

    public chooseWildcardPiece(type: TetrominoType): void {
        if (!this.core.boosterManager.wildcardAvailable) return;
        this.wildcardNextPieceType = type;
        this.core.boosterManager.wildcardAvailable = false; 
        this.core.events.emit('WILDCARD_AVAILABLE_CHANGE', false);
        this.canHold = this.core.mode !== 'PUZZLE';
        this.core.events.emit('HOLD_CHANGE', { piece: this.heldPiece, canHold: this.canHold });
        this.spawnPiece();
    }

    private lockPiece(): void {
        let tSpinDetected = false;
        if (this.player.tetromino.type === 'T' && this.lastMoveWasRotation) {
             if (this.core.collisionManager.isTSpin(this.player, this.core.boardManager.stage, this.rotationState, this.core.flippedGravity)) {
                 tSpinDetected = true;
                 this._triggerTSpinVisuals();
             }
        }

        const p5Types: TetrominoType[] = ['P5', 'P5_P', 'P5_X', 'P5_F'];
        if (p5Types.includes(this.player.tetromino.type)) {
             if (this.core.boardManager.garbagePending > 0) {
                 this.core.boardManager.addGarbage(-5);
                 this.core.addFloatingText("GARBAGE CRUSH!", "#f59e0b", 0.8, 'powerup');
                 this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'hard' });
                 this.core.events.emit('VISUAL_EFFECT', { 
                     type: 'PARTICLE', 
                     payload: { isBurst: true, x: this.player.pos.x, y: this.player.pos.y, color: '#f59e0b', amount: 30 } 
                 });
                 this.core.events.emit('AUDIO', { event: 'HARD_DROP' }); 
             }
        }

        const stage = this.core.boardManager.stage;
        const newStage = stage.map(row => [...row]);
        
        this.player.tetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const ny = y + this.player.pos.y;
                    const nx = x + this.player.pos.x;
                    if (ny >= 0 && ny < this.core.grid.height) {
                        const currentCell = newStage[ny][nx];
                        const existingModifier = currentCell[2];
                        const finalColor = this.player.colorOverride;
                        newStage[ny][nx] = [
                            this.player.tetromino.type, 
                            'merged',
                            existingModifier,
                            finalColor
                        ];
                    }
                }
            });
        });

        for (let y = 0; y < this.core.grid.height; y++) {
            for (let x = 0; x < this.core.grid.width; x++) {
                const cell = newStage[y][x];
                if (cell[2]?.type === 'BOMB') {
                    cell[2].timer = (cell[2].timer || 0) - 1;
                }
            }
        }

        this.core.boardManager.stage = newStage; 
        this.core.boardManager.revision++; 
        this.core.events.emit('VISUAL_EFFECT', {type: 'SHAKE', payload: 'soft'});
        this.core.events.emit('AUDIO', { event: 'LOCK', val: this.player.pos.x, type: this.player.tetromino.type }); 
        
        this.core.boardManager.sweepRows(newStage, tSpinDetected);
        
        this.spawnPiece();
        this._setPieceGrounded(false);
        this.core.scoreManager.stats.movesTaken = (this.core.scoreManager.stats.movesTaken || 0) + 1;
        this.core.events.emit('STATS_CHANGE', this.core.scoreManager.stats);
        this.core.adventureManager.checkObjectives();
        
        const noHold = this.core.adventureManager.config?.rules?.includes('NO_HOLD');
        this.canHold = (!noHold && this.core.mode !== 'PUZZLE') || this.core.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.core.events.emit('HOLD_CHANGE', { piece: this.heldPiece, canHold: this.canHold });
    }

    private _triggerTSpinVisuals(): void {
         this.core.fxManager.triggerTSpinFlash(); 
         this.core.events.emit('VISUAL_EFFECT', {type: 'FLASH', payload: { color: '#d946ef', duration: 300 }});
         this.core.events.emit('VISUAL_EFFECT', {
             type: 'PARTICLE', 
             payload: { x: this.player.pos.x + 1, y: this.player.pos.y + 1, color: '#d946ef', amount: 60, isBurst: true }
         });
         this.core.events.emit('VISUAL_EFFECT', {type: 'SHAKE', payload: 'soft'});
         this.core.events.emit('AUDIO', { event: 'TSPIN' });
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
            this.core.events.emit('GROUNDED_CHANGE', grounded);
            if (grounded) {
                this.core.events.emit('AUDIO', { event: 'SOFT_LAND', val: this.player.pos.x }); 
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
        this.core.events.emit('AI_TRIGGER');
    }
}

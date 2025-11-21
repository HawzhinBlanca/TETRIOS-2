
import { createStage, createPuzzleStage, addGarbageLines, checkCollision, rotateMatrix, generateBag, getWallKicks, isTSpin, generateAdventureStage } from './gameUtils';
import { calculateScore, ScoreResult } from './scoreRules';
import { STAGE_WIDTH, STAGE_HEIGHT, SCORES, TETROMINOS, PUZZLE_LEVELS, DEFAULT_DAS, DEFAULT_ARR, DEFAULT_GAMESPEED, FRENZY_DURATION_MS, FRENZY_COMBO_THRESHOLD, MODIFIER_COLORS, LEVEL_PASS_COIN_REWARD, BLITZ_DURATION_MS, BLITZ_INITIAL_DROPTIME, BLITZ_SPEED_THRESHOLDS, BLITZ_POWERUP_SPAWN_CHANCE_MULTIPLIER } from '../constants';
import { Player, Board, GameState, TetrominoType, GameStats, GameMode, KeyMap, KeyAction, FloatingText, TetrominoShape, AdventureLevelConfig, CellModifier, FloatingTextVariant, GameCallbacks, BoosterType, CellModifierType, LevelRewards } from '../types';
import { AdventureManager } from './AdventureManager';
import { BoosterManager } from './BoosterManager';

const LOCK_DELAY_MS = 500;
const MAX_MOVES_BEFORE_LOCK = 15;

export class GameCore {
    stage: Board = createStage();
    player: Player = {
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOS[0],
        collided: false,
    };
    stats: GameStats = { 
        score: 0, rows: 0, level: 0, time: 0,
        movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
        isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
        wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
        flippedGravityActive: false, flippedGravityTimer: 0,
    };
    mode: GameMode = 'MARATHON';
    nextQueue: TetrominoType[] = [];
    heldPiece: TetrominoType | null = null;
    canHold = true;
    rotationState = 0;
    lockTimer: ReturnType<typeof setTimeout> | null = null;
    lockStartTime = 0;
    lockDelayDuration = LOCK_DELAY_MS;
    movesOnGround = 0;
    lastMoveWasRotation = false;
    comboCount = -1;
    isBackToBack = false;
    dropCounter = 0;
    dropTime = 1000;
    speedMultiplier = DEFAULT_GAMESPEED;
    das: number = DEFAULT_DAS;
    arr: number = DEFAULT_ARR;
    battleTimer = 0;
    garbagePending = 0;
    puzzleIndex = 0;
    lockResetFlash = 0;
    tSpinFlash = 0;
    floatingTexts: FloatingText[] = [];
    keyMap: KeyMap;
    callbacks: GameCallbacks;
    pieceIsGrounded: boolean = false; 
    
    // Managers
    adventureManager: AdventureManager;
    boosterManager: BoosterManager;

    flippedGravity: boolean = false;
    initialFlippedGravityGimmick: boolean = false;

    wildcardNextPieceType: TetrominoType | null = null;

    // Frenzy Mode
    frenzyActive: boolean = false;
    frenzyTimer: number = 0;
    frenzyMultiplier: number = 1;

    // BLITZ Mode
    blitzSpeedThresholdIndex: number = 0;
    blitzLastSpeedUpScore: number = 0;

    constructor(callbacks: GameCallbacks, defaultKeyMap: KeyMap) {
        this.callbacks = callbacks;
        this.keyMap = JSON.parse(JSON.stringify(defaultKeyMap));
        this.nextQueue = generateBag();
        this.adventureManager = new AdventureManager(this);
        this.boosterManager = new BoosterManager(this);
    }

    setGameConfig(config: { speed?: number, das?: number, arr?: number }): void {
        if (config.speed !== undefined) this.speedMultiplier = config.speed;
        if (config.das !== undefined) this.das = config.das;
        if (config.arr !== undefined) this.das = config.arr;
    }

    spawnPiece(): void {
        if (this.wildcardNextPieceType) {
            const type = this.wildcardNextPieceType;
            this.wildcardNextPieceType = null;
            this.callbacks.onWildcardAvailableChange(false);
            this._resetPlayerState(type);
            this.callbacks.onAiTrigger();
            return;
        }

        if (this.mode === 'PUZZLE' && this.nextQueue.length === 0) {
            if (this.isBoardEmpty()) this.triggerGameOver('VICTORY', { coins: SCORES.POWERUP_NUKE_BONUS, stars: 3 });
            else this.triggerGameOver('GAMEOVER');
            return;
        }
        if (this.mode !== 'PUZZLE') {
          while (this.nextQueue.length < 7) this.nextQueue = [...this.nextQueue, ...generateBag()];
        }
        if (this.nextQueue.length === 0) return;
        const type: TetrominoType = this.nextQueue.shift()!;
        this.callbacks.onQueueChange([...this.nextQueue]);
        this._resetPlayerState(type);
        if (checkCollision(this.player, this.stage, { x: 0, y: 0 }, this.flippedGravity)) {
            if (this.mode === 'ZEN') this._resetZenMode();
            else this.triggerGameOver('GAMEOVER');
        } else {
            this.callbacks.onAiTrigger();
        }
    }

    private _resetPlayerState(type: TetrominoType): void {
        const shapeHeight = TETROMINOS[type].shape.length;
        this.player = {
            pos: { 
                x: STAGE_WIDTH / 2 - 2, 
                y: this.flippedGravity ? STAGE_HEIGHT - shapeHeight : 0 
            },
            tetromino: TETROMINOS[type], 
            collided: false
        };
        this.rotationState = 0;
        this.movesOnGround = 0;
        this.lastMoveWasRotation = false;
        this.canHold = this.mode !== 'PUZZLE' || this.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this._clearLockTimer();
        this._setPieceGrounded(false);
    }

    resetGame(mode: GameMode = 'MARATHON', startLevel: number = 0, adventureLevelConfig: AdventureLevelConfig | undefined, assistRows: number = 0, activeBoosters: BoosterType[] = []): void {
        this.mode = mode;
        
        this.initialFlippedGravityGimmick = adventureLevelConfig?.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY') || false;
        this.flippedGravity = this.initialFlippedGravityGimmick;

        this._initGameStage(startLevel, assistRows, adventureLevelConfig);
        this._initGameStats(startLevel);
        this._initDropSpeed(startLevel, adventureLevelConfig);
        
        // Initialize Managers
        this.adventureManager.reset(adventureLevelConfig);
        this.boosterManager.reset(activeBoosters);
        
        this._initFrenzyState();
        this._initBlitzState();
        this._clearEphemeralStates();
        
        this.spawnPiece();
        this.callbacks.onFlippedGravityChange(this.flippedGravity);
    }

    private _initGameStage(startLevel: number, assistRows: number, adventureLevelConfig?: AdventureLevelConfig): void {
        if (this.mode === 'PUZZLE') {
            this.puzzleIndex = startLevel;
            this.stage = createPuzzleStage(PUZZLE_LEVELS[startLevel]);
            this.nextQueue = [...PUZZLE_LEVELS[startLevel].bag];
        } else if (this.mode === 'ADVENTURE' && adventureLevelConfig) {
            this.stage = generateAdventureStage(adventureLevelConfig, assistRows);
            this.nextQueue = generateBag();
        } else {
            this.stage = createStage();
            this.nextQueue = generateBag();
        }
        this.callbacks.onQueueChange([...this.nextQueue]);
    }

    private _initGameStats(startLevel: number): void {
        this.stats = { 
            score: 0, rows: 0, 
            level: (this.mode === 'TIME_ATTACK' || this.mode === 'SPRINT' || this.mode === 'PUZZLE' || this.mode === 'ADVENTURE' || this.mode === 'BLITZ') ? 0 : startLevel, 
            time: (this.mode === 'TIME_ATTACK') ? 180 : (this.mode === 'BLITZ' ? BLITZ_DURATION_MS / 1000 : 0),
            movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
            isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
            wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
            flippedGravityActive: false, flippedGravityTimer: 0,
        };
        this.callbacks.onStatsChange(this.stats);
    }

    private _initDropSpeed(startLevel: number, adventureLevelConfig?: AdventureLevelConfig): void {
        if (this.mode === 'ZEN' || this.mode === 'PUZZLE') this.dropTime = 1000000;
        else if (this.mode === 'MASTER') this.dropTime = 0;
        else if (this.mode === 'ADVENTURE') {
             const lvl = adventureLevelConfig ? adventureLevelConfig.index : 0;
             this.dropTime = Math.max(100, Math.pow(0.95, lvl) * 1000);
        }
        else if (this.mode === 'BLITZ') {
            this.dropTime = BLITZ_INITIAL_DROPTIME;
        }
        else this.dropTime = Math.max(100, Math.pow(0.8 - ((startLevel - 1) * 0.007), startLevel) * 1000);
    }

    private _initFrenzyState(): void {
        this.frenzyActive = false;
        this.frenzyTimer = 0;
        this.frenzyMultiplier = 1;
        this.stats.isFrenzyActive = false;
        this.stats.frenzyTimer = 0;
    }

    private _initBlitzState(): void {
        this.blitzSpeedThresholdIndex = 0;
        this.blitzLastSpeedUpScore = 0;
    }

    private _clearEphemeralStates(): void {
        this.heldPiece = null;
        this.comboCount = -1;
        this.isBackToBack = false;
        this.callbacks.onComboChange(this.comboCount, this.isBackToBack);
        this.garbagePending = 0;
        this.callbacks.onGarbageChange(0);
        this.floatingTexts = [];
        this.lockStartTime = 0;
        this.battleTimer = 0;
        this.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this._setPieceGrounded(false);
        this.wildcardNextPieceType = null;
        this.boosterManager.isSelectingBombRows = false;
        this.callbacks.onBombSelectionEnd();
        this.boosterManager.isSelectingLine = false;
        this.boosterManager.selectedLineToClear = null;
        this.callbacks.onLineSelectionEnd();
    }

    private isBoardEmpty(): boolean {
        return this.stage.every(row => row.every(cell => cell[1] === 'clear' && !cell[2]));
    }

    private _resetZenMode(): void {
        this.stage = createStage();
        this.callbacks.onAudio('CLEAR_4');
        this.addFloatingText('ZEN RESET', '#06b6d4');
    }

    public triggerGameOver(state: GameState, rewards?: LevelRewards): void {
        this.callbacks.onGameOver(state, this.adventureManager.config?.id, rewards);
        if (state === 'VICTORY') this.callbacks.onAudio('CLEAR_4');
        else this.callbacks.onAudio('GAME_OVER');
    }

    sweepRows(newStage: Board, isTSpinDetected: boolean = false, manualClearedRows?: number[]): void {
        let fullRowIndices: number[] = [];
        if (manualClearedRows) {
            fullRowIndices = manualClearedRows;
        } else {
            newStage.forEach((row, y) => { if (row.every(cell => cell[1] !== 'clear')) fullRowIndices.push(y); });
        }
        
        const rowsCleared: number = fullRowIndices.length;

        this._processClearedRowModifiers(newStage, fullRowIndices);

        if (rowsCleared === 0 && !isTSpinDetected) {
            this.comboCount = -1;
            this.stage = newStage;
            this.callbacks.onComboChange(this.comboCount, this.isBackToBack);
            this.adventureManager.checkObjectives();
            return;
        }
        
        const sweepedStage: Board = newStage.filter((_, index) => !fullRowIndices.includes(index));
        while (sweepedStage.length < STAGE_HEIGHT) {
            const emptyRow = new Array(STAGE_WIDTH).fill([null, 'clear']);
            if (this.flippedGravity) {
                sweepedStage.push(emptyRow);
            } else {
                sweepedStage.unshift(emptyRow);
            }
        }
        
        const result: ScoreResult = this._calculateClearOutcome(rowsCleared, isTSpinDetected);
        
        this._handlePostClearVisualsAndAudio(result, fullRowIndices, rowsCleared);
        this._updateStageAndAudio(sweepedStage);
        this._applyGarbagePostClear();
        this.adventureManager.checkObjectives();

        if (this.comboCount >= FRENZY_COMBO_THRESHOLD) {
            this._activateFrenzy();
        }
        this._checkPowerupSpawn(rowsCleared, isTSpinDetected);
    }

    private _processClearedRowModifiers(stage: Board, fullRowIndices: number[]): void {
        fullRowIndices.forEach(y => {
            stage[y].forEach((cell, x) => {
                if (cell[2]?.type === 'GEM') {
                    this.stats.gemsCollected = (this.stats.gemsCollected || 0) + 1;
                    this.applyScore({ score: SCORES.GEM_COLLECT_BONUS });
                    this.addFloatingText('GEM!', MODIFIER_COLORS.GEM, 0.5, 'gem');
                } else if (cell[2]?.type === 'BOMB') {
                    this.stats.bombsDefused = (this.stats.bombsDefused || 0) + 1;
                    this.applyScore({ score: SCORES.BOMB_DEFUZE_BONUS });
                    this.addFloatingText('BOMB DEFUZED!', '#4ade80', 0.5, 'bomb');
                } else if (cell[2]?.type === 'WILDCARD_BLOCK') {
                    this.boosterManager.wildcardAvailable = true;
                    this.callbacks.onWildcardAvailableChange(true);
                    this.addFloatingText('WILDCARD READY!', MODIFIER_COLORS.WILDCARD_BLOCK, 0.7, 'powerup');
                    this.callbacks.onVisualEffect({type: 'POWERUP_ACTIVATE', payload: { type: 'WILDCARD_BLOCK', x, y, color: MODIFIER_COLORS.WILDCARD_BLOCK}});
                } else if (cell[2]?.type === 'LASER_BLOCK') {
                    this.clearBottomLine();
                    this.addFloatingText('LASER CLEAR!', MODIFIER_COLORS.LASER_BLOCK, 0.7, 'powerup');
                    this.callbacks.onVisualEffect({type: 'POWERUP_ACTIVATE', payload: { type: 'LASER_BLOCK', x, y, color: MODIFIER_COLORS.LASER_BLOCK}});
                } else if (cell[2]?.type === 'NUKE_BLOCK') {
                    this.nukeBoard();
                    this.addFloatingText('NUKE!', MODIFIER_COLORS.NUKE_BLOCK, 1.0, 'powerup');
                    this.applyScore({ score: SCORES.POWERUP_NUKE_BLOCK_BONUS });
                    this.callbacks.onVisualEffect({type: 'POWERUP_ACTIVATE', payload: { type: 'NUKE_BLOCK', x, y, color: MODIFIER_COLORS.NUKE_BLOCK}});
                }
            });
        });
    }

    private _checkPowerupSpawn(rowsCleared: number, isTSpin: boolean): void {
        let spawnChance = 0.3;
        if (this.mode === 'BLITZ') {
            spawnChance *= BLITZ_POWERUP_SPAWN_CHANCE_MULTIPLIER;
        }

        if ((rowsCleared === 4 || (isTSpin && rowsCleared >= 2)) && Math.random() < spawnChance) {
            this.addFloatingText('POWERUP SPAWN!', '#fff', 0.6, 'powerup');
            const powerupTypes: CellModifierType[] = ['WILDCARD_BLOCK', 'LASER_BLOCK'];
            if (this.mode === 'BLITZ') {
                powerupTypes.push('NUKE_BLOCK');
            }
            const randomPowerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            const modifier: CellModifier = { type: randomPowerupType };
            if (randomPowerupType === 'BOMB') modifier.timer = 10; 
            if (randomPowerupType === 'ICE') modifier.hits = 2;

            if (this.fillRandomClearCellExcludingPlayer(modifier)) {
                if (randomPowerupType === 'WILDCARD_BLOCK') {
                    this.boosterManager.wildcardAvailable = true;
                    this.callbacks.onWildcardAvailableChange(true);
                }
            }
        }
    }

    private fillRandomClearCellExcludingPlayer(modifier: CellModifier, attempts: number = 100): boolean {
        for (let i = 0; i < attempts; i++) {
            const y = Math.floor(Math.random() * STAGE_HEIGHT);
            const x = Math.floor(Math.random() * STAGE_WIDTH);

            let isPlayerCell = false;
            this.player.tetromino.shape.forEach((row, r) => {
                row.forEach((cellType, c) => {
                    if (cellType !== 0 && (this.player.pos.y + r === y) && (this.player.pos.x + c === x)) {
                        isPlayerCell = true;
                    }
                });
            });

            if (this.stage[y][x][1] === 'clear' && !this.stage[y][x][2] && !isPlayerCell) {
                this.stage[y][x][2] = modifier;
                return true;
            }
        }
        return false;
    }

    private _calculateClearOutcome(rowsCleared: number, isTSpinDetected: boolean): ScoreResult {
        this.comboCount += 1;
        this.stats.combosAchieved = Math.max(this.stats.combosAchieved || 0, this.comboCount + 1);
        return calculateScore(rowsCleared, this.stats.level, isTSpinDetected, this.isBackToBack, this.comboCount);
    }

    private _handlePostClearVisualsAndAudio(result: ScoreResult, fullRowIndices: number[], rowsCleared: number): void {
        this.isBackToBack = result.isBackToBack;
        if (rowsCleared === 4) this.stats.tetrisesAchieved = (this.stats.tetrisesAchieved || 0) + 1;
        this.callbacks.onComboChange(this.comboCount, this.isBackToBack);
        this.applyScore(result);
        
        fullRowIndices.forEach(y => this.callbacks.onVisualEffect({type: 'PARTICLE', payload: { isExplosion: true, y, color: 'white' }}));
        if (result.visualShake) this.callbacks.onVisualEffect({type: 'SHAKE', payload: result.visualShake});
        if (result.text) this.addFloatingText(result.text, '#fff', 0.5);
        
        // Emit audio event based on lines cleared
        if (rowsCleared === 1) this.callbacks.onAudio('CLEAR_1');
        else if (rowsCleared === 2) this.callbacks.onAudio('CLEAR_2');
        else if (rowsCleared === 3) this.callbacks.onAudio('CLEAR_3');
        else if (rowsCleared >= 4) this.callbacks.onAudio('CLEAR_4');

        this._handleLevelProgression(rowsCleared);
    }

    private _updateStageAndAudio(sweepedStage: Board): void {
        this.stage = sweepedStage;
        // No direct audio manager call here. Filtering is a side effect that can stay in UI or be removed if not critical.
        // Keeping it clean for now.
    }

    private _applyGarbagePostClear(): void {
        if (this.garbagePending > 0) this.applyGarbage();
    }

    private _activateFrenzy(): void {
        if (!this.frenzyActive) {
            this.frenzyActive = true;
            this.frenzyMultiplier = SCORES.FRENZY_MULTIPLIER;
            this.callbacks.onVisualEffect({ type: 'FRENZY_START' });
            this.addFloatingText('FRENZY!', '#ffd700', 0.9, 'frenzy');
        }
        this.frenzyTimer = Math.max(this.frenzyTimer, FRENZY_DURATION_MS);
        this.stats.isFrenzyActive = true;
        this.stats.frenzyTimer = this.frenzyTimer;
        this.callbacks.onStatsChange(this.stats);
    }

    private _deactivateFrenzy(): void {
        if (this.frenzyActive) {
            this.frenzyActive = false;
            this.frenzyMultiplier = 1;
            this.callbacks.onVisualEffect({ type: 'FRENZY_END' });
            this.addFloatingText('FRENZY END', '#888888', 0.6, 'frenzy');
            this.stats.isFrenzyActive = false;
            this.stats.frenzyTimer = 0;
            this.callbacks.onStatsChange(this.stats);
        }
    }

    public applyScore(result: { score: number }): void {
        if (this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
            this.stats.score += result.score * this.frenzyMultiplier;
        }
        this.adventureManager.applyBossDamage(result.score);

        if (this.mode === 'BLITZ') {
            this._checkBlitzSpeedUp();
        }

        this.callbacks.onStatsChange(this.stats);
    }

    private _checkBlitzSpeedUp(): void {
        const currentScore = this.stats.score;
        if (this.blitzSpeedThresholdIndex < BLITZ_SPEED_THRESHOLDS.length) {
            const nextThreshold = BLITZ_SPEED_THRESHOLDS[this.blitzSpeedThresholdIndex];
            if (currentScore >= nextThreshold.score && currentScore > this.blitzLastSpeedUpScore) {
                this.dropTime *= nextThreshold.speedFactor;
                this.addFloatingText(nextThreshold.message, '#ffa500', 0.9, 'frenzy');
                this.callbacks.onBlitzSpeedUp?.(this.blitzSpeedThresholdIndex);
                this.callbacks.onAudio('BLITZ_SPEEDUP');
                this.blitzLastSpeedUpScore = currentScore;
                this.blitzSpeedThresholdIndex++;
            }
        }
    }

    private _handleLevelProgression(rowsCleared: number): void {
        this.stats.rows += rowsCleared;
        
        if (this.mode === 'MARATHON') {
            const newLevel: number = Math.floor(this.stats.rows / 10);
            if (newLevel > this.stats.level) {
                this.stats.level = newLevel;
                this.dropTime = Math.max(100, 1000 * Math.pow(0.95, this.stats.level));
            }
        } else if (this.mode === 'SPRINT') {
            if (this.stats.rows >= 40) this.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
        } else if (this.mode === 'PUZZLE') {
            if (this.isBoardEmpty()) this.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
        }
        this.callbacks.onStatsChange(this.stats);
    }

    private applyGarbage(): void {
        this.stage = addGarbageLines(this.stage, this.garbagePending, false, this.flippedGravity);
        this.garbagePending = 0;
        this.callbacks.onGarbageChange(this.garbagePending);
        this.callbacks.onVisualEffect({type: 'SHAKE', payload: 'soft'});
        this.addFloatingText("WARNING!", "#ef4444");
    }

    lockPiece(): void {
        const { player, stage } = this;
        let tSpinDetected: boolean = false;
        if (player.tetromino.type === 'T' && this.lastMoveWasRotation) {
             if (isTSpin(player, stage, this.rotationState)) {
                 tSpinDetected = true;
                 this._triggerTSpinVisuals(player);
             }
        }

        const newStage: Board = stage.map(row => [...row]);
        player.tetromino.shape.forEach((row: (TetrominoType | 0)[], y: number) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const ny: number = y + player.pos.y;
                    const nx: number = x + player.pos.x;
                    if (ny >= 0 && ny < STAGE_HEIGHT) {
                        if (newStage[ny][nx][2]?.type === 'ICE' || newStage[ny][nx][2]?.type === 'CRACKED_ICE') {
                            newStage[ny][nx][2]!.hits = (newStage[ny][nx][2]!.hits || 0) - 1;
                            if (newStage[ny][nx][2]!.hits! <= 0) {
                                newStage[ny][nx] = [player.tetromino.type, 'merged'];
                            } else {
                                newStage[ny][nx][2]!.type = 'CRACKED_ICE';
                                newStage[ny][nx][1] = 'merged';
                            }
                        }
                        else {
                            newStage[ny][nx] = [player.tetromino.type, 'merged'];
                        }
                    }
                }
            });
        });

        for (let y = 0; y < STAGE_HEIGHT; y++) {
            for (let x = 0; x < STAGE_WIDTH; x++) {
                if (newStage[y][x][2]?.type === 'BOMB') {
                    newStage[y][x][2]!.timer = (newStage[y][x][2]!.timer || 0) - 1;
                }
            }
        }

        this.stage = newStage;
        this.callbacks.onVisualEffect({type: 'SHAKE', payload: 'soft'});
        this.callbacks.onAudio('LOCK');
        this.sweepRows(this.stage, tSpinDetected);
        this.spawnPiece(); 
        this._setPieceGrounded(false);
        this.stats.movesTaken = (this.stats.movesTaken || 0) + 1;
        this.callbacks.onStatsChange(this.stats);
        this.adventureManager.checkObjectives();
    }

    private _triggerTSpinVisuals(player: Player): void {
         this.tSpinFlash = 1.0;
         this.callbacks.onVisualEffect({type: 'FLASH', payload: { color: '#d946ef', duration: 300 }});
         this.callbacks.onVisualEffect({type: 'PARTICLE', payload: { x: player.pos.x + 1, y: player.pos.y + 1, color: '#d946ef', amount: 50, isBurst: true }});
         this.callbacks.onAudio('TSPIN');
    }

    handleAction(action: KeyAction): void {
        if (this.boosterManager.isSelectingBombRows || this.boosterManager.isSelectingLine) return;

        switch (action) {
            case 'moveLeft': this.move(-1); break;
            case 'moveRight': this.move(1); break;
            case 'softDrop': this.softDrop(); break;
            case 'hardDrop': this.hardDrop(); break;
            case 'rotateCW': this.rotate(1); break;
            case 'rotateCCW': this.rotate(-1); break;
            case 'hold': this.hold(); break;
        }
    }

    move(dir: number): boolean {
        if (!checkCollision(this.player, this.stage, { x: dir, y: 0 }, this.flippedGravity)) {
            this.player.pos.x += dir;
            this.lastMoveWasRotation = false;
            this._updateLockTimerOnMove();
            this.callbacks.onAudio('MOVE');
            return true;
        }
        return false;
    }

    rotate(dir: number): void {
        const rotatedShape: TetrominoShape = rotateMatrix(this.player.tetromino.shape, dir);
        const clonedPlayer: Player = { ...this.player, tetromino: { ...this.player.tetromino, shape: rotatedShape } };
        const kicks = getWallKicks(this.player.tetromino.type, this.rotationState, dir);
        for (const offset of kicks) {
            if (!checkCollision(clonedPlayer, this.stage, { x: offset[0], y: offset[1] }, this.flippedGravity)) {
                this.player.tetromino.shape = rotatedShape;
                this.player.pos.x += offset[0];
                this.player.pos.y += offset[1];
                this.rotationState = (this.rotationState + dir + 4) % 4;
                this.lastMoveWasRotation = true;
                this._updateLockTimerOnMove();
                this.callbacks.onAudio('ROTATE');
                this.callbacks.onAiTrigger();
                this._setPieceGrounded(false);
                return;
            }
        }
    }

    softDrop(): boolean {
        const moveY = this.flippedGravity ? -1 : 1;
        if (!checkCollision(this.player, this.stage, { x: 0, y: moveY }, this.flippedGravity)) {
            this.player.pos.y += moveY;
            this.lastMoveWasRotation = false;
            if(this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
                this.stats.score += SCORES.SOFT_DROP;
                this.callbacks.onStatsChange(this.stats);
            }
            return true;
        }
        return false;
    }

    hardDrop(): void {
        let dropped: number = 0;
        const moveY = this.flippedGravity ? -1 : 1;
        while (!checkCollision(this.player, this.stage, { x: 0, y: moveY }, this.flippedGravity)) {
            this.player.pos.y += moveY;
            dropped++;
        }
        if(this.mode !== 'ZEN' && this.mode !== 'PUZZLE') {
            this.stats.score += dropped * SCORES.HARD_DROP;
            this.callbacks.onStatsChange(this.stats);
        }
        if (dropped > 0) this.lastMoveWasRotation = false;
        this.callbacks.onVisualEffect({type: 'PARTICLE', payload: { x: this.player.pos.x, y: this.player.pos.y, color: this.player.tetromino.color, isExplosion: false, amount: 20 }});
        this.callbacks.onAudio('HARD_DROP');
        this.lockPiece();
    }

    hold(): void {
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
                y: this.flippedGravity ? STAGE_HEIGHT - currentShapeHeight : 0 
            }; 
             this.rotationState = 0;
             this._clearLockTimer();
        }
        this.canHold = this.boosterManager.activeBoosters.includes('PIECE_SWAP_BOOSTER');
        this.callbacks.onHoldChange(this.heldPiece, this.canHold);
        this.callbacks.onAudio('UI_SELECT');
        this.callbacks.onAiTrigger();
        this._setPieceGrounded(false);
    }

    activateLineClearerSelection(): void { this.boosterManager.activateLineClearerSelection(); }
    executeLineClearer(selectedRow: number): void { this.boosterManager.executeLineClearer(selectedRow); }
    activateBombBoosterSelection(): void { this.boosterManager.activateBombBoosterSelection(); }
    executeBombBooster(startRow: number, numRows: number): void { this.boosterManager.executeBombBooster(startRow, numRows); }
    
    chooseWildcardPiece(type: TetrominoType): void {
        if (!this.boosterManager.wildcardAvailable) return;
        this.wildcardNextPieceType = type;
        this.boosterManager.wildcardAvailable = false; 
        this.callbacks.onWildcardAvailableChange(false);
        this.spawnPiece();
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
            this.callbacks.onGroundedChange(grounded);
            if (grounded) {
                this.callbacks.onAudio('SOFT_LAND');
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
                this.lockResetFlash = 1.0; 
            }
        }
        this.callbacks.onAiTrigger();
    }

    addFloatingText(text: string, color: string, scale: number = 0.5, variant: FloatingTextVariant = 'default'): void {
        const id = Date.now() + Math.random();
        this.floatingTexts.push({
            id, text, x: this.player.pos.x, y: this.player.pos.y, 
            life: 1.0, color, scale, initialScale: scale, variant,
        });
    }

    clearBottomLine(): void {
        const bottomRowIndex = this.flippedGravity ? 0 : STAGE_HEIGHT - 1;
        const tempStage = this.stage.map(row => [...row]);
        if (tempStage[bottomRowIndex]) {
            tempStage[bottomRowIndex].fill([null, 'clear']);
            this.sweepRows(tempStage, false, [bottomRowIndex]);
        }
    }

    nukeBoard(): void {
        const rowsToClear: number[] = [];
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            rowsToClear.push(y);
        }
        const tempStage = createStage(); 
        this.sweepRows(tempStage, false, rowsToClear);
        this.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
        this.callbacks.onVisualEffect({ type: 'FLASH', payload: { color: MODIFIER_COLORS.NUKE_BLOCK, duration: 500 } });
        this.callbacks.onAudio('NUKE_CLEAR');
    }

    update(deltaTime: number): void {
        this.adventureManager.update(deltaTime);
        
        if (this.mode === 'TIME_ATTACK' || this.mode === 'SPRINT') {
            this.stats.time += (deltaTime / 1000);
        } else if (this.mode === 'BLITZ') {
            this.stats.time = Math.max(0, this.stats.time - (deltaTime / 1000));
            if (this.stats.time <= 0) {
                this.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 }); 
            }
        }
        this.callbacks.onStatsChange(this.stats);
        this.adventureManager.checkObjectives();

        this.boosterManager.update(deltaTime);

        if (this.frenzyActive) {
            this.frenzyTimer -= deltaTime;
            if (this.frenzyTimer <= 0) {
                this._deactivateFrenzy();
            } else {
                this.stats.frenzyTimer = this.frenzyTimer;
                this.callbacks.onStatsChange(this.stats);
            }
        }

        // Update piece drop
        this.dropCounter += deltaTime;
        let currentDropTime = this.dropTime;
        if (this.boosterManager.slowTimeActive) {
            currentDropTime *= 2; 
        }

        if (this.dropCounter > currentDropTime) {
            const moveY = this.flippedGravity ? -1 : 1;
            if (!checkCollision(this.player, this.stage, { x: 0, y: moveY }, this.flippedGravity)) {
                this.player.pos.y += moveY;
            } else {
                if (!this.pieceIsGrounded) {
                    this._setPieceGrounded(true);
                }
            }
            this.dropCounter = 0;
        }
        this.updateEphemeralStates(deltaTime);
    }

    updateEphemeralStates(deltaTime: number): void {
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.life -= deltaTime / 1000; 
            ft.y += (this.flippedGravity ? 0.05 : -0.05) * (deltaTime / 1000); 
            return ft.life > 0;
        });
    }
}

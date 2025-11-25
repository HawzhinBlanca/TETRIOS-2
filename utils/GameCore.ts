
import { DEFAULT_GAMESPEED, BLITZ_INITIAL_DROPTIME, SURVIVAL_INITIAL_GARBAGE_INTERVAL, SURVIVAL_MIN_GARBAGE_INTERVAL, SURVIVAL_GARBAGE_DECREMENT, STAGE_HEIGHT } from '../constants';
import { GameState, TetrominoType, GameMode, KeyAction, FloatingTextVariant, BoosterType, LevelRewards, AdventureLevelConfig, KeyMap, Board, MoveScore, GameSnapshot, GameCallbacks, Difficulty } from '../types';
import { AdventureManager } from './AdventureManager';
import { BoosterManager } from './BoosterManager';
import { ScoreManager } from './ScoreManager';
import { BoardManager } from './BoardManager';
import { PieceManager } from './PieceManager';
import { FXManager } from './FXManager';
import { GameStateManager } from './GameStateManager';
import { InputManager } from './InputManager';
import { CollisionManager } from './CollisionManager';
import { AbilityManager } from './AbilityManager';
import { engineStore } from '../stores/engineStore';
import { audioManager } from './audioManager';
import { setRngSeed } from './gameUtils';
import { replayManager } from './ReplayManager';
import { useProfileStore } from '../stores/profileStore';

export interface GameCoreConfig {
    keyMap: KeyMap;
    das: number;
    arr: number;
}

export interface GameManagers {
    stateManager?: GameStateManager;
    adventureManager?: AdventureManager;
    boosterManager?: BoosterManager;
    scoreManager?: ScoreManager;
    boardManager?: BoardManager;
    pieceManager?: PieceManager;
    fxManager?: FXManager;
    inputManager?: InputManager;
    collisionManager?: CollisionManager;
    abilityManager?: AbilityManager;
}

export class GameCore {
    mode: GameMode = 'MARATHON';
    
    stateManager: GameStateManager;
    adventureManager: AdventureManager;
    boosterManager: BoosterManager;
    scoreManager: ScoreManager;
    boardManager: BoardManager;
    pieceManager: PieceManager;
    fxManager: FXManager;
    inputManager: InputManager;
    collisionManager: CollisionManager;
    abilityManager: AbilityManager;

    flippedGravity: boolean = false;
    initialFlippedGravityGimmick: boolean = false;
    speedMultiplier = DEFAULT_GAMESPEED;
    
    survivalTimer: number = 0;
    currentGarbageInterval: number = 0;
    
    public gameStartTime: number = 0;
    public totalPausedDuration: number = 0;
    private pauseStartTime: number = 0;
    
    private _gameLoopPaused: boolean = false;
    private accumulator: number = 0;
    private readonly TIME_STEP: number = 1000 / 60; 
    private frameCount: number = 0; 

    private historyBuffer: GameSnapshot[] = [];
    private readonly MAX_HISTORY = 300; 
    private isRewinding: boolean = false;

    public missedOpportunity: MoveScore | null = null;

    public get aiHint(): MoveScore | null {
        return engineStore.getState().aiHint;
    }

    private _lastSyncedState = {
        score: -1,
        rows: -1,
        level: -1,
        time: -1,
        comboCount: -1,
        garbagePending: -1,
        pieceIsGrounded: false,
        flippedGravity: false,
        dangerLevel: -1,
        wildcardPieceActive: false,
        isSelectingBombRows: false,
        isSelectingLine: false,
        focusGauge: -1,
        isZoneActive: false,
        missedOpportunity: null as MoveScore | null,
        isRewinding: false,
    };

    public events = {
        onVisualEffect: (effect: any) => {},
        onGameOver: (state: GameState, id?: string, rewards?: LevelRewards) => {},
        onAudio: (event: any, val?: number, type?: TetrominoType) => {},
        onAchievementUnlocked: (id: string) => {},
        onFastScoreUpdate: (score: number, time: number) => {} // NEW: React-less HUD
    };

    constructor(config: GameCoreConfig, managers?: GameManagers) {
        this.inputManager = managers?.inputManager || new InputManager({
            keyMap: config.keyMap,
            das: config.das,
            arr: config.arr,
            flippedGravity: false
        });
        
        this.inputManager.addActionListener((action) => {
            // Only record/process inputs if NOT replaying
            if (!replayManager.isReplaying) {
                replayManager.recordInput(action);
                this.handleAction(action);
            }
        });

        this.collisionManager = managers?.collisionManager || new CollisionManager();
        this.stateManager = managers?.stateManager || new GameStateManager(this);
        this.fxManager = managers?.fxManager || new FXManager(this);
        this.scoreManager = managers?.scoreManager || new ScoreManager(this);
        this.boardManager = managers?.boardManager || new BoardManager(this);
        this.pieceManager = managers?.pieceManager || new PieceManager(this);
        this.adventureManager = managers?.adventureManager || new AdventureManager(this);
        this.boosterManager = managers?.boosterManager || new BoosterManager(this);
        this.abilityManager = managers?.abilityManager || new AbilityManager(this);
    }

    destroy(): void {
        this.inputManager.destroy();
    }

    public syncState() {
        const currentStats = this.scoreManager.stats;
        const dangerLevel = this._calculateStressLevel();
        
        // Trigger direct DOM update for smooth numbers
        this.events.onFastScoreUpdate(currentStats.score, currentStats.time);

        if (
            currentStats.score !== this._lastSyncedState.score ||
            currentStats.rows !== this._lastSyncedState.rows ||
            currentStats.level !== this._lastSyncedState.level ||
            Math.abs(currentStats.time - this._lastSyncedState.time) > 0.1 || 
            this.scoreManager.comboCount !== this._lastSyncedState.comboCount ||
            this.boardManager.garbagePending !== this._lastSyncedState.garbagePending ||
            this.pieceManager.pieceIsGrounded !== this._lastSyncedState.pieceIsGrounded ||
            this.flippedGravity !== this._lastSyncedState.flippedGravity ||
            Math.abs(dangerLevel - this._lastSyncedState.dangerLevel) > 0.05 ||
            engineStore.getState().wildcardPieceActive !== this._lastSyncedState.wildcardPieceActive ||
            this.boosterManager.isSelectingBombRows !== this._lastSyncedState.isSelectingBombRows ||
            this.boosterManager.isSelectingLine !== this._lastSyncedState.isSelectingLine ||
            currentStats.focusGauge !== this._lastSyncedState.focusGauge ||
            currentStats.isZoneActive !== this._lastSyncedState.isZoneActive ||
            this.missedOpportunity !== this._lastSyncedState.missedOpportunity ||
            this.isRewinding !== this._lastSyncedState.isRewinding
        ) {
            engineStore.setState({
                stats: { ...currentStats, isRewinding: this.isRewinding }, 
                garbagePending: this.boardManager.garbagePending,
                comboCount: this.scoreManager.comboCount,
                isBackToBack: this.scoreManager.isBackToBack,
                pieceIsGrounded: this.pieceManager.pieceIsGrounded,
                flippedGravity: this.flippedGravity,
                dangerLevel: dangerLevel,
                focusGauge: currentStats.focusGauge,
                zoneActive: currentStats.isZoneActive,
                missedOpportunity: this.missedOpportunity 
            });

            this._lastSyncedState = {
                score: currentStats.score,
                rows: currentStats.rows,
                level: currentStats.level,
                time: currentStats.time,
                comboCount: this.scoreManager.comboCount,
                garbagePending: this.boardManager.garbagePending,
                pieceIsGrounded: this.pieceManager.pieceIsGrounded,
                flippedGravity: this.flippedGravity,
                dangerLevel: dangerLevel,
                wildcardPieceActive: engineStore.getState().wildcardPieceActive,
                isSelectingBombRows: this.boosterManager.isSelectingBombRows,
                isSelectingLine: this.boosterManager.isSelectingLine,
                focusGauge: currentStats.focusGauge,
                isZoneActive: currentStats.isZoneActive,
                missedOpportunity: this.missedOpportunity,
                isRewinding: this.isRewinding
            };
        }
    }

    // ... existing methods ...
    setGameConfig(config: { speed?: number, das?: number, arr?: number }): void {
        if (config.speed !== undefined) {
            this.speedMultiplier = config.speed;
            this.updateSpeed();
        }
        this.inputManager.updateConfig({ das: config.das, arr: config.arr });
    }
    
    setDropTime(ms: number): void {
        this.pieceManager.dropTime = ms;
    }

    setInputConfig(config: { keyMap?: KeyMap, das?: number, arr?: number }): void {
        this.inputManager.updateConfig(config);
    }

    setFlippedGravity(isFlipped: boolean): void {
        this.flippedGravity = isFlipped;
        this.inputManager.updateConfig({ flippedGravity: isFlipped });
        engineStore.setState({ flippedGravity: isFlipped });
        this.events.onVisualEffect({ type: isFlipped ? 'FLIPPED_GRAVITY_ACTIVATE' : 'FLIPPED_GRAVITY_END' });
    }

    resetGame(mode: GameMode = 'MARATHON', startLevel: number = 0, adventureLevelConfig: AdventureLevelConfig | undefined, assistRows: number = 0, activeBoosters: BoosterType[] = [], difficulty: Difficulty = 'MEDIUM'): void {
        this.mode = mode;
        this.accumulator = 0;
        this.gameStartTime = Date.now();
        this.totalPausedDuration = 0;
        this.pauseStartTime = 0;
        this.missedOpportunity = null;
        this.historyBuffer = [];
        this.isRewinding = false;
        this.frameCount = 0;
        
        // SEEDED RNG & REPLAY SETUP
        const seed = mode === 'DAILY' ? new Date().toDateString() : Date.now().toString();
        setRngSeed(seed);
        
        if (!replayManager.isReplaying) {
            replayManager.startRecording(mode, difficulty, seed);
        } else {
            // If replaying, use seed from recording
            const replaySeed = replayManager.getSeed();
            setRngSeed(replaySeed || seed);
        }

        this.initialFlippedGravityGimmick = adventureLevelConfig?.gimmicks?.some(g => g.type === 'FLIPPED_GRAVITY') || false;
        
        this.scoreManager.reset(mode, startLevel);
        this.adventureManager.reset(adventureLevelConfig);
        this.boosterManager.reset(activeBoosters);
        this.boardManager.initialize(mode, startLevel, adventureLevelConfig, assistRows);
        this.fxManager.clear();
        
        // Initialize Abilities from Profile
        const loadout = useProfileStore.getState().stats.equippedAbilities;
        this.abilityManager.initialize(loadout);
        this.scoreManager.stats.abilities = this.abilityManager.abilities; // Sync initial state
        
        this._clearEphemeralStates();
        
        if (mode === 'SURVIVAL') {
            this.survivalTimer = 0;
            this.currentGarbageInterval = SURVIVAL_INITIAL_GARBAGE_INTERVAL;
        }
        
        const initialSpeed = this._calculateBaseSpeed(startLevel);
        this.pieceManager.dropTime = initialSpeed;
        this.pieceManager.reset(startLevel, adventureLevelConfig);
        
        this.setFlippedGravity(this.initialFlippedGravityGimmick);
        this.stateManager.forceState('COUNTDOWN');
        
        engineStore.getState().setGameMode(mode, difficulty); 
        
        this._lastSyncedState = { ...this._lastSyncedState, score: -999 }; 
        this.syncState();
    }

    private _clearEphemeralStates(): void {
        this.boosterManager.isSelectingBombRows = false;
        this.boosterManager.isSelectingLine = false;
        this.boosterManager.selectedLineToClear = null;
        this.missedOpportunity = null;
        
        engineStore.setState({
            isSelectingBombRows: false,
            bombRowsToClear: 0,
            isSelectingLine: false,
            selectedLineToClear: null,
            missedOpportunity: null
        });
    }

    public triggerGameOver(state: GameState, rewards?: LevelRewards): void {
        if (this.stateManager.currentState === 'GAMEOVER' || this.stateManager.currentState === 'VICTORY') return;

        // Replay Finish
        if (!replayManager.isReplaying) {
            replayManager.finishRecording(this.scoreManager.stats.score);
        }

        this.events.onGameOver(state, this.adventureManager.config?.id, rewards);
        
        if (state === 'VICTORY') {
            this.stateManager.transitionTo('VICTORY');
        } else {
            this.stateManager.transitionTo('GAMEOVER');
        }
        this._lastSyncedState.score = -1;
        this.syncState();
    }

    public pauseGameLoop(): void {
        if (!this._gameLoopPaused) {
            this._gameLoopPaused = true;
            this.pauseStartTime = Date.now();
        }
    }

    public resumeGameLoop(): void {
        if (this._gameLoopPaused) {
            this._gameLoopPaused = false;
            if (this.pauseStartTime > 0) {
                const pauseDuration = Date.now() - this.pauseStartTime;
                this.totalPausedDuration += pauseDuration;
                this.pauseStartTime = 0;
            }
            this.accumulator = 0;
            this.inputManager.reset();
        }
    }

    public applyScore(result: { score: number }): void {
        this.scoreManager.applyScore(result.score);
    }

    public handleLevelUp(newLevel: number): void {
        if (newLevel <= this.scoreManager.stats.level) return;
        this.scoreManager.stats.level = newLevel;
        this.updateSpeed();
        this.addFloatingText(`LEVEL ${newLevel}`, '#fbbf24', 1.0);
        this.playAudio('LEVEL_UP');
        
        if (newLevel >= 20) {
             this.pieceManager.lockDelayDuration = Math.max(150, 500 - (newLevel - 20) * 15);
        } else {
             this.pieceManager.lockDelayDuration = 500;
        }
        this.syncState();
    }

    public updateSpeed(): void {
        const currentLevel = this.scoreManager.stats.level;
        const speed = this._calculateBaseSpeed(currentLevel);
        this.pieceManager.dropTime = speed;
    }

    private _calculateBaseSpeed(level: number): number {
        let baseDropTime = 1000;
        if (this.mode === 'ZEN' || this.mode === 'PUZZLE') return 1000000;
        if (this.mode === 'MASTER') return 0;
        if (this.mode === 'BLITZ') return BLITZ_INITIAL_DROPTIME;
        if (this.mode === 'SURVIVAL' || this.mode === 'COMBO_MASTER') {
            const effectiveLevel = Math.max(1, level);
            baseDropTime = Math.max(150, Math.pow(0.85 - ((effectiveLevel - 1) * 0.005), effectiveLevel - 1) * 800);
            return baseDropTime / this.speedMultiplier;
        }
        if (this.mode === 'ADVENTURE') {
             const lvlIndex = this.adventureManager.config?.index || 0;
             baseDropTime = Math.max(100, Math.pow(0.95, lvlIndex) * 1000);
        } else {
             const effectiveLevel = Math.max(1, level);
             baseDropTime = Math.max(100, Math.pow(0.8 - ((effectiveLevel - 1) * 0.007), effectiveLevel - 1) * 1000);
        }
        return baseDropTime / this.speedMultiplier;
    }

    handleAction(action: KeyAction): void {
        if (!this.stateManager.isPlaying() && this.stateManager.currentState !== 'BOMB_SELECTION' && this.stateManager.currentState !== 'LINE_SELECTION') return;
        if (this.boosterManager.isSelectingBombRows || this.boosterManager.isSelectingLine) return;

        switch (action) {
            case 'moveLeft': this.pieceManager.move(-1); break;
            case 'moveRight': this.pieceManager.move(1); break;
            case 'softDrop': this.pieceManager.softDrop(); break;
            case 'hardDrop': this.pieceManager.hardDrop(); break;
            case 'rotateCW': this.pieceManager.rotate(1); break;
            case 'rotateCCW': this.pieceManager.rotate(-1); break;
            case 'hold': this.pieceManager.hold(); break;
            case 'zone': this.scoreManager.tryActivateZone(); break;
            case 'rewind': this.rewind(); break;
            case 'ability1': this.abilityManager.triggerAbility(0); break;
            case 'ability2': this.abilityManager.triggerAbility(1); break;
            case 'ability3': this.abilityManager.triggerAbility(2); break;
        }
    }

    spawnPiece(): void { this.pieceManager.spawnPiece(); }
    sweepRows(newStage: Board, isTSpinDetected: boolean = false, manualClearedRows?: number[]): void { 
        this.boardManager.sweepRows(newStage, isTSpinDetected, manualClearedRows); 
    }
    clearBottomLine(): void { this.boardManager.clearBottomLine(); }
    nukeBoard(): void { this.boardManager.nukeBoard(); }
    
    chooseWildcardPiece(type: TetrominoType): void { 
        this.pieceManager.chooseWildcardPiece(type); 
    }
    
    activateLineClearerSelection(): void { this.boosterManager.activateLineClearerSelection(); }
    executeLineClearer(selectedRow: number): void { this.boosterManager.executeLineClearer(selectedRow); }
    activateBombBoosterSelection(): void { this.boosterManager.activateBombBoosterSelection(); }
    executeBombBooster(startRow: number, numRows: number): void { this.boosterManager.executeBombBooster(startRow, numRows); }

    addFloatingText(text: string, color: string, scale: number = 0.5, variant: FloatingTextVariant = 'default'): void {
        this.fxManager.addFloatingText(text, color, scale, variant);
    }
    
    public playAudio(event: any, val?: number, type?: TetrominoType) {
        let pan = 0;
        if (val !== undefined) {
            pan = (val - 4.5) / 5.0;
            pan = Math.max(-1, Math.min(1, pan));
        }
        
        if (event === 'MOVE') audioManager.playMove(pan);
        else if (event === 'ROTATE') audioManager.playRotate(pan);
        else if (event === 'HARD_DROP') audioManager.playHardDrop(pan);
        else if (event === 'LOCK') audioManager.playLock(pan, type);
        else if (event === 'LEVEL_UP') audioManager.playLevelUp();
        else if (event === 'ZONE_START') audioManager.playZoneStart();
        else if (event === 'ZONE_END') audioManager.playZoneEnd();
        else if (event === 'ZONE_CLEAR') audioManager.playZoneClear();
        else if (event === 'REWIND') audioManager.playUiHover(); 
        
        this.events.onAudio(event, val, type);
    }

    public getElapsedGameTime(): number {
        if (this._gameLoopPaused) {
            return Math.max(0, this.pauseStartTime - this.gameStartTime - this.totalPausedDuration);
        }
        return Math.max(0, Date.now() - this.gameStartTime - this.totalPausedDuration);
    }

    // --- REWIND SYSTEM ---
    private snapshotState(): void {
        const snapshot: GameSnapshot = {
            board: this.boardManager.stage.map(row => row.map(cell => [...cell])), // Deep copy board
            player: JSON.parse(JSON.stringify(this.pieceManager.player)),
            score: this.scoreManager.stats.score,
            rows: this.scoreManager.stats.rows,
            level: this.scoreManager.stats.level,
            combo: this.scoreManager.comboCount,
            b2b: this.scoreManager.isBackToBack,
            nextQueue: [...this.pieceManager.nextQueue],
            heldPiece: this.pieceManager.heldPiece,
            canHold: this.pieceManager.canHold,
            timestamp: Date.now()
        };

        this.historyBuffer.push(snapshot);
        if (this.historyBuffer.length > this.MAX_HISTORY) {
            this.historyBuffer.shift();
        }
    }

    private rewind(): void {
        if (this.historyBuffer.length > 0) {
            this.isRewinding = true;
            const steps = 2; 
            let snapshot: GameSnapshot | undefined;
            
            for(let i=0; i<steps; i++) snapshot = this.historyBuffer.pop();
            
            if (snapshot) {
                this.restoreSnapshot(snapshot);
                this.callbacks.onAudio('REWIND');
            } else {
                this.isRewinding = false;
            }
        } else {
            this.isRewinding = false;
        }
    }

    private restoreSnapshot(snapshot: GameSnapshot): void {
        this.boardManager.stage = snapshot.board;
        this.pieceManager.player = snapshot.player;
        this.scoreManager.stats.score = snapshot.score;
        this.scoreManager.stats.rows = snapshot.rows;
        this.scoreManager.stats.level = snapshot.level;
        this.scoreManager.comboCount = snapshot.combo;
        this.scoreManager.isBackToBack = snapshot.b2b;
        this.pieceManager.nextQueue = snapshot.nextQueue;
        this.pieceManager.heldPiece = snapshot.heldPiece;
        this.pieceManager.canHold = snapshot.canHold;
        
        // Invalidate renderer cache
        this.boardManager.revision++;
    }

    update(deltaTime: number): void {
        if (this._gameLoopPaused) return;

        try {
            // REPLAY INPUT INJECTION
            if (replayManager.isReplaying) {
                const elapsed = this.getElapsedGameTime();
                const actions = replayManager.getPlaybackInput(elapsed);
                actions.forEach(action => this.handleAction(action));
            }

            // Input Check for Rewind (Disabled during Replay)
            const isRewindHeld = !replayManager.isReplaying && this.inputManager.isRewindHeld(); 
            
            if (isRewindHeld && this.mode !== 'SURVIVAL' && this.mode !== 'BLITZ' && this.mode !== 'DAILY') { 
                this.rewind();
                this.syncState();
                return;
            } else {
                this.isRewinding = false;
                this.frameCount++;
                if (this.frameCount % 2 === 0) {
                    this.snapshotState();
                }
            }

            const safeDelta = Math.min(deltaTime, 100);
            if (deltaTime > 500) {
                this.accumulator = 0; 
            } else {
                this.accumulator += safeDelta;
            }

            while (this.accumulator >= this.TIME_STEP) {
                this.fixedUpdate(this.TIME_STEP);
                this.accumulator -= this.TIME_STEP;
            }

            this.updateEphemeralStates(deltaTime);
            this.syncState(); 
        } catch (e) {
            console.error("[Reliability] Fatal Game Loop Exception:", e);
            this._gameLoopPaused = true; 
            try {
                if (this.stateManager.currentState !== 'GAMEOVER') {
                    this.triggerGameOver('GAMEOVER');
                }
                this.addFloatingText("SYSTEM CRASH", "#ff0000", 1.5);
            } catch (innerError) {}
        }
    }

    private fixedUpdate(fixedDelta: number): void {
        if (!replayManager.isReplaying) {
            this.inputManager.update(fixedDelta);
        }
        this.adventureManager.update(fixedDelta);
        this.scoreManager.update(fixedDelta);
        this.adventureManager.checkObjectives();
        this.boosterManager.update(fixedDelta);
        this.abilityManager.update(fixedDelta);
        
        if (!this.scoreManager.stats.isZoneActive) {
            this.pieceManager.update(fixedDelta);
        }
        
        if (this.mode === 'SURVIVAL' && this.stateManager.isPlaying() && !this.scoreManager.stats.isZoneActive) {
            this.survivalTimer += fixedDelta;
            if (this.survivalTimer >= this.currentGarbageInterval) {
                this.boardManager.addGarbage(1);
                this.addFloatingText("SURVIVE!", "#ef4444", 0.8, 'frenzy');
                this.survivalTimer = 0;
                this.currentGarbageInterval = Math.max(SURVIVAL_MIN_GARBAGE_INTERVAL, this.currentGarbageInterval - SURVIVAL_GARBAGE_DECREMENT);
            }
        }
    }

    private _calculateStressLevel(): number {
        let maxHeight = 0;
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < STAGE_HEIGHT; y++) {
                if (this.boardManager.stage[y][x][1] !== 'clear') {
                    const h = this.flippedGravity ? y + 1 : STAGE_HEIGHT - y;
                    if (h > maxHeight) maxHeight = h;
                    break;
                }
            }
        }
        
        const heightRatio = maxHeight / STAGE_HEIGHT;
        const comboIntensity = Math.min(this.scoreManager.comboCount / 10, 0.8);
        const speedIntensity = Math.max(0, (1000 - this.pieceManager.dropTime) / 900);

        let intensity = Math.max(heightRatio, comboIntensity, speedIntensity);
        if (this.scoreManager.frenzyActive) intensity = Math.max(intensity, 0.8);
        if (this.scoreManager.stats.isZoneActive) intensity = 0.2; 
        
        return intensity;
    }

    updateEphemeralStates(deltaTime: number): void {
        this.fxManager.update(deltaTime);
    }
    
    public get callbacks() {
        return {
            onStateChange: (newState: GameState, prevState: GameState) => engineStore.getState().setGameState(newState),
            onStatsChange: (stats: any) => engineStore.getState().setStats(stats),
            onQueueChange: (q: any) => engineStore.getState().setQueue(q),
            onHoldChange: (p: any, c: any) => engineStore.getState().setHold(p, c),
            onVisualEffect: this.events.onVisualEffect,
            onGameOver: this.triggerGameOver.bind(this),
            onAiTrigger: () => {},
            onComboChange: (combo: number, isB2B: boolean) => {},
            onGarbageChange: (garbage: number) => {},
            onGroundedChange: (isGrounded: boolean) => {},
            onFlippedGravityChange: (flipped: boolean) => {},
            onWildcardSelectionTrigger: () => {
                engineStore.setState({ wildcardPieceActive: true });
                this.stateManager.transitionTo('WILDCARD_SELECTION');
            },
            onWildcardAvailableChange: (avail: boolean) => engineStore.getState().setStats({ wildcardAvailable: avail }),
            onSlowTimeChange: (active: boolean, timer: number) => engineStore.getState().setStats({ slowTimeActive: active, slowTimeTimer: timer }),
            onBombBoosterReadyChange: (ready: boolean) => engineStore.getState().setStats({ bombBoosterReady: ready }),
            onBombSelectionStart: (rows: number) => engineStore.setState({ isSelectingBombRows: true, bombRowsToClear: rows }),
            onBombSelectionEnd: () => engineStore.setState({ isSelectingBombRows: false, bombRowsToClear: 0 }),
            onLineClearerActiveChange: (active: boolean) => engineStore.getState().setStats({ lineClearerActive: active }),
            onLineSelectionStart: () => engineStore.setState({ isSelectingLine: true }),
            onLineSelectionEnd: () => engineStore.setState({ isSelectingLine: false, selectedLineToClear: null }),
            onBlitzSpeedUp: (threshold: number) => this.events.onVisualEffect({ type: 'BLITZ_SPEED_THRESHOLD', payload: { threshold } }),
            onFlippedGravityTimerChange: (active: boolean, timer: number) => engineStore.getState().setStats({ flippedGravityActive: active, flippedGravityTimer: timer }),
            onAudio: this.playAudio.bind(this),
            onStressChange: (lvl: number) => {
                audioManager.setIntensity(lvl);
                audioManager.setTempo(110 + lvl * 50);
            },
            onAchievementUnlocked: this.events.onAchievementUnlocked,
            onFastScoreUpdate: this.events.onFastScoreUpdate // Added binding
        };
    }
}

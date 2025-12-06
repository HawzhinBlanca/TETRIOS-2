
import type { GameCore } from './GameCore';
import { BoosterType, GameStats } from '../types';
import { SLOW_TIME_BOOSTER_DURATION_MS, FLIPPED_GRAVITY_BOOSTER_DURATION_MS, MODIFIER_COLORS, SCORES, STAGE_HEIGHT, STAGE_WIDTH } from '../constants';

export class BoosterManager {
    private core: GameCore;
    public activeBoosters: BoosterType[] = [];
    
    public slowTimeActive: boolean = false;
    public slowTimeTimer: number = 0;
    
    public timeFreezeActive: boolean = false;
    public timeFreezeTimer: number = 0;
    
    public flippedGravityActive: boolean = false;
    public flippedGravityTimer: number = 0;
    
    public wildcardAvailable: boolean = false;
    public bombBoosterReady: boolean = false;
    public lineClearerActive: boolean = false;
    
    public isSelectingBombRows: boolean = false;
    public isSelectingLine: boolean = false;
    public selectedLineToClear: number | null = null;

    constructor(core: GameCore) {
        this.core = core;
    }

    public reset(activeBoosters: BoosterType[]): void {
        this.activeBoosters = activeBoosters;
        this.slowTimeActive = false;
        this.slowTimeTimer = 0;
        this.timeFreezeActive = false;
        this.timeFreezeTimer = 0;
        this.wildcardAvailable = false;
        this.lineClearerActive = false;
        this.isSelectingLine = false;
        this.selectedLineToClear = null;
        this.bombBoosterReady = false;
        this.isSelectingBombRows = false;
        this.flippedGravityActive = false;
        this.flippedGravityTimer = 0;

        this._initEffects();
    }

    public restoreState(savedStats: GameStats): void {
        if (savedStats.slowTimeActive && savedStats.slowTimeTimer && savedStats.slowTimeTimer > 0) {
            this.slowTimeActive = true;
            this.slowTimeTimer = savedStats.slowTimeTimer;
        }
        if (savedStats.timeFreezeActive && savedStats.timeFreezeTimer && savedStats.timeFreezeTimer > 0) {
            this.timeFreezeActive = true;
            this.timeFreezeTimer = savedStats.timeFreezeTimer;
        }
        if (savedStats.flippedGravityActive && savedStats.flippedGravityTimer && savedStats.flippedGravityTimer > 0) {
            this.flippedGravityActive = true;
            this.flippedGravityTimer = savedStats.flippedGravityTimer;
        }

        this.wildcardAvailable = !!savedStats.wildcardAvailable;
        this.bombBoosterReady = !!savedStats.bombBoosterReady;
        this.lineClearerActive = !!savedStats.lineClearerActive;

        this._syncUI();
    }

    private _activateBoosterEffect(message: string, color: string, callback?: () => void) {
        this.core.addFloatingText(message, color, 0.8, 'powerup');
        if (callback) callback();
    }

    private _initEffects(): void {
        if (this.activeBoosters.includes('SLOW_TIME_BOOSTER')) {
            this.activateSlowTime(SLOW_TIME_BOOSTER_DURATION_MS);
        }
        
        if (this.activeBoosters.includes('PIECE_SWAP_BOOSTER')) {
            this.core.pieceManager.canHold = true;
            this._activateBoosterEffect('PIECE SWAP+', '#a78bfa');
        }
        
        if (this.activeBoosters.includes('BOMB_BOOSTER')) {
            this.bombBoosterReady = true;
            this._activateBoosterEffect('BOMB BOOSTER READY!', MODIFIER_COLORS.BOMB);
        }
        
        if (this.activeBoosters.includes('LINE_CLEARER_BOOSTER')) {
            this.lineClearerActive = true;
            this._activateBoosterEffect('LINE CLEARER READY!', MODIFIER_COLORS.LASER_BLOCK);
        }
        
        if (this.activeBoosters.includes('FLIPPED_GRAVITY_BOOSTER')) {
            this.flippedGravityActive = true;
            this.flippedGravityTimer = FLIPPED_GRAVITY_BOOSTER_DURATION_MS;
            this.core.setFlippedGravity(true);
            this.core.events.emit('VISUAL_EFFECT', { type: 'FLIPPED_GRAVITY_ACTIVATE' });
            this._activateBoosterEffect('GRAVITY FLIPPED!', '#3b82f6');
        }

        this._syncUI();
    }

    private _syncUI(): void {
        this.core.events.emit('SLOW_TIME_CHANGE', { active: this.slowTimeActive, timer: this.slowTimeTimer });
        this.core.events.emit('WILDCARD_AVAILABLE_CHANGE', this.wildcardAvailable);
        this.core.events.emit('BOMB_BOOSTER_READY_CHANGE', this.bombBoosterReady);
        this.core.events.emit('LINE_CLEARER_ACTIVE_CHANGE', this.lineClearerActive);
        this.core.events.emit('FLIPPED_GRAVITY_TIMER_CHANGE', { active: this.flippedGravityActive, timer: this.flippedGravityTimer });
    }

    public activateSlowTime(duration: number): void {
        this.slowTimeActive = true;
        this.slowTimeTimer = duration;
        this._activateBoosterEffect('SLOW TIME!', '#818cf8', () => {
            this.core.events.emit('SLOW_TIME_CHANGE', { active: true, timer: duration });
        });
    }

    public activateTimeFreeze(duration: number): void {
        this.timeFreezeActive = true;
        this.timeFreezeTimer = duration;
        this._activateBoosterEffect('GRAVITY FROZEN!', MODIFIER_COLORS.FREEZE_BLOCK);
        this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: MODIFIER_COLORS.FREEZE_BLOCK, duration: 500 } });
        this.core.events.emit('AUDIO', { event: 'ZONE_START' });
    }

    public update(deltaTime: number): void {
        if (this.slowTimeActive) {
            this.slowTimeTimer -= deltaTime;
            if (this.slowTimeTimer <= 0) {
                this.slowTimeActive = false;
                this.core.events.emit('SLOW_TIME_CHANGE', { active: false, timer: 0 });
                this.core.addFloatingText('SLOW TIME END', '#888888', 0.6, 'powerup');
            } else {
                this.core.events.emit('SLOW_TIME_CHANGE', { active: true, timer: this.slowTimeTimer });
            }
        }

        if (this.timeFreezeActive) {
            this.timeFreezeTimer -= deltaTime;
            if (this.timeFreezeTimer <= 0) {
                this.timeFreezeActive = false;
                this.core.addFloatingText('GRAVITY RESUMED', '#888888', 0.6, 'powerup');
            }
        }

        if (this.flippedGravityActive) {
            this.flippedGravityTimer -= deltaTime;
            if (this.flippedGravityTimer <= 0) {
                this.flippedGravityActive = false;
                this.core.setFlippedGravity(this.core.initialFlippedGravityGimmick);
                this.core.events.emit('FLIPPED_GRAVITY_TIMER_CHANGE', { active: false, timer: 0 });
                this.core.events.emit('VISUAL_EFFECT', { type: 'FLIPPED_GRAVITY_END' });
                this.core.addFloatingText('GRAVITY RESTORED!', '#888888', 0.6, 'powerup');
            } else {
                this.core.events.emit('FLIPPED_GRAVITY_TIMER_CHANGE', { active: true, timer: this.flippedGravityTimer });
            }
        }
    }

    // Helper to start selection modes
    private _activateSelection(
        type: BoosterType,
        checkProp: keyof BoosterManager,
        setProp: keyof BoosterManager,
        eventStart: string,
        audioEvent: string,
        color: string
    ) {
        if (!this.activeBoosters.includes(type) || this[checkProp]) return;
        // @ts-ignore
        this[setProp] = true;
        this.core.events.emit(eventStart as any, type === 'BOMB_BOOSTER' ? 2 : undefined);
        this.core.events.emit('VISUAL_EFFECT', { type: 'POWERUP_ACTIVATE', payload: { type, x: STAGE_WIDTH / 2 -1, y: STAGE_HEIGHT / 2 -1, color } });
        this.core.events.emit('AUDIO', { event: audioEvent });
    }

    public activateLineClearerSelection(): void {
        this._activateSelection('LINE_CLEARER_BOOSTER', 'isSelectingLine', 'isSelectingLine', 'LINE_SELECTION_START', 'LINE_CLEARER_ACTIVATE', MODIFIER_COLORS.LASER_BLOCK);
    }

    public activateBombBoosterSelection(): void {
        this._activateSelection('BOMB_BOOSTER', 'isSelectingBombRows', 'isSelectingBombRows', 'BOMB_SELECTION_START', 'BOMB_ACTIVATE', MODIFIER_COLORS.BOMB);
    }

    // Helper to execute clear logic
    private _executeClearEffect(
        type: BoosterType,
        checkProp: keyof BoosterManager,
        setProp: keyof BoosterManager,
        eventEnd: string,
        readyProp: keyof BoosterManager,
        readyEvent: string,
        rowsToClear: number[],
        color: string,
        message: string,
        score: number,
        audio: string,
        flashDuration: number = 200,
        shakeType: 'soft' | 'hard' = 'soft'
    ) {
        if (!this[checkProp] || !this.activeBoosters.includes(type)) return;
        
        // @ts-ignore
        this[setProp] = false;
        this.core.events.emit(eventEnd as any);

        if (rowsToClear.length === 0) {
            this.core.addFloatingText('MISSED!', '#888888', 0.6, 'powerup');
            return;
        }

        const tempStage = this.core.boardManager.stage.map(row => [...row]);
        rowsToClear.forEach(r => {
            if (tempStage[r]) tempStage[r].fill([null, 'clear']);
        });

        // Shared Visuals
        const payloadRows = rowsToClear.length === 1 ? rowsToClear[0] : rowsToClear;
        this.core.events.emit('VISUAL_EFFECT', {type: 'PARTICLE', payload: { isExplosion: true, clearedRows: payloadRows, color }});
        this.core.events.emit('VISUAL_EFFECT', {type: 'SHAKE', payload: shakeType});
        this.core.events.emit('VISUAL_EFFECT', {type: 'FLASH', payload: { color, duration: flashDuration }});
        this._activateBoosterEffect(message, color);
        this.core.applyScore(score);
        this.core.events.emit('AUDIO', { event: audio });
        
        this.core.boardManager.sweepRows(tempStage, false, rowsToClear);

        this.activeBoosters = this.activeBoosters.filter(b => b !== type);
        // @ts-ignore
        this[readyProp] = false;
        this.core.events.emit(readyEvent as any, false);
    }

    public executeLineClearer(selectedRow: number): void {
        if (selectedRow === null || selectedRow === undefined || selectedRow < 0 || selectedRow >= STAGE_HEIGHT) {
            this.isSelectingLine = false; // Cancel state on invalid
            this.core.events.emit('LINE_SELECTION_END');
            this.core.addFloatingText('INVALID LINE!', '#888888', 0.6, 'powerup');
            return;
        }
        
        this._executeClearEffect(
            'LINE_CLEARER_BOOSTER',
            'isSelectingLine',
            'isSelectingLine',
            'LINE_SELECTION_END',
            'lineClearerActive',
            'LINE_CLEARER_ACTIVE_CHANGE',
            [selectedRow],
            MODIFIER_COLORS.LASER_BLOCK,
            'LINE CLEARED!',
            SCORES.BOOSTER_LINE_CLEARER_BONUS,
            'LASER_CLEAR'
        );
    }

    public executeBombBooster(startRow: number, numRows: number): void {
        const rowsToClear: number[] = [];
        const actualStartRow = this.core.flippedGravity ? (STAGE_HEIGHT - numRows - startRow) : startRow;

        for (let i = 0; i < numRows; i++) {
            const rowIdx = actualStartRow + i;
            if (rowIdx >= 0 && rowIdx < STAGE_HEIGHT) {
                rowsToClear.push(rowIdx);
            }
        }

        this._executeClearEffect(
            'BOMB_BOOSTER',
            'isSelectingBombRows',
            'isSelectingBombRows',
            'BOMB_SELECTION_END',
            'bombBoosterReady',
            'BOMB_BOOSTER_READY_CHANGE',
            rowsToClear,
            MODIFIER_COLORS.BOMB,
            'BOMB CLEAR!',
            SCORES.BOOSTER_BOMB_CLEAR_BONUS,
            'NUKE_CLEAR',
            300,
            'hard'
        );
    }
}

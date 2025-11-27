
import type { GameCore } from './GameCore';
import { BoosterType } from '../types';
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

    private _initEffects(): void {
        if (this.activeBoosters.includes('SLOW_TIME_BOOSTER')) {
            this.activateSlowTime(SLOW_TIME_BOOSTER_DURATION_MS);
        }
        
        if (this.activeBoosters.includes('PIECE_SWAP_BOOSTER')) {
            this.core.pieceManager.canHold = true;
            this.core.addFloatingText('PIECE SWAP+', '#a78bfa', 0.8, 'powerup');
        }
        
        if (this.activeBoosters.includes('BOMB_BOOSTER')) {
            this.bombBoosterReady = true;
            this.core.addFloatingText('BOMB BOOSTER READY!', MODIFIER_COLORS.BOMB, 0.8, 'powerup');
        }
        
        if (this.activeBoosters.includes('LINE_CLEARER_BOOSTER')) {
            this.lineClearerActive = true;
            this.core.addFloatingText('LINE CLEARER READY!', MODIFIER_COLORS.LASER_BLOCK, 0.8, 'powerup');
        }
        
        if (this.activeBoosters.includes('FLIPPED_GRAVITY_BOOSTER')) {
            this.flippedGravityActive = true;
            this.flippedGravityTimer = FLIPPED_GRAVITY_BOOSTER_DURATION_MS;
            this.core.setFlippedGravity(true);
            this.core.events.emit('VISUAL_EFFECT', { type: 'FLIPPED_GRAVITY_ACTIVATE' });
            this.core.addFloatingText('GRAVITY FLIPPED!', '#3b82f6', 0.8, 'powerup');
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
        this.core.addFloatingText('SLOW TIME!', '#818cf8', 0.8, 'powerup');
        this.core.events.emit('SLOW_TIME_CHANGE', { active: true, timer: duration });
    }

    public activateTimeFreeze(duration: number): void {
        this.timeFreezeActive = true;
        this.timeFreezeTimer = duration;
        this.core.addFloatingText('GRAVITY FROZEN!', MODIFIER_COLORS.FREEZE_BLOCK, 1.0, 'powerup');
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

    public activateLineClearerSelection(): void {
        if (!this.activeBoosters.includes('LINE_CLEARER_BOOSTER') || this.isSelectingLine) return;
        this.isSelectingLine = true;
        this.core.events.emit('LINE_SELECTION_START');
        this.core.events.emit('AUDIO', { event: 'LINE_CLEARER_ACTIVATE' });
        this.core.events.emit('VISUAL_EFFECT', { type: 'POWERUP_ACTIVATE', payload: { type: 'LINE_CLEARER_BOOSTER', x: STAGE_WIDTH / 2 -1, y: STAGE_HEIGHT / 2 -1, color: MODIFIER_COLORS.LASER_BLOCK } });
    }

    public executeLineClearer(selectedRow: number): void {
        if (!this.isSelectingLine || !this.activeBoosters.includes('LINE_CLEARER_BOOSTER')) return;
        this.isSelectingLine = false;
        this.core.events.emit('LINE_SELECTION_END');

        if (selectedRow === null || selectedRow === undefined || selectedRow < 0 || selectedRow >= STAGE_HEIGHT) {
            this.core.addFloatingText('INVALID LINE!', '#888888', 0.6, 'powerup');
            this.selectedLineToClear = null;
            return;
        }
        this.selectedLineToClear = null;

        const tempStage = this.core.boardManager.stage.map(row => [...row]);
        tempStage[selectedRow].fill([null, 'clear']);

        this.core.events.emit('VISUAL_EFFECT', {type: 'PARTICLE', payload: { isExplosion: true, clearedRows: selectedRow, color: MODIFIER_COLORS.LASER_BLOCK }});
        this.core.events.emit('VISUAL_EFFECT', {type: 'SHAKE', payload: 'soft'});
        this.core.events.emit('VISUAL_EFFECT', {type: 'FLASH', payload: { color: MODIFIER_COLORS.LASER_BLOCK, duration: 200 }});
        this.core.addFloatingText('LINE CLEARED!', MODIFIER_COLORS.LASER_BLOCK, 0.7, 'powerup');
        this.core.applyScore({ score: SCORES.BOOSTER_LINE_CLEARER_BONUS });
        this.core.events.emit('AUDIO', { event: 'LASER_CLEAR' });
        this.core.boardManager.sweepRows(tempStage, false, [selectedRow]);

        this.activeBoosters = this.activeBoosters.filter(b => b !== 'LINE_CLEARER_BOOSTER');
        this.lineClearerActive = false;
        this.core.events.emit('LINE_CLEARER_ACTIVE_CHANGE', false);
    }

    public activateBombBoosterSelection(): void {
        if (!this.activeBoosters.includes('BOMB_BOOSTER') || this.isSelectingBombRows) return;
        this.isSelectingBombRows = true;
        this.core.events.emit('BOMB_SELECTION_START', 2);
        this.core.events.emit('VISUAL_EFFECT', { type: 'POWERUP_ACTIVATE', payload: { type: 'BOMB_BOOSTER', x: STAGE_WIDTH / 2 -1, y: STAGE_HEIGHT / 2 -1, color: MODIFIER_COLORS.BOMB } });
        this.core.events.emit('AUDIO', { event: 'BOMB_ACTIVATE' });
    }

    public executeBombBooster(startRow: number, numRows: number): void {
        if (!this.isSelectingBombRows || !this.activeBoosters.includes('BOMB_BOOSTER')) return;
        this.isSelectingBombRows = false;
        this.core.events.emit('BOMB_SELECTION_END');

        const rowsToClear: number[] = [];
        const actualStartRow = this.core.flippedGravity ? (STAGE_HEIGHT - numRows - startRow) : startRow;

        for (let i = 0; i < numRows; i++) {
            const rowIdx = actualStartRow + i;
            if (rowIdx >= 0 && rowIdx < STAGE_HEIGHT) {
                rowsToClear.push(rowIdx);
            }
        }

        if (rowsToClear.length === 0) {
            this.core.addFloatingText('BOMB FIZZLED!', '#888888', 0.6, 'powerup');
            return;
        }

        const tempStage = this.core.boardManager.stage.map(row => [...row]);
        rowsToClear.forEach(r => {
            if (tempStage[r]) {
                tempStage[r].fill([null, 'clear']);
            }
        });

        this.core.events.emit('VISUAL_EFFECT', { type: 'PARTICLE', payload: { isExplosion: true, clearedRows: rowsToClear, color: MODIFIER_COLORS.BOMB } });
        this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'hard' });
        this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: MODIFIER_COLORS.BOMB, duration: 300 } });
        this.core.addFloatingText('BOMB CLEAR!', MODIFIER_COLORS.BOMB, 0.7, 'powerup');
        this.core.applyScore({ score: SCORES.BOOSTER_BOMB_CLEAR_BONUS });
        this.core.events.emit('AUDIO', { event: 'NUKE_CLEAR' });

        this.core.boardManager.sweepRows(tempStage, false, rowsToClear);

        this.activeBoosters = this.activeBoosters.filter(b => b !== 'BOMB_BOOSTER');
        this.bombBoosterReady = false;
        this.core.events.emit('BOMB_BOOSTER_READY_CHANGE', false);
    }
}


import { GameCore } from './GameCore';
import { GameStats, GameMode, GameCallbacks, ScoreResult } from '../types';
import { SCORES, DEFAULT_GAMESPEED, FRENZY_DURATION_MS, FRENZY_COMBO_THRESHOLD, BLITZ_DURATION_MS, BLITZ_SPEED_THRESHOLDS, LEVEL_PASS_COIN_REWARD } from '../constants';
import { calculateScore } from './scoreRules';

export class ScoreManager {
    private core: GameCore;
    public stats: GameStats;
    
    // Game State
    public comboCount: number = -1;
    public isBackToBack: boolean = false;
    
    // Frenzy Mode State
    public frenzyActive: boolean = false;
    public frenzyTimer: number = 0;
    public frenzyMultiplier: number = 1;

    // Blitz Mode State
    private blitzSpeedThresholdIndex: number = 0;
    private blitzLastSpeedUpScore: number = 0;

    constructor(core: GameCore) {
        this.core = core;
        this.stats = this._getInitialStats();
    }

    private _getInitialStats(): GameStats {
        return {
            score: 0, rows: 0, level: 0, time: 0,
            movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
            isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
            wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
            flippedGravityActive: false, flippedGravityTimer: 0,
        };
    }

    public reset(mode: GameMode, startLevel: number): void {
        this.stats = this._getInitialStats();
        
        // Mode specific initializations
        if (mode === 'TIME_ATTACK') {
            this.stats.time = 180;
        } else if (mode === 'BLITZ') {
            this.stats.time = BLITZ_DURATION_MS / 1000;
        } else if (['SPRINT', 'PUZZLE', 'ADVENTURE'].includes(mode)) {
            this.stats.level = 0;
        } else {
            this.stats.level = startLevel;
        }

        this._resetEphemeralState();
        this.core.callbacks.onStatsChange(this.stats);
    }

    private _resetEphemeralState(): void {
        this.comboCount = -1;
        this.isBackToBack = false;
        this.frenzyActive = false;
        this.frenzyTimer = 0;
        this.frenzyMultiplier = 1;
        this.blitzSpeedThresholdIndex = 0;
        this.blitzLastSpeedUpScore = 0;
        
        this.core.callbacks.onComboChange(this.comboCount, this.isBackToBack);
    }

    public update(deltaTime: number): void {
        // Time Tracking
        if (this.core.mode === 'TIME_ATTACK' || this.core.mode === 'SPRINT') {
            this.stats.time += (deltaTime / 1000);
        } else if (this.core.mode === 'BLITZ') {
            this.stats.time = Math.max(0, this.stats.time - (deltaTime / 1000));
            if (this.stats.time <= 0) {
                this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 }); 
            }
        }

        // Frenzy Logic
        if (this.frenzyActive) {
            this.frenzyTimer -= deltaTime;
            if (this.frenzyTimer <= 0) {
                this._deactivateFrenzy();
            } else {
                this.stats.frenzyTimer = this.frenzyTimer;
                // We update stats in main loop, so just ensuring local state is correct
            }
        }
        
        // Sync stats to UI
        this.core.callbacks.onStatsChange(this.stats);
    }

    public handleLineClear(rowsCleared: number, isTSpinDetected: boolean): ScoreResult {
        this.comboCount += 1;
        this.stats.combosAchieved = Math.max(this.stats.combosAchieved || 0, this.comboCount + 1);
        
        const result = calculateScore(rowsCleared, this.stats.level, isTSpinDetected, this.isBackToBack, this.comboCount);
        
        this.isBackToBack = result.isBackToBack;
        if (rowsCleared === 4) this.stats.tetrisesAchieved = (this.stats.tetrisesAchieved || 0) + 1;
        
        this.core.callbacks.onComboChange(this.comboCount, this.isBackToBack);
        this.applyScore(result.score);
        
        this._handleLevelProgression(rowsCleared);
        
        if (this.comboCount >= FRENZY_COMBO_THRESHOLD) {
            this._activateFrenzy();
        }

        return result;
    }

    public resetCombo(): void {
        this.comboCount = -1;
        this.core.callbacks.onComboChange(this.comboCount, this.isBackToBack);
    }

    public applyScore(amount: number): void {
        if (this.core.mode !== 'ZEN' && this.core.mode !== 'PUZZLE') {
            this.stats.score += amount * this.frenzyMultiplier;
        }
        this.core.adventureManager.applyBossDamage(amount);

        if (this.core.mode === 'BLITZ') {
            this._checkBlitzSpeedUp();
        }
        
        this.core.callbacks.onStatsChange(this.stats);
    }

    public applySoftDrop(): void {
        if(this.core.mode !== 'ZEN' && this.core.mode !== 'PUZZLE') {
            this.applyScore(SCORES.SOFT_DROP);
        }
    }

    public applyHardDrop(droppedLines: number): void {
        if(this.core.mode !== 'ZEN' && this.core.mode !== 'PUZZLE') {
            this.applyScore(droppedLines * SCORES.HARD_DROP);
        }
    }

    private _activateFrenzy(): void {
        if (!this.frenzyActive) {
            this.frenzyActive = true;
            this.frenzyMultiplier = SCORES.FRENZY_MULTIPLIER;
            this.core.callbacks.onVisualEffect({ type: 'FRENZY_START' });
            this.core.addFloatingText('FRENZY!', '#ffd700', 0.9, 'frenzy');
            this.core.callbacks.onAudio('FRENZY_START');
        }
        this.frenzyTimer = Math.max(this.frenzyTimer, FRENZY_DURATION_MS);
        this.stats.isFrenzyActive = true;
        this.stats.frenzyTimer = this.frenzyTimer;
    }

    private _deactivateFrenzy(): void {
        if (this.frenzyActive) {
            this.frenzyActive = false;
            this.frenzyMultiplier = 1;
            this.core.callbacks.onVisualEffect({ type: 'FRENZY_END' });
            this.core.addFloatingText('FRENZY END', '#888888', 0.6, 'frenzy');
            this.stats.isFrenzyActive = false;
            this.stats.frenzyTimer = 0;
            this.core.callbacks.onAudio('FRENZY_END');
        }
    }

    private _checkBlitzSpeedUp(): void {
        const currentScore = this.stats.score;
        if (this.blitzSpeedThresholdIndex < BLITZ_SPEED_THRESHOLDS.length) {
            const nextThreshold = BLITZ_SPEED_THRESHOLDS[this.blitzSpeedThresholdIndex];
            if (currentScore >= nextThreshold.score && currentScore > this.blitzLastSpeedUpScore) {
                this.core.pieceManager.dropTime *= nextThreshold.speedFactor;
                this.core.addFloatingText(nextThreshold.message, '#ffa500', 0.9, 'frenzy');
                this.core.callbacks.onBlitzSpeedUp?.(this.blitzSpeedThresholdIndex);
                this.core.callbacks.onAudio('BLITZ_SPEEDUP');
                this.blitzLastSpeedUpScore = currentScore;
                this.blitzSpeedThresholdIndex++;
            }
        }
    }

    private _handleLevelProgression(rowsCleared: number): void {
        this.stats.rows += rowsCleared;
        
        if (this.core.mode === 'MARATHON') {
            const newLevel: number = Math.floor(this.stats.rows / 10);
            if (newLevel > this.stats.level) {
                this.stats.level = newLevel;
                // Update drop speed based on level
                this.core.pieceManager.dropTime = Math.max(100, 1000 * Math.pow(0.95, this.stats.level));
            }
        } else if (this.core.mode === 'SPRINT') {
            if (this.stats.rows >= 40) {
                this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
            }
        } else if (this.core.mode === 'PUZZLE') {
            // Logic handled in GameCore checks usually, but good to have safety
        }
    }
}

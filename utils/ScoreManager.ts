
import type { GameCore } from './GameCore';
import { GameStats, GameMode, ScoreResult } from '../types';
import { SCORES, FRENZY_DURATION_MS, FRENZY_COMBO_THRESHOLD, BLITZ_DURATION_MS, BLITZ_SPEED_THRESHOLDS, LEVEL_PASS_COIN_REWARD, COMBO_MASTER_INITIAL_TIME, COMBO_MASTER_TIME_BONUS_BASE, COMBO_MASTER_TIME_BONUS_MULTIPLIER, FOCUS_GAUGE_PER_LINE, FOCUS_GAUGE_MAX, ZONE_DURATION_MS, ACHIEVEMENTS } from '../constants';
import { calculateScore } from './scoreRules';
import { useProfileStore } from '../stores/profileStore';
import { audioManager } from './audioManager';

export class ScoreManager {
    private core: GameCore;
    public stats: GameStats;
    
    public comboCount: number = -1;
    public isBackToBack: boolean = false;
    public frenzyActive: boolean = false;
    public frenzyTimer: number = 0;
    public frenzyMultiplier: number = 1;
    public scoreMultiplierActive: boolean = false;
    public scoreMultiplierTimer: number = 0;
    public powerupMultiplier: number = 1;

    private blitzSpeedThresholdIndex: number = 0;
    private blitzLastSpeedUpScore: number = 0;
    private comboMasterExtraTime: number = 0;

    constructor(core: GameCore) {
        this.core = core;
        this.stats = this._getInitialStats();
    }

    private _getInitialStats(): GameStats {
        return {
            score: 0, rows: 0, level: 0, time: 0,
            movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, tspinsAchieved: 0, combosAchieved: 0,
            currentB2BChain: 0, maxB2BChain: 0, bossHp: 0,
            isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
            wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
            flippedGravityActive: false, flippedGravityTimer: 0,
            focusGauge: 0, isZoneActive: false, zoneTimer: 0, zoneLines: 0,
            colorStreak: 0, lastClearColor: undefined,
            colorClears: {},
            scoreMultiplierActive: false,
            scoreMultiplierTimer: 0
        };
    }

    public reset(mode: GameMode, startLevel: number): void {
        this.stats = this._getInitialStats();
        this.comboMasterExtraTime = 0;
        
        if (mode === 'TIME_ATTACK') {
            this.stats.time = 180;
        } else if (mode === 'BLITZ') {
            this.stats.time = BLITZ_DURATION_MS / 1000;
        } else if (mode === 'COMBO_MASTER') {
            this.stats.time = COMBO_MASTER_INITIAL_TIME;
        } else if (['SPRINT', 'PUZZLE', 'ADVENTURE', 'SURVIVAL'].includes(mode)) {
            this.stats.level = 0;
        } else {
            this.stats.level = startLevel;
        }

        this._resetEphemeralState();
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    private _resetEphemeralState(): void {
        this.comboCount = -1;
        this.isBackToBack = false;
        this.frenzyActive = false;
        this.frenzyTimer = 0;
        this.frenzyMultiplier = 1;
        this.blitzSpeedThresholdIndex = 0;
        this.blitzLastSpeedUpScore = 0;
        this.scoreMultiplierActive = false;
        this.scoreMultiplierTimer = 0;
        this.powerupMultiplier = 1;
        
        this.core.events.emit('COMBO_CHANGE', { combo: this.comboCount, backToBack: this.isBackToBack });
    }

    public update(deltaTime: number): void {
        if (!this.stats.isZoneActive) {
            const elapsedSecs = this.core.getElapsedGameTime() / 1000;

            if (this.core.mode === 'TIME_ATTACK' || this.core.mode === 'SPRINT' || this.core.mode === 'SURVIVAL') {
                this.stats.time = elapsedSecs;
            } else if (this.core.mode === 'BLITZ') {
                this.stats.time = Math.max(0, (BLITZ_DURATION_MS / 1000) - elapsedSecs);
                if (this.stats.time <= 0) {
                    this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 }); 
                }
            } else if (this.core.mode === 'COMBO_MASTER') {
                const remaining = (COMBO_MASTER_INITIAL_TIME + this.comboMasterExtraTime) - elapsedSecs;
                this.stats.time = Math.max(0, remaining);
                if (this.stats.time <= 0) {
                    this.core.triggerGameOver('GAMEOVER');
                }
            } else if (this.core.mode === 'ADVENTURE') {
                const adventureConfig = this.core.adventureManager.config;
                if (adventureConfig) {
                    const timeLimit = adventureConfig.constraints?.timeLimit;
                    if (timeLimit) {
                        this.stats.time = Math.max(0, timeLimit - elapsedSecs);
                    } else {
                        this.stats.time = elapsedSecs;
                    }
                }
            }
        }

        if (this.frenzyActive) {
            this.frenzyTimer -= deltaTime;
            if (this.frenzyTimer <= 0) {
                this._deactivateFrenzy();
            } else {
                this.stats.frenzyTimer = this.frenzyTimer;
            }
        }

        if (this.scoreMultiplierActive) {
            this.scoreMultiplierTimer -= deltaTime;
            if (this.scoreMultiplierTimer <= 0) {
                this._deactivateScoreMultiplier();
            } else {
                this.stats.scoreMultiplierTimer = this.scoreMultiplierTimer;
            }
        }
        
        if (this.stats.isZoneActive) {
            this.stats.zoneTimer -= deltaTime;
            if (this.stats.zoneTimer <= 0) {
                this.deactivateZone();
            }
        }
        
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    public activateScoreMultiplier(duration: number): void {
        this.scoreMultiplierActive = true;
        this.scoreMultiplierTimer = duration;
        this.powerupMultiplier = 2; 
        this.stats.scoreMultiplierActive = true;
        this.stats.scoreMultiplierTimer = duration;
        this.core.addFloatingText("DOUBLE SCORE!", "#ffd700", 0.9, 'powerup');
        this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: '#ffd700', duration: 300 } });
    }

    private _deactivateScoreMultiplier(): void {
        this.scoreMultiplierActive = false;
        this.powerupMultiplier = 1;
        this.stats.scoreMultiplierActive = false;
        this.core.addFloatingText("MULTIPLIER END", "#888888", 0.6);
    }

    public handleLineClear(rowsCleared: number, isTSpinDetected: boolean, monoClearCount: number = 0, monoColor?: string, alternatingClearCount: number = 0): ScoreResult {
        this.comboCount += 1;
        this.stats.combosAchieved = Math.max(this.stats.combosAchieved || 0, this.comboCount + 1);
        
        const result = calculateScore(rowsCleared, this.stats.level, isTSpinDetected, this.isBackToBack, this.comboCount);

        if (this.stats.isZoneActive) {
            this.stats.zoneLines += rowsCleared;
            if (rowsCleared > 0) {
                this.core.events.emit('VISUAL_EFFECT', { type: 'ZONE_CLEAR' });
                this.core.events.emit('AUDIO', { event: 'ZONE_CLEAR' });
            }
            result.score = 0; 
            result.text = rowsCleared > 0 ? `ZONED ${rowsCleared}` : ''; 
        } else {
            if (rowsCleared > 0 && this.stats.focusGauge < FOCUS_GAUGE_MAX) {
                let gaugeGain = rowsCleared * FOCUS_GAUGE_PER_LINE;
                if (this.comboCount > 0) gaugeGain += this.comboCount * 1.5; 
                if (result.isBackToBack) gaugeGain += 5;

                const oldGauge = this.stats.focusGauge;
                this.stats.focusGauge = Math.min(FOCUS_GAUGE_MAX, this.stats.focusGauge + gaugeGain);

                if (oldGauge < FOCUS_GAUGE_MAX && this.stats.focusGauge >= FOCUS_GAUGE_MAX) {
                    this.core.addFloatingText("ZONE READY", "#ffd700", 1.2, 'powerup');
                    this.core.events.emit('AUDIO', { event: 'UI_SELECT' });
                    this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: '#ffd700', duration: 300 } });
                }
            }
        }

        if (audioManager.isOnBeat() && !this.stats.isZoneActive) {
            const rhythmBonus = 200 * (rowsCleared + 1);
            result.score += rhythmBonus;
            this.core.addFloatingText("RHYTHM!", "#a78bfa", 0.7, 'rhythm');
            this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: '#a78bfa', duration: 150 } });
        }

        if (monoClearCount > 0 && monoColor && !this.stats.isZoneActive) {
            if (this.stats.lastClearColor === monoColor) {
                this.stats.colorStreak = (this.stats.colorStreak || 0) + monoClearCount;
            } else {
                this.stats.colorStreak = monoClearCount;
                this.stats.lastClearColor = monoColor;
            }
            
            if (!this.stats.colorClears) this.stats.colorClears = {};
            this.stats.colorClears[monoColor] = (this.stats.colorClears[monoColor] || 0) + monoClearCount;

            const streakMult = Math.min(10, this.stats.colorStreak || 1);
            const bonus = SCORES.MONO_COLOR_BONUS * monoClearCount * streakMult;
            
            result.score += bonus;
            result.text = `COLOR MATCH x${this.stats.colorStreak}`;
            this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { color: monoColor } });
        } else if (!this.stats.isZoneActive) {
            this.stats.colorStreak = 0;
            this.stats.lastClearColor = undefined;
        }

        if (alternatingClearCount > 0 && !this.stats.isZoneActive) {
            result.score += SCORES.PATTERN_BONUS * alternatingClearCount;
            result.text = `PATTERN CLEAR!`;
            this.core.addFloatingText("GARBAGE REDUCED", "#4ade80", 0.6);
            
            if (this.core.boardManager.garbagePending > 0) {
                const reduced = Math.min(this.core.boardManager.garbagePending, alternatingClearCount * 2);
                this.core.boardManager.addGarbage(-reduced);
            }
            
            this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: '#fcd34d', duration: 200 } });
        }

        if (result.isBackToBack && rowsCleared > 0) {
            if (this.isBackToBack) this.stats.currentB2BChain = (this.stats.currentB2BChain || 0) + 1;
            else this.stats.currentB2BChain = 1;
        } else if (!result.isBackToBack) {
            this.stats.currentB2BChain = 0;
        }
        
        this.stats.maxB2BChain = Math.max(this.stats.maxB2BChain || 0, this.stats.currentB2BChain || 0);
        this.isBackToBack = result.isBackToBack;

        if (rowsCleared === 4) this.stats.tetrisesAchieved = (this.stats.tetrisesAchieved || 0) + 1;
        if (isTSpinDetected) this.stats.tspinsAchieved = (this.stats.tspinsAchieved || 0) + 1;
        
        if (rowsCleared >= 4) {
             this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { color: '#06b6d4' } });
        }
        
        if (isTSpinDetected && rowsCleared > 0) {
             const { x, y } = this.core.pieceManager.player.pos;
             this.core.events.emit('VISUAL_EFFECT', { 
                 type: 'TSPIN_CLEAR', 
                 payload: { x: x + 1, y: y + 1, color: '#d946ef' } 
             });
        }

        if (this.comboCount === 4) {
            this.core.pieceManager.injectRewardPiece('D2'); 
        } else if (this.comboCount === 6) {
            this.core.pieceManager.injectRewardPiece('T3'); 
        } else if (this.comboCount === 8) {
            this.core.pieceManager.injectRewardPiece('M1'); 
        }
        
        if (this.stats.currentB2BChain === 2 && result.isBackToBack) {
            this.core.pieceManager.injectRewardPiece('P5'); 
        }

        this.core.events.emit('COMBO_CHANGE', { combo: this.comboCount, backToBack: this.isBackToBack });
        
        if (!this.stats.isZoneActive) {
            this.applyScore(result.score);
        }
        
        this._handleLevelProgression(rowsCleared);
        
        if (this.comboCount >= FRENZY_COMBO_THRESHOLD && !this.stats.isZoneActive) {
            this._activateFrenzy();
        }

        if (this.core.mode === 'COMBO_MASTER' && rowsCleared > 0) {
            const bonus = COMBO_MASTER_TIME_BONUS_BASE + (this.comboCount * COMBO_MASTER_TIME_BONUS_MULTIPLIER);
            this.comboMasterExtraTime += bonus; 
            this.core.addFloatingText(`+${bonus.toFixed(1)}s`, '#4ade80');
        }

        this.checkAchievements(rowsCleared, isTSpinDetected);

        return result;
    }

    private checkAchievements(rowsCleared: number, isTSpin: boolean): void {
        const { stats } = this;
        const unlock = (id: string) => {
            if (useProfileStore.getState().unlockAchievement(id)) {
                this.core.events.emit('ACHIEVEMENT_UNLOCKED', id);
            }
        };

        if (stats.rows >= 1) unlock('FIRST_DROP');
        if (rowsCleared === 4) unlock('TETRIS');
        if (this.comboCount >= 5) unlock('COMBO_5');
        if (stats.score >= 100000) unlock('SCORE_100K');
        if (stats.score >= 500000) unlock('SCORE_500K');
        if (stats.level >= 10) unlock('LEVEL_10');
        if (stats.isZoneActive && stats.zoneLines >= 8) unlock('ZONE_CLEAR_8');
        if (isTSpin && rowsCleared === 2) unlock('TSPIN_DOUBLE');
        if (this.isBackToBack && rowsCleared === 4) unlock('B2B_TETRIS');
        if (this.core.mode === 'BLITZ' && this.blitzSpeedThresholdIndex >= BLITZ_SPEED_THRESHOLDS.length) unlock('BLITZ_SPEED');
        if (this.core.boardManager.isBoardEmpty()) unlock('ALL_CLEAR');
    }

    public tryActivateZone(): void {
        if (!this.stats.isZoneActive && this.stats.focusGauge >= FOCUS_GAUGE_MAX) {
            this.activateZone();
        }
    }

    private activateZone(): void {
        this.stats.isZoneActive = true;
        this.stats.zoneTimer = ZONE_DURATION_MS;
        this.stats.zoneLines = 0;
        this.core.events.emit('VISUAL_EFFECT', { type: 'ZONE_START' });
        this.core.addFloatingText("HYPER FOCUS", "#ffffff", 1.0, 'zone');
        this.core.events.emit('AUDIO', { event: 'ZONE_START' });
    }

    private deactivateZone(): void {
        if (!this.stats.isZoneActive) return;
        
        this.stats.isZoneActive = false;
        
        const clearedLines = this.core.boardManager.endZone();
        
        const multiplier = 1 + Math.floor(clearedLines / 4);
        const bonus = clearedLines * SCORES.ZONE_CLEAR_BONUS * (this.stats.level + 1) * multiplier;
        
        if (bonus > 0) {
            this.applyScore(bonus);
            
            let text = "ZONE CLEAR";
            if (clearedLines >= 8) text = "OCTORIS!";
            if (clearedLines >= 12) text = "DODECATRIS!";
            if (clearedLines >= 16) text = "DECAHEX!";
            
            this.core.addFloatingText(`${text} +${bonus}`, "#ffd700", 1.5, 'zone');
            this.core.events.emit('VISUAL_EFFECT', { type: 'PARTICLE', payload: { isExplosion: true, x: 5, y: 10, amount: 100 + (clearedLines * 10), color: 'gold' } });
            this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { color: 'gold' } });
            this.checkAchievements(0, false); 
        } else {
            this.core.addFloatingText("ZONE END", "#888888", 0.8);
        }
        
        this.stats.focusGauge = 0;
        this.stats.zoneLines = 0;
        this.core.events.emit('VISUAL_EFFECT', { type: 'ZONE_END' });
        this.core.events.emit('AUDIO', { event: 'ZONE_END' });
        
        this.core.boardManager.processGarbage();
    }

    public resetCombo(): void {
        this.comboCount = -1;
        this.core.events.emit('COMBO_CHANGE', { combo: this.comboCount, backToBack: this.isBackToBack });
    }

    public applyScore(amount: number): void {
        if (this.core.mode !== 'ZEN' && this.core.mode !== 'PUZZLE') {
            this.stats.score += amount * this.frenzyMultiplier * this.powerupMultiplier;
        }
        this.core.adventureManager.applyBossDamage(amount);

        if (this.core.mode === 'BLITZ') {
            this._checkBlitzSpeedUp();
        }
        
        this.checkAchievements(0, false);
        
        this.core.events.emit('STATS_CHANGE', this.stats);
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
            this.core.events.emit('VISUAL_EFFECT', { type: 'FRENZY_START' });
            this.core.addFloatingText('FRENZY!', '#ffd700', 0.9, 'frenzy');
            this.core.events.emit('AUDIO', { event: 'FRENZY_START' });
            this.checkAchievements(0, false); 
        }
        this.frenzyTimer = Math.max(this.frenzyTimer, FRENZY_DURATION_MS);
        this.stats.isFrenzyActive = true;
        this.stats.frenzyTimer = this.frenzyTimer;
    }

    private _deactivateFrenzy(): void {
        if (this.frenzyActive) {
            this.frenzyActive = false;
            this.frenzyMultiplier = 1;
            this.core.events.emit('VISUAL_EFFECT', { type: 'FRENZY_END' });
            this.core.addFloatingText('FRENZY END', '#888888', 0.6, 'frenzy');
            this.stats.isFrenzyActive = false;
            this.stats.frenzyTimer = 0;
            this.core.events.emit('AUDIO', { event: 'FRENZY_END' });
        }
    }

    private _checkBlitzSpeedUp(): void {
        const currentScore = this.stats.score;
        if (this.blitzSpeedThresholdIndex < BLITZ_SPEED_THRESHOLDS.length) {
            const nextThreshold = BLITZ_SPEED_THRESHOLDS[this.blitzSpeedThresholdIndex];
            if (currentScore >= nextThreshold.score && currentScore > this.blitzLastSpeedUpScore) {
                this.core.pieceManager.dropTime *= nextThreshold.speedFactor;
                this.core.addFloatingText(nextThreshold.message, '#ffa500', 0.9, 'frenzy');
                this.core.events.emit('BLITZ_SPEED_UP', this.blitzSpeedThresholdIndex);
                this.core.events.emit('AUDIO', { event: 'BLITZ_SPEEDUP' });
                this.blitzLastSpeedUpScore = currentScore;
                this.blitzSpeedThresholdIndex++;
                this.checkAchievements(0, false);
            }
        }
    }

    private _handleLevelProgression(rowsCleared: number): void {
        this.stats.rows += rowsCleared;
        
        if (this.core.mode === 'MARATHON' || this.core.mode === 'SURVIVAL' || this.core.mode === 'COMBO_MASTER') {
            const newLevel: number = Math.floor(this.stats.rows / 10);
            if (newLevel > this.stats.level) {
                this.core.handleLevelUp(newLevel);
                this.checkAchievements(0, false); 
            }
        } else if (this.core.mode === 'SPRINT') {
            if (this.stats.rows >= 40) {
                this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
            }
        }
    }
}


import type { GameCore } from './GameCore';
import { GameStats, GameMode, ScoreResult, LevelRewards, TetrominoType } from '../types';
import { SCORES, FRENZY_DURATION_MS, FRENZY_COMBO_THRESHOLD, BLITZ_DURATION_MS, BLITZ_SPEED_THRESHOLDS, LEVEL_PASS_COIN_REWARD, COMBO_MASTER_INITIAL_TIME, COMBO_MASTER_TIME_BONUS_BASE, COMBO_MASTER_TIME_BONUS_MULTIPLIER, FOCUS_GAUGE_PER_LINE, FOCUS_GAUGE_MAX, ZONE_DURATION_MS, ACHIEVEMENTS, DIFFICULTY_SETTINGS, STAR_COIN_BONUS, MOMENTUM_GAINS, MOMENTUM_MAX, MOMENTUM_DECAY_PER_SEC, OVERDRIVE_DURATION_MS, OVERDRIVE_SCORE_MULTIPLIER } from '../constants';
import { calculateScore } from './scoreRules';
import { useProfileStore } from '../stores/profileStore';
import { audioManager } from './audioManager';
import { replayManager } from './ReplayManager';

const HYPE_PHRASES = {
    SINGLE: ['MID', 'NPC ENERGY', 'BASIC', 'MEH', 'LOW KEY', 'OK I GUESS'],
    DOUBLE: ['BET', 'VALID', 'W', 'NO CAP', 'COOKING', 'SOLID'],
    TRIPLE: ['SHEESH', 'POP OFF', 'HIM', 'ON GOD', 'ATE THAT', 'CRACKED'],
    TETRIS: ['MAIN CHARACTER', 'ABSOLUTE CINEMA', 'EMOTIONAL DAMAGE', 'SLAY', 'GOATED', 'BUILT DIFFERENT'],
    TSPIN: ['AURA +9999', 'BIG BRAIN', '5HEAD', 'GIGACHAD', 'TECHNIQUE', 'CALCULATED'],
    COMBO: ['UNSTOPPABLE', 'GOD MODE', 'LUDICROUS', 'SAVAGE', 'RIZZ GOD', 'INFINITE AURA']
};

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
            movesTaken: 0, gemsCollected: 0, bombsDefused: 0, tetrisesAchieved: 0, combosAchieved: 0,
            currentB2BChain: 0, maxB2BChain: 0, b2bMultiplier: 1, bossHp: 0,
            isFrenzyActive: false, frenzyTimer: 0, slowTimeActive: false, slowTimeTimer: 0,
            wildcardAvailable: false, bombBoosterReady: false, lineClearerActive: false,
            flippedGravityActive: false, flippedGravityTimer: 0,
            focusGauge: 0, isZoneActive: false, zoneTimer: 0, zoneLines: 0,
            perfectDropStreak: 0,
            momentum: 0, isOverdriveActive: false, overdriveTimer: 0,
            holdCharge: 0, holdDecay: 0, isFinisherReady: false
        };
    }

    public reset(mode: GameMode, startLevel: number): void {
        this.stats = this._getInitialStats();
        this.comboMasterExtraTime = 0;
        this._initModeDefaults(mode, startLevel);
        this._resetEphemeralState();
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    private _initModeDefaults(mode: GameMode, startLevel: number): void {
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

    // --- MAIN UPDATE LOOP ---

    public update(deltaTime: number): void {
        this._updateTimers(deltaTime);
        this._updateModeSpecifics();
        
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    private _updateTimers(deltaTime: number): void {
        // Frenzy Timer
        if (this.frenzyActive) {
            this.frenzyTimer -= deltaTime;
            if (this.frenzyTimer <= 0) this._deactivateFrenzy();
            else this.stats.frenzyTimer = this.frenzyTimer;
        }

        // Multiplier Timer
        if (this.scoreMultiplierActive) {
            this.scoreMultiplierTimer -= deltaTime;
            if (this.scoreMultiplierTimer <= 0) this._deactivateScoreMultiplier();
            else this.stats.scoreMultiplierTimer = this.scoreMultiplierTimer;
        }
        
        // Zone Timer
        if (this.stats.isZoneActive) {
            this.stats.zoneTimer -= deltaTime;
            if (this.stats.zoneTimer <= 0) this.deactivateZone();
        }

        // Momentum / Overdrive Decay
        if (this.stats.isOverdriveActive) {
            this.stats.overdriveTimer -= deltaTime;
            if (this.stats.overdriveTimer <= 0) this._endOverdrive();
        } else if (this.stats.momentum > 0) {
            this.stats.momentum = Math.max(0, this.stats.momentum - (MOMENTUM_DECAY_PER_SEC * deltaTime) / 1000);
        }
    }

    private _updateModeSpecifics(): void {
        // Stop timer updates if in Zone
        if (this.stats.isZoneActive) return;

        const elapsedSecs = this.core.getElapsedGameTime() / 1000;
        const mode = this.core.mode;

        if (mode === 'TIME_ATTACK' || mode === 'SPRINT' || mode === 'SURVIVAL') {
            this.stats.time = elapsedSecs;
        } else if (mode === 'BLITZ') {
            this.stats.time = Math.max(0, (BLITZ_DURATION_MS / 1000) - elapsedSecs);
            if (this.stats.time <= 0) this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 }); 
        } else if (mode === 'COMBO_MASTER') {
            const remaining = (COMBO_MASTER_INITIAL_TIME + this.comboMasterExtraTime) - elapsedSecs;
            this.stats.time = Math.max(0, remaining);
            if (this.stats.time <= 0) this.core.triggerGameOver('GAMEOVER');
        } else if (mode === 'ADVENTURE') {
            const config = this.core.adventureManager.config;
            if (config?.constraints?.timeLimit) {
                this.stats.time = Math.max(0, config.constraints.timeLimit - elapsedSecs);
            } else {
                this.stats.time = elapsedSecs;
            }
        }
    }

    // --- CLEAR HANDLING ---

    public handleClearEffects(payload: any) {
        const { linesCleared, isTSpin, isBackToBack, combo, text } = payload;
        
        this._syncClearStats(payload);
        
        if (linesCleared > 0) {
            this._processMomentum(linesCleared, isTSpin, isBackToBack);
            this._processGauge(linesCleared, isTSpin, isBackToBack);
        }

        if (this.comboCount >= FRENZY_COMBO_THRESHOLD && !this.stats.isZoneActive) {
            this._activateFrenzy();
        }

        this._processHypeText(linesCleared, isTSpin, isBackToBack, text);
        this.checkAchievements(linesCleared, isTSpin);
        
        if (this.core.mode === 'BLITZ') this._checkBlitzSpeedUp();
        
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    private _syncClearStats(payload: any): void {
        this.comboCount = payload.combo - 1; // Pure logic sends N+1
        this.isBackToBack = payload.isBackToBack;
        
        this.stats.combosAchieved = Math.max(this.stats.combosAchieved || 0, payload.combo);
        if (payload.linesCleared === 4) this.stats.tetrisesAchieved = (this.stats.tetrisesAchieved || 0) + 1;
        if (payload.isTSpin) this.stats.tspinsAchieved = (this.stats.tspinsAchieved || 0) + 1;
    }

    private _processMomentum(lines: number, isTSpin: boolean, isB2B: boolean): void {
        let mGain = lines * MOMENTUM_GAINS.LINE;
        if (lines >= 4) mGain += MOMENTUM_GAINS.TETRIS;
        if (isTSpin) mGain += MOMENTUM_GAINS.TSPIN;
        if (isB2B) mGain += MOMENTUM_GAINS.B2B;
        if (this.comboCount > 0) mGain += MOMENTUM_GAINS.COMBO;
        this.addMomentum(mGain);
    }

    private _processGauge(lines: number, isTSpin: boolean, isB2B: boolean): void {
        if (this.stats.isZoneActive) {
            this.stats.zoneLines += lines;
        } else {
            if (this.stats.focusGauge < FOCUS_GAUGE_MAX) {
                let gaugeGain = lines * FOCUS_GAUGE_PER_LINE;
                if (this.comboCount > 0) gaugeGain += this.comboCount * 1.5; 
                if (isB2B) gaugeGain += 5;
                this.stats.focusGauge = Math.min(FOCUS_GAUGE_MAX, this.stats.focusGauge + gaugeGain);
            }
        }
    }

    private _processHypeText(lines: number, isTSpin: boolean, isB2B: boolean, baseText: string): void {
        if (baseText) {
            let hypeText = baseText;
            if (lines === 4) hypeText = this._getHypeText('TETRIS');
            else if (isTSpin) hypeText = this._getHypeText('TSPIN');
            else if (lines === 3) hypeText = this._getHypeText('TRIPLE');
            else if (lines === 2) hypeText = this._getHypeText('DOUBLE');
            else if (lines === 1) hypeText = this._getHypeText('SINGLE');
            
            if (this.comboCount > 5) hypeText = this._getHypeText('COMBO');
            if (isB2B && lines > 0) hypeText = `B2B ${hypeText}`;

            this.core.addFloatingText(hypeText, "#ffffff", lines > 2 ? 1.0 : 0.6);
        }
    }

    // --- ZONE MECHANICS ---

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
        this.core.addFloatingText("MAIN CHARACTER MODE", "#ffffff", 1.0, 'zone');
        this.core.events.emit('AUDIO', { event: 'ZONE_START' });
        this.core.boosterManager.activateTimeFreeze(ZONE_DURATION_MS);
    }

    private deactivateZone(): void {
        if (!this.stats.isZoneActive) return;
        this.stats.isZoneActive = false;
        
        const clearedLines = this.stats.zoneLines;
        const multiplier = 2 + Math.floor(clearedLines / 4);
        const bonus = clearedLines * SCORES.ZONE_CLEAR_BONUS * (this.stats.level + 1) * multiplier;
        
        if (bonus > 0) {
            this.applyScore(bonus);
            let text = "ZONE CLEAR";
            if (clearedLines >= 8) text = "OCTORIS!";
            if (clearedLines >= 12) text = "DODECATRIS!";
            
            this.core.addFloatingText(`${text} +${bonus}`, "#ffd700", 1.5, 'zone');
            this.core.events.emit('VISUAL_EFFECT', { type: 'PARTICLE', payload: { isExplosion: true, x: 5, y: 10, amount: 100, color: 'gold' } });
            this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { color: 'gold' } });
        } else {
            this.core.addFloatingText("ZONE END", "#888888", 0.8);
        }
        
        this.stats.focusGauge = 0;
        this.stats.zoneLines = 0;
        this.core.events.emit('VISUAL_EFFECT', { type: 'ZONE_END' });
        this.core.events.emit('AUDIO', { event: 'ZONE_END' });
        
        this.core.boosterManager.timeFreezeActive = false;
        this.core.boosterManager.timeFreezeTimer = 0;
        this.core.boardManager.processGarbage();
    }

    // --- OVERDRIVE MECHANICS ---

    private addMomentum(amount: number): void {
        if (this.stats.isOverdriveActive || this.stats.isZoneActive) return;
        this.stats.momentum = Math.min(MOMENTUM_MAX, this.stats.momentum + amount);
        if (this.stats.momentum >= MOMENTUM_MAX) this._startOverdrive();
    }

    private _startOverdrive(): void {
        this.stats.isOverdriveActive = true;
        this.stats.overdriveTimer = OVERDRIVE_DURATION_MS;
        this.core.addFloatingText("OVERDRIVE!!!", "#f97316", 1.2, 'frenzy');
        this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: '#f97316', duration: 500 } });
        this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { size: 500, color: '#f97316' } });
        this.core.events.emit('AUDIO', { event: 'OVERDRIVE_START' });
        this.core.pieceManager.dropTime *= 1.2; 
    }

    private _endOverdrive(): void {
        this.stats.isOverdriveActive = false;
        this.stats.momentum = 0;
        this.core.addFloatingText("SYSTEM COOLED", "#888888", 0.7);
        this.core.events.emit('AUDIO', { event: 'OVERDRIVE_END' });
        this.core.updateSpeed();
    }

    // --- HELPERS ---

    public applyScore(amount: number): void {
        if (this.core.mode !== 'ZEN' && this.core.mode !== 'PUZZLE') {
            const diffMult = DIFFICULTY_SETTINGS[this.core.difficulty]?.scoreMult || 1.0;
            const overdriveMult = this.stats.isOverdriveActive ? OVERDRIVE_SCORE_MULTIPLIER : 1;
            this.stats.score += amount * this.frenzyMultiplier * this.powerupMultiplier * diffMult * overdriveMult;
        }
        this.core.adventureManager.applyBossDamage(amount);
        if (this.core.mode === 'BLITZ') this._checkBlitzSpeedUp();
        this.core.events.emit('STATS_CHANGE', this.stats);
    }

    private _activateFrenzy(): void {
        if (!this.frenzyActive) {
            this.frenzyActive = true;
            this.frenzyMultiplier = SCORES.FRENZY_MULTIPLIER;
            this.core.events.emit('VISUAL_EFFECT', { type: 'FRENZY_START' });
            this.core.addFloatingText('FRENZY!', '#ffd700', 0.9, 'frenzy');
            this.core.events.emit('AUDIO', { event: 'FRENZY_START' });
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
            }
        }
    }

    private _deactivateScoreMultiplier(): void {
        this.scoreMultiplierActive = false;
        this.powerupMultiplier = 1;
        this.stats.scoreMultiplierActive = false;
        this.core.addFloatingText("MULTIPLIER END", "#888888", 0.6);
    }

    private _getHypeText(type: keyof typeof HYPE_PHRASES): string {
        const phrases = HYPE_PHRASES[type];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    public calculateLevelRewards(gameState: 'VICTORY' | 'GAMEOVER'): LevelRewards {
        const mode = this.core.mode;
        const isVictory = gameState === 'VICTORY';
        if (replayManager.isReplaying) return { coins: 0, stars: 0 };

        let earnedCoins = 0;
        let stars = 0;
        let boosterRewards = undefined;

        if (mode === 'ADVENTURE') {
            const config = this.core.adventureManager.config;
            if (isVictory && config) {
                stars = 1;
                if (config.objective.type === 'SCORE') {
                    if (this.stats.score >= config.objective.target * 1.5) stars++;
                    if (this.stats.score >= config.objective.target * 2.0) stars++;
                } else {
                    if ((this.stats.tetrisesAchieved || 0) > 0) stars++;
                    else if ((this.stats.tspinsAchieved || 0) > 0) stars++;
                    
                    if (config.constraints?.timeLimit) {
                        const timeUsed = config.constraints.timeLimit - this.stats.time;
                        if (timeUsed < config.constraints.timeLimit * 0.6) stars++; 
                    } else if (config.constraints?.movesLimit) {
                        if ((this.stats.movesTaken || 0) < config.constraints.movesLimit * 0.7) stars++;
                    } else {
                        if ((this.stats.maxB2BChain || 0) >= 2) stars++;
                    }
                }
                stars = Math.min(3, stars);
                earnedCoins = LEVEL_PASS_COIN_REWARD + (stars * STAR_COIN_BONUS) + (config.rewards?.coins || 0);
                boosterRewards = config.rewards?.boosters || [];
            }
        } else {
            if (mode === 'BLITZ') earnedCoins = Math.floor(this.stats.score / 500); 
            else if (mode !== 'ZEN' && mode !== 'PUZZLE') earnedCoins = Math.floor(this.stats.score / 100);
            if (isVictory) {
                earnedCoins += LEVEL_PASS_COIN_REWARD;
                stars = 3;
            }
        }
        return { coins: earnedCoins, stars, boosterRewards };
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
    
    // Stub for legacy call compatibility
    public handleLineClear(rowsCleared: number, isTSpin: boolean) {
        this.handleClearEffects({
            linesCleared: rowsCleared,
            rows: [],
            isTSpin,
            isBackToBack: this.isBackToBack,
            combo: this.comboCount + 1,
            text: '',
            scoreDelta: 0
        });
        return { score: 0, text: '', isBackToBack: this.isBackToBack, soundLevel: 0, visualShake: null };
    }
}

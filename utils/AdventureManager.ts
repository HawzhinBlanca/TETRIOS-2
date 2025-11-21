

import { GameCore } from './GameCore';
import { AdventureLevelConfig, LevelObjectiveType, GameState } from '../types';
import { STAGE_HEIGHT, LEVEL_PASS_COIN_REWARD } from '../constants';

export class AdventureManager {
    private core: GameCore;
    public config: AdventureLevelConfig | null = null;
    public bossHp: number = 0;
    public bossTimer: number = 0;
    public movesLimit: number | null = null;
    public timeLimit: number | null = null;
    public invisibleRows: number[] = [];

    constructor(core: GameCore) {
        this.core = core;
    }

    public reset(config: AdventureLevelConfig | undefined): void {
        this.config = config || null;
        this.bossHp = 0;
        this.bossTimer = 0;
        this.movesLimit = null;
        this.timeLimit = null;
        this.invisibleRows = [];

        if (this.config) {
            this._initObjectives();
            this._initConstraints();
            this._initGimmicks();
        }
    }

    private _initObjectives(): void {
        if (!this.config) return;
        
        if (this.config.objective.type === 'BOSS') {
            this.bossHp = this.config.objective.target;
            this.core.addFloatingText("BOSS BATTLE!", "#ef4444", 0.8);
        } else if (this.config.objective.type === 'TIME_SURVIVAL' && this.config.constraints?.timeLimit) {
            this.core.stats.time = this.config.constraints.timeLimit;
        }
    }

    private _initConstraints(): void {
        if (!this.config) return;

        if (this.config.constraints?.movesLimit) {
            this.movesLimit = this.config.constraints.movesLimit;
        }
        if (this.config.constraints?.timeLimit && this.config.objective.type !== 'TIME_SURVIVAL') {
            this.timeLimit = this.config.constraints.timeLimit;
            this.core.stats.time = this.timeLimit; 
        }
    }

    private _initGimmicks(): void {
        if (!this.config?.gimmicks) return;

        this.config.gimmicks.forEach(g => {
            if (g.type === 'INVISIBLE_ROWS') {
                const count = g.config?.count || 3;
                const possibleRows = Array.from({length: STAGE_HEIGHT - 4}, (_, i) => i + 4);
                for(let i=0; i<count; i++) {
                    if (possibleRows.length > 0) {
                        const idx = Math.floor(Math.random() * possibleRows.length);
                        this.invisibleRows.push(possibleRows.splice(idx, 1)[0]);
                    }
                }
            }
        });
    }

    public update(deltaTime: number): void {
        if (!this.config) return;

        // Timer updates
        if (this.config.objective.type === 'TIME_SURVIVAL' || this.config.constraints?.timeLimit) {
            this.core.stats.time = Math.max(0, this.core.stats.time - (deltaTime / 1000));
        }

        // Boss Logic
        if (this.config.boss) {
            this.bossTimer += deltaTime;
            if (this.bossTimer >= this.config.boss.interval) {
                if (this.config.boss.ability === 'GARBAGE_RAIN') {
                    this.core.garbagePending += 1;
                    this.core.callbacks.onGarbageChange(this.core.garbagePending);
                    this.core.addFloatingText('BOSS ATTACK!', '#ef4444', 0.6);
                }
                this.bossTimer = 0;
            }
        }
    }

    public checkObjectives(): void {
        if (!this.config) return;

        if (this._checkVictory()) {
            this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
            return;
        }

        if (this._checkLoss()) {
            this.core.triggerGameOver('GAMEOVER');
            return;
        }
    }

    public applyBossDamage(score: number): void {
        if (this.config?.objective.type === 'BOSS') {
            const damage = Math.floor(score / 100);
            if (damage > 0) {
                this.bossHp = Math.max(0, this.bossHp - damage);
                this.core.addFloatingText(`BOSS HIT! -${damage}HP`, '#ef4444', 0.6);
                this.core.callbacks.onAudio('BOSS_DAMAGE'); // New audio event
                if (this.bossHp <= 0) {
                    this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
                }
            }
        }
    }

    private _checkVictory(): boolean {
        if (!this.config) return false;
        const objective = this.config.objective;
        const stats = this.core.stats;

        switch (objective.type) {
            case 'LINES': return stats.rows >= objective.target;
            case 'SCORE': return stats.score >= objective.target;
            case 'TIME_SURVIVAL': return (stats.time || 0) <= 0;
            case 'GEMS': return (stats.gemsCollected || 0) >= objective.target;
            case 'BOMBS': return (stats.bombsDefused || 0) >= objective.target;
            case 'TETRIS': return (stats.tetrisesAchieved || 0) >= objective.target;
            case 'COMBO': return (stats.combosAchieved || 0) >= objective.target;
            case 'MOVES': return (stats.movesTaken || 0) >= objective.target;
            case 'BOSS': return this.bossHp <= 0;
            default: return false;
        }
    }

    private _checkLoss(): boolean {
        if (!this.config) return false;
        
        // Move Limit
        if (this.movesLimit && (this.core.stats.movesTaken || 0) >= this.movesLimit) {
            return true;
        }
        
        // Time Limit (Non-Survival)
        if (this.timeLimit && this.config.objective.type !== 'TIME_SURVIVAL' && (this.core.stats.time || 0) <= 0) {
            return true;
        }

        // Bomb Explosion
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            // Accessing core stage safely
            // We assume stage width is constant 10
            for (let x = 0; x < 10; x++) { 
                const cell = this.core.stage[y][x];
                if (cell[2]?.type === 'BOMB' && (cell[2]?.timer || 0) <= 0) {
                    this.core.callbacks.onVisualEffect({type: 'SHAKE', payload: 'hard'});
                    this.core.callbacks.onVisualEffect({type: 'FLASH', payload: { color: 'red', duration: 400 }});
                    this.core.addFloatingText('BOMB EXPLODED!', '#ef4444', 0.8, 'bomb');
                    this.core.callbacks.onAudio('NUKE_CLEAR');
                    return true;
                }
            }
        }

        return false;
    }
}
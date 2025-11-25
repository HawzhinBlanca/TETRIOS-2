
import type { GameCore } from './GameCore';
import { AdventureLevelConfig } from '../types';
import { STAGE_HEIGHT, LEVEL_PASS_COIN_REWARD, STAGE_WIDTH, MODIFIER_COLORS } from '../constants';

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
            // Target is HP for Boss mode
            this.bossHp = this.config.objective.target;
            this.core.scoreManager.stats.bossHp = this.bossHp; 
            this.core.addFloatingText("BOSS BATTLE!", "#ef4444", 0.8);
        } else if (this.config.objective.type === 'TIME_SURVIVAL' && this.config.constraints?.timeLimit) {
            this.core.scoreManager.stats.time = this.config.constraints.timeLimit;
        }
    }

    private _initConstraints(): void {
        if (!this.config) return;

        if (this.config.constraints?.movesLimit) {
            this.movesLimit = this.config.constraints.movesLimit;
        }
        if (this.config.constraints?.timeLimit && this.config.objective.type !== 'TIME_SURVIVAL') {
            this.timeLimit = this.config.constraints.timeLimit;
            this.core.scoreManager.stats.time = this.timeLimit; 
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

        // Boss Logic
        if (this.config.boss) {
            this.bossTimer += deltaTime;
            if (this.bossTimer >= this.config.boss.interval) {
                if (this.config.boss.ability === 'GARBAGE_RAIN') {
                    this.core.boardManager.addGarbage(1);
                    this.core.addFloatingText('BOSS ATTACK!', '#ef4444', 0.6);
                    this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
                } else if (this.config.boss.ability === 'SPEED_SURGE') {
                    // Temporary speed up for 5 seconds
                    const originalDropTime = this.core.pieceManager.dropTime;
                    this.core.pieceManager.dropTime = Math.max(50, originalDropTime * 0.5);
                    this.core.addFloatingText('SPEED SURGE!', '#d946ef', 0.7);
                    setTimeout(() => {
                        this.core.pieceManager.dropTime = originalDropTime;
                    }, 5000);
                }
                this.bossTimer = 0;
            }
        }
    }

    public checkObjectives(): void {
        if (!this.config) return;

        this._handleBombExplosions();

        if (this._checkVictory()) {
            this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
            return;
        }

        if (this._checkLoss()) {
            this.core.triggerGameOver('GAMEOVER');
            return;
        }
    }

    private _handleBombExplosions(): void {
        let bombsExploded = 0;
        
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            for (let x = 0; x < STAGE_WIDTH; x++) { 
                const cell = this.core.boardManager.stage[y][x];
                if (cell[2]?.type === 'BOMB' && (cell[2]?.timer || 0) <= 0) {
                    cell[2] = undefined; 
                    bombsExploded++;
                    this.core.callbacks.onVisualEffect({ type: 'PARTICLE', payload: { x, y, color: MODIFIER_COLORS.BOMB, amount: 20, isExplosion: true } });
                }
            }
        }

        if (bombsExploded > 0) {
            const penaltyLines = bombsExploded * 5; 
            this.core.boardManager.addGarbage(penaltyLines);
            
            this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
            this.core.callbacks.onVisualEffect({ type: 'FLASH', payload: { color: 'red', duration: 500 } });
            this.core.callbacks.onAudio('NUKE_CLEAR'); 
            
            this.core.addFloatingText(`EXPLOSION! +${penaltyLines} LINES`, '#ef4444', 1.0, 'bomb');
        }
    }

    public applyBossDamage(score: number): void {
        if (this.config?.objective.type === 'BOSS') {
            // Balance: 100 score = 1 damage. Tetris (800) = 8 damage.
            const damage = Math.floor(score / 100);
            if (damage > 0) {
                this.bossHp = Math.max(0, this.bossHp - damage);
                this.core.scoreManager.stats.bossHp = this.bossHp; 
                this.core.addFloatingText(`BOSS HIT! -${damage}HP`, '#ef4444', 0.6);
                this.core.callbacks.onAudio('BOSS_DAMAGE'); 
                
                // Visual feedback on boss damage
                this.core.callbacks.onVisualEffect({ type: 'SHOCKWAVE', payload: { color: '#ef4444' } });

                if (this.bossHp <= 0) {
                    this.core.triggerGameOver('VICTORY', { coins: LEVEL_PASS_COIN_REWARD, stars: 3 });
                }
            }
        }
    }

    private _checkVictory(): boolean {
        if (!this.config) return false;
        const objective = this.config.objective;
        const stats = this.core.scoreManager.stats;

        switch (objective.type) {
            case 'LINES': return stats.rows >= objective.target;
            case 'SCORE': return stats.score >= objective.target;
            case 'TIME_SURVIVAL': return (stats.time || 0) <= 0;
            case 'GEMS': return (stats.gemsCollected || 0) >= objective.target;
            case 'BOMBS': return (stats.bombsDefused || 0) >= objective.target;
            case 'TETRIS': return (stats.tetrisesAchieved || 0) >= objective.target;
            case 'TSPIN': return (stats.tspinsAchieved || 0) >= objective.target;
            case 'COMBO': return (stats.combosAchieved || 0) >= objective.target;
            case 'B2B_CHAIN': return (stats.maxB2BChain || 0) >= objective.target;
            case 'MOVES': return (stats.movesTaken || 0) >= objective.target;
            case 'BOSS': return this.bossHp <= 0;
            case 'COLOR_MATCH': {
                if (!objective.targetColor) return false;
                // Check tracked clears for specific color
                const currentClears = stats.colorClears ? (stats.colorClears[objective.targetColor] || 0) : 0;
                return currentClears >= objective.target;
            }
            default: return false;
        }
    }

    private _checkLoss(): boolean {
        if (!this.config) return false;
        
        if (this.movesLimit && (this.core.scoreManager.stats.movesTaken || 0) >= this.movesLimit) {
            return true;
        }
        
        if (this.timeLimit && this.config.objective.type !== 'TIME_SURVIVAL' && (this.core.scoreManager.stats.time || 0) <= 0) {
            return true;
        }

        return false;
    }
}

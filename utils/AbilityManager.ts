

import type { GameCore } from './GameCore';
import { AbilityType, AbilityState } from '../types';
import { ABILITIES, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

export class AbilityManager {
    private core: GameCore;
    public abilities: AbilityState[] = [];

    constructor(core: GameCore) {
        this.core = core;
    }

    public initialize(loadout: AbilityType[]): void {
        this.abilities = loadout.map(id => ({
            id,
            cooldownTimer: 0,
            isReady: true,
            totalCooldown: ABILITIES[id].cooldownMs
        }));
    }

    public update(deltaTime: number): void {
        let changed = false;
        this.abilities.forEach(ability => {
            if (ability.cooldownTimer > 0) {
                ability.cooldownTimer = Math.max(0, ability.cooldownTimer - deltaTime);
                if (ability.cooldownTimer === 0) {
                    ability.isReady = true;
                    this.core.addFloatingText(`${ABILITIES[ability.id].name} READY`, ABILITIES[ability.id].color, 0.6, 'powerup');
                    this.core.events.emit('AUDIO', { event: 'ABILITY_READY' });
                    changed = true;
                }
                changed = true;
            }
        });
        
        if (changed) {
            this.core.scoreManager.stats.abilities = [...this.abilities];
        }
    }

    public triggerAbility(slotIndex: number): void {
        if (slotIndex < 0 || slotIndex >= this.abilities.length) return;
        
        const ability = this.abilities[slotIndex];
        if (!ability.isReady) {
            this.core.events.emit('AUDIO', { event: 'UI_BACK' });
            return;
        }

        if (this.executeEffect(ability.id)) {
            ability.isReady = false;
            ability.cooldownTimer = ability.totalCooldown;
            this.core.scoreManager.stats.abilities = [...this.abilities];
            this.core.events.emit('AUDIO', { event: 'ABILITY_ACTIVATE' });
        }
    }

    private executeEffect(id: AbilityType): boolean {
        const player = this.core.pieceManager.player;
        const board = this.core.boardManager.stage;

        switch (id) {
            case 'COLOR_SWAP': {
                const centerPos = { ...player.pos };
                const color = player.tetromino.color;
                let affected = 0;

                for (let y = centerPos.y; y < centerPos.y + 3; y++) {
                    for (let x = centerPos.x; x < centerPos.x + 3; x++) {
                        if (y >= 0 && y < STAGE_HEIGHT && x >= 0 && x < STAGE_WIDTH) {
                            const cell = board[y][x];
                            if (cell[1] !== 'clear') {
                                cell[3] = color;
                                affected++;
                                this.core.events.emit('VISUAL_EFFECT', { type: 'PARTICLE', payload: { x, y, color: color, amount: 5 } });
                            }
                        }
                    }
                }
                
                this.core.addFloatingText("COLOR PULSE", color, 0.8, 'powerup');
                this.core.events.emit('VISUAL_EFFECT', { type: 'SHOCKWAVE', payload: { x: centerPos.x + 1, y: centerPos.y + 1, color } });
                return true; 
            }

            case 'COLUMN_NUKE': {
                const colX = Math.floor(player.pos.x + player.tetromino.shape[0].length / 2);
                if (colX < 0 || colX >= STAGE_WIDTH) return false;

                this.core.events.emit('VISUAL_EFFECT', { 
                    type: 'HARD_DROP_BEAM', 
                    payload: { x: colX, startY: 0, endY: STAGE_HEIGHT, color: '#ef4444' } 
                });

                let cleared = 0;
                for (let y = 0; y < STAGE_HEIGHT; y++) {
                    if (board[y][colX][1] !== 'clear') {
                        board[y][colX] = [null, 'clear'];
                        cleared++;
                    }
                }

                this.core.boardManager.revision++;
                this.core.addFloatingText("COLUMN NUKE", "#ef4444", 0.8, 'powerup');
                this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'hard' });
                return true;
            }

            case 'PIECE_SCULPT': {
                const shape = player.tetromino.shape;
                let removed = false;
                
                for (let y = shape.length - 1; y >= 0; y--) {
                    for (let x = shape[y].length - 1; x >= 0; x--) {
                        if (shape[y][x] !== 0) {
                            shape[y][x] = 0;
                            removed = true;
                            
                            const absX = player.pos.x + x;
                            const absY = player.pos.y + y;
                            this.core.events.emit('VISUAL_EFFECT', { 
                                type: 'PARTICLE', 
                                payload: { isBurst: true, x: absX, y: absY, color: player.tetromino.color, amount: 20 } 
                            });
                            break;
                        }
                    }
                    if (removed) break;
                }

                if (!removed) return false;

                this.core.addFloatingText("SCULPT", "#fbbf24", 0.8, 'powerup');
                this.core.pieceManager.rotationState = 0; 
                this.core.events.emit('AI_TRIGGER'); 
                return true;
            }

            case 'YEET': {
                // YEET ABILITY: Discard current piece and spawn next immediately
                const { x, y } = player.pos;
                
                // Visuals: Explosion where piece was
                this.core.events.emit('VISUAL_EFFECT', { 
                    type: 'PARTICLE', 
                    payload: { isBurst: true, x: x + 1, y: y + 1, color: '#ff4d4d', amount: 50 } 
                });
                this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'hard' });
                this.core.addFloatingText("YEET!", "#ff4d4d", 1.2, 'powerup');
                
                // Spawn next
                this.core.pieceManager.spawnPiece();
                return true;
            }
        }
        return false;
    }
}
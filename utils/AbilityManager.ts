
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
                    this.core.callbacks.onAudio('ABILITY_READY');
                    changed = true;
                }
                changed = true; // Timer changed
            }
        });
        
        // Sync if needed? GameCore handles full sync but specialized UI component might need direct subscription
        // For now rely on GameStats sync
        if (changed) {
            this.core.scoreManager.stats.abilities = [...this.abilities];
        }
    }

    public triggerAbility(slotIndex: number): void {
        if (slotIndex < 0 || slotIndex >= this.abilities.length) return;
        
        const ability = this.abilities[slotIndex];
        if (!ability.isReady) {
            this.core.callbacks.onAudio('UI_BACK'); // Error sound
            return;
        }

        if (this.executeEffect(ability.id)) {
            ability.isReady = false;
            ability.cooldownTimer = ability.totalCooldown;
            this.core.scoreManager.stats.abilities = [...this.abilities];
            this.core.callbacks.onAudio('ABILITY_ACTIVATE');
        }
    }

    private executeEffect(id: AbilityType): boolean {
        const player = this.core.pieceManager.player;
        const board = this.core.boardManager.stage;

        switch (id) {
            case 'COLOR_SWAP': {
                // Paint 3x3 area around player position with player color
                const centerPos = { ...player.pos };
                const color = player.tetromino.color;
                let affected = 0;

                for (let y = centerPos.y; y < centerPos.y + 3; y++) {
                    for (let x = centerPos.x; x < centerPos.x + 3; x++) {
                        if (y >= 0 && y < STAGE_HEIGHT && x >= 0 && x < STAGE_WIDTH) {
                            const cell = board[y][x];
                            // Only affect merged blocks
                            if (cell[1] !== 'clear') {
                                cell[3] = color; // Override Color
                                affected++;
                                this.core.callbacks.onVisualEffect({ type: 'PARTICLE', payload: { x, y, color: color, amount: 5 } });
                            }
                        }
                    }
                }
                
                this.core.addFloatingText("COLOR PULSE", color, 0.8, 'powerup');
                this.core.callbacks.onVisualEffect({ type: 'SHOCKWAVE', payload: { x: centerPos.x + 1, y: centerPos.y + 1, color } });
                return true; // Always consume even if 0 affected, creates paint field
            }

            case 'COLUMN_NUKE': {
                // Clear column below player piece
                const colX = Math.floor(player.pos.x + player.tetromino.shape[0].length / 2);
                // Clamp to board
                if (colX < 0 || colX >= STAGE_WIDTH) return false;

                const startY = this.core.flippedGravity ? 0 : STAGE_HEIGHT - 1;
                const endY = this.core.flippedGravity ? STAGE_HEIGHT - 1 : 0;
                const step = this.core.flippedGravity ? 1 : -1;

                // Visual Beam
                this.core.callbacks.onVisualEffect({ 
                    type: 'HARD_DROP_BEAM', 
                    payload: { x: colX, startY: 0, endY: STAGE_HEIGHT, color: '#ef4444' } 
                });

                // Clear logic
                let cleared = 0;
                for (let y = 0; y < STAGE_HEIGHT; y++) {
                    if (board[y][colX][1] !== 'clear') {
                        board[y][colX] = [null, 'clear'];
                        cleared++;
                    }
                }

                this.core.boardManager.revision++;
                this.core.addFloatingText("COLUMN NUKE", "#ef4444", 0.8, 'powerup');
                this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
                return true;
            }

            case 'PIECE_SCULPT': {
                // Remove last non-zero block in shape
                const shape = player.tetromino.shape;
                let removed = false;
                
                // Scan from bottom-right
                for (let y = shape.length - 1; y >= 0; y--) {
                    for (let x = shape[y].length - 1; x >= 0; x--) {
                        if (shape[y][x] !== 0) {
                            shape[y][x] = 0;
                            removed = true;
                            
                            // Visuals at piece local coord
                            const absX = player.pos.x + x;
                            const absY = player.pos.y + y;
                            this.core.callbacks.onVisualEffect({ 
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
                this.core.pieceManager.rotationState = 0; // Reset rotation to prevent kick issues with new shape
                this.core.callbacks.onAiTrigger(); // Recalculate AI
                return true;
            }
        }
        return false;
    }
}

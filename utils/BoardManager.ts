
import type { GameCore } from './GameCore';
import { Board, AdventureLevelConfig, CellData } from '../types';
import { createStage, createPuzzleStage, generateAdventureStage, addGarbageLines } from './gameUtils';
import { MODIFIER_COLORS, PUZZLE_LEVELS, COLORS, SCORES } from '../constants';
import { TetrominoType } from '../types';

export class BoardManager {
    private core: GameCore;
    public stage: Board;
    public garbagePending: number = 0;
    public revision: number = 0;
    public isClearing: boolean = false;

    constructor(core: GameCore) {
        this.core = core;
        this.stage = createStage(core.grid.width, core.grid.height);
    }

    public initialize(mode: string, startLevel: number, adventureLevelConfig?: AdventureLevelConfig, assistRows: number = 0): void {
        if (mode === 'PUZZLE') {
            this.stage = createPuzzleStage(PUZZLE_LEVELS[startLevel]);
        } else if (mode === 'ADVENTURE' && adventureLevelConfig) {
            this.stage = generateAdventureStage(adventureLevelConfig, assistRows);
        } else {
            // Dynamic Stage Creation
            this.stage = createStage(this.core.grid.width, this.core.grid.height);
        }
        this.garbagePending = 0;
        this.revision++;
        this.isClearing = false;
    }

    public isBoardEmpty(): boolean {
        return this.stage.every(row => row.every(cell => cell[1] === 'clear' && !cell[2]));
    }

    public getHighestBlockY(): number {
        if (!this.core.flippedGravity) {
            for(let y=0; y<this.core.grid.height; y++) {
                if (this.stage[y] && this.stage[y].some(c => c[1] !== 'clear')) return y;
            }
            return this.core.grid.height; 
        } else {
            for(let y=this.core.grid.height-1; y>=0; y--) {
                if (this.stage[y] && this.stage[y].some(c => c[1] !== 'clear')) return y;
            }
            return -1;
        }
    }

    public resetZenMode(): void {
        this.stage = createStage(this.core.grid.width, this.core.grid.height);
        this.revision++;
        this.core.events.emit('AUDIO', { event: 'CLEAR_4' });
        this.core.addFloatingText('ZEN RESET', '#06b6d4');
    }

    public addGarbage(amount: number): void {
        this.garbagePending += amount;
        if (this.garbagePending < 0) this.garbagePending = 0;
        this.core.events.emit('GARBAGE_CHANGE', this.garbagePending);
    }

    public processGarbage(): void {
        if (this.garbagePending > 0) {
            this.stage = addGarbageLines(this.stage, this.garbagePending, false, this.core.flippedGravity);
            this.revision++;
            this.garbagePending = 0;
            this.core.events.emit('GARBAGE_CHANGE', 0);
            this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'soft' });
            this.core.addFloatingText("WARNING!", "#ef4444");
        }
    }

    public clearBottomLine(): void {
        const bottomRowIndex = this.core.flippedGravity ? 0 : this.core.grid.height - 1;
        const tempStage = this.stage.map(row => [...row]);
        if (tempStage[bottomRowIndex]) {
            tempStage[bottomRowIndex].fill([null, 'clear']);
            this.sweepRows(tempStage, false, [bottomRowIndex]);
        }
    }

    public nukeBoard(): void {
        const rowsToClear: number[] = [];
        for (let y = 0; y < this.core.grid.height; y++) {
            rowsToClear.push(y);
        }
        const tempStage = createStage(this.core.grid.width, this.core.grid.height);
        this.sweepRows(tempStage, false, rowsToClear);
        this.core.events.emit('VISUAL_EFFECT', { type: 'SHAKE', payload: 'hard' });
        this.core.events.emit('VISUAL_EFFECT', { type: 'FLASH', payload: { color: MODIFIER_COLORS.NUKE_BLOCK, duration: 500 } });
        this.core.events.emit('AUDIO', { event: 'NUKE_CLEAR' });
    }

    public endZone(): number {
        let zonedLinesCount = 0;
        const newStage = this.stage.filter(row => {
            const isZoned = row.some(cell => cell[1] === 'zoned');
            if (isZoned) zonedLinesCount++;
            return !isZoned;
        });

        while (newStage.length < this.core.grid.height) {
            const w = Math.max(0, Math.floor(this.core.grid.width || 0)); // Guard
            const emptyRow: CellData[] = Array.from({ length: w }, () => [null, 'clear']);
            if (this.core.flippedGravity) {
                newStage.push(emptyRow);
            } else {
                newStage.unshift(emptyRow);
            }
        }

        this.stage = newStage;
        this.revision++;
        return zonedLinesCount;
    }

    public sweepRows(newStage: Board, isTSpinDetected: boolean = false, manualClearedRows?: number[]): void {
        let fullRowIndices: number[] = [];
        const isZoneActive = this.core.scoreManager.stats.isZoneActive;

        if (manualClearedRows) {
            fullRowIndices = manualClearedRows;
        } else {
            newStage.forEach((row, y) => { 
                const hasBedrock = row.some(cell => cell[2]?.type === 'BEDROCK');
                if (hasBedrock) return;
                const isFull = row.every(cell => cell[1] !== 'clear' && cell[1] !== 'zoned');
                if (isFull) fullRowIndices.push(y); 
            });
        }

        const clearingRowIndices: number[] = [];
        const frozenRowIndices: number[] = [];
        
        let monoClearCount = 0;
        let alternatingClearCount = 0;
        let lastMonoColor: string | undefined;
        let isMonoColor = false;
        
        fullRowIndices.forEach(y => {
            if (newStage[y].some(cell => cell[2]?.type === 'ICE' || cell[2]?.type === 'CRACKED_ICE')) {
                frozenRowIndices.push(y);
            } else {
                clearingRowIndices.push(y);
                const firstColor = newStage[y][0][3] || (newStage[y][0][0] ? COLORS[newStage[y][0][0] as TetrominoType] : null);
                if (firstColor && newStage[y].every(c => (c[3] || (c[0] ? COLORS[c[0] as TetrominoType] : null)) === firstColor)) {
                    monoClearCount++;
                    lastMonoColor = firstColor;
                    isMonoColor = true;
                }
            }
        });

        if (frozenRowIndices.length > 0) {
            frozenRowIndices.forEach(y => {
                newStage[y].forEach(cell => {
                    if (cell[2]?.type === 'ICE') {
                        cell[2] = { type: 'CRACKED_ICE', hits: 1 };
                    } else if (cell[2]?.type === 'CRACKED_ICE') {
                        cell[2] = undefined; 
                    }
                });
            });
            this.core.events.emit('AUDIO', { event: 'HARD_DROP' }); 
            this.revision++;
        }

        if (clearingRowIndices.length > 0) {
            this.isClearing = true;
            this.core.events.emit('VISUAL_EFFECT', { 
                type: 'ROW_CLEAR', 
                payload: { rows: clearingRowIndices, color: isMonoColor ? lastMonoColor : undefined } 
            });
            
            if (isZoneActive) {
                clearingRowIndices.forEach(y => {
                    newStage[y].forEach(cell => cell[1] = 'merged'); 
                    newStage[y].forEach(cell => cell[1] = 'zoned'); 
                });
                this.core.scoreManager.handleLineClear(clearingRowIndices.length, isTSpinDetected);
                this.isClearing = false;
            } else {
                this.core.events.emit('VISUAL_EFFECT', { type: 'PARTICLE', payload: { isExplosion: true, clearedRows: clearingRowIndices } });
                const scoreResult = this.core.scoreManager.handleLineClear(
                    clearingRowIndices.length, 
                    isTSpinDetected, 
                    monoClearCount, 
                    lastMonoColor
                );
                if (scoreResult.text) {
                    this.core.addFloatingText(scoreResult.text, "#ffffff");
                }
                const soundEvent = clearingRowIndices.length >= 4 ? 'CLEAR_4' : `CLEAR_${clearingRowIndices.length}`;
                this.core.events.emit('AUDIO', { event: soundEvent });

                clearingRowIndices.forEach(y => {
                    newStage[y].forEach(cell => {
                        const modifier = cell[2];
                        if (modifier) {
                            if (modifier.type === 'GEM') {
                                this.core.scoreManager.stats.gemsCollected = (this.core.scoreManager.stats.gemsCollected || 0) + 1;
                                this.core.applyScore({ score: SCORES.GEM_COLLECT_BONUS });
                                this.core.addFloatingText("GEM!", MODIFIER_COLORS.GEM, 0.6, 'gem');
                                this.core.events.emit('AUDIO', { event: 'UI_SELECT' });
                            } else if (modifier.type === 'BOMB') {
                                this.core.scoreManager.stats.bombsDefused = (this.core.scoreManager.stats.bombsDefused || 0) + 1;
                                this.core.applyScore({ score: SCORES.BOMB_DEFUZE_BONUS });
                                this.core.addFloatingText("DEFUSED!", MODIFIER_COLORS.BOMB, 0.6, 'bomb');
                            } else if (modifier.type === 'WILDCARD_BLOCK') {
                                this.core.boosterManager.wildcardAvailable = true;
                                this.core.events.emit('WILDCARD_AVAILABLE_CHANGE', true);
                                this.core.addFloatingText("WILDCARD!", MODIFIER_COLORS.WILDCARD_BLOCK, 0.7, 'powerup');
                            } else if (modifier.type === 'LASER_BLOCK') {
                                this.core.boosterManager.activeBoosters.push('LINE_CLEARER_BOOSTER');
                                this.core.boosterManager.lineClearerActive = true;
                                this.core.events.emit('LINE_CLEARER_ACTIVE_CHANGE', true);
                                this.core.addFloatingText("LASER!", MODIFIER_COLORS.LASER_BLOCK, 0.7, 'powerup');
                            } else if (modifier.type === 'NUKE_BLOCK') {
                                this.core.nukeBoard(); 
                                this.core.applyScore({ score: SCORES.POWERUP_NUKE_BLOCK_BONUS });
                            } else if (modifier.type === 'SLOW_BLOCK') {
                                this.core.boosterManager.activateSlowTime(15000);
                            } else if (modifier.type === 'MULTIPLIER_BLOCK') {
                                this.core.scoreManager.activateScoreMultiplier(15000);
                            } else if (modifier.type === 'FREEZE_BLOCK') {
                                this.core.boosterManager.activateTimeFreeze(10000);
                            } else if (modifier.type === 'DRILL_BLOCK') {
                                newStage[y].forEach((c, x) => {
                                    if(c[2]?.type === 'DRILL_BLOCK') {
                                        this.core.events.emit('VISUAL_EFFECT', { type: 'HARD_DROP_BEAM', payload: { x, startY: 0, endY: this.core.grid.height, color: MODIFIER_COLORS.DRILL_BLOCK } });
                                        for(let dy=0; dy<this.core.grid.height; dy++) {
                                            newStage[dy][x] = [null, 'clear'];
                                            if(x>0) newStage[dy][x-1] = [null, 'clear'];
                                            if(x<this.core.grid.width-1) newStage[dy][x+1] = [null, 'clear'];
                                        }
                                        this.core.addFloatingText("DRILL!", MODIFIER_COLORS.DRILL_BLOCK, 0.8, 'powerup');
                                    }
                                });
                            }
                        }
                    });
                });

                setTimeout(() => {
                    let remainingBoard = newStage.filter((_, index) => !clearingRowIndices.includes(index));
                    
                    // SAFETY: Handle grid size mismatch (e.g. resize during timeout)
                    if (remainingBoard.length > this.core.grid.height) {
                        // Grid shrunk: Trim board to fit new height
                        if (this.core.flippedGravity) {
                             // Flipped gravity (Top is 0 index, but physically bottom).
                             remainingBoard = remainingBoard.slice(0, this.core.grid.height);
                        } else {
                             // Standard gravity. Trim from top (lower indices).
                             const diff = remainingBoard.length - this.core.grid.height;
                             remainingBoard = remainingBoard.slice(diff);
                        }
                    }

                    // SAFETY: Ensure non-negative length for array creation
                    const rowsToAdd = Math.max(0, this.core.grid.height - remainingBoard.length);
                    const w = Math.max(0, Math.floor(this.core.grid.width || 0)); // Guard
                    
                    const emptyRows = Array.from({ length: rowsToAdd }, () => 
                        Array.from({ length: w }, () => [null, 'clear'] as CellData)
                    );

                    if (this.core.flippedGravity) {
                        this.stage = [...remainingBoard, ...emptyRows];
                    } else {
                        this.stage = [...emptyRows, ...remainingBoard];
                    }
                    
                    this.revision++;
                    this.isClearing = false;
                    
                    this.processGarbage(); 
                    this.core.events.emit('STATS_CHANGE', this.core.scoreManager.stats);
                    
                    this.core.processBufferedInputs(); 
                    
                }, 150); 
            }
        } else {
            this.processGarbage(); 
        }
    }
}

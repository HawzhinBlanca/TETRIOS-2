
import type { GameCore } from './GameCore';
import { Board, CellModifier, CellModifierType, TetrominoType, AdventureLevelConfig, FloatingTextVariant, CellState, CellData } from '../types';
import { createStage, createPuzzleStage, generateAdventureStage, addGarbageLines } from './gameUtils';
import { STAGE_WIDTH, STAGE_HEIGHT, MODIFIER_COLORS, SCORES, PUZZLE_LEVELS, COLORS } from '../constants';

export class BoardManager {
    private core: GameCore;
    public stage: Board;
    public garbagePending: number = 0;
    public revision: number = 0;

    constructor(core: GameCore) {
        this.core = core;
        this.stage = createStage();
    }

    public initialize(mode: string, startLevel: number, adventureLevelConfig?: AdventureLevelConfig, assistRows: number = 0): void {
        if (mode === 'PUZZLE') {
            this.stage = createPuzzleStage(PUZZLE_LEVELS[startLevel]);
        } else if (mode === 'ADVENTURE' && adventureLevelConfig) {
            this.stage = generateAdventureStage(adventureLevelConfig, assistRows);
        } else {
            this.stage = createStage();
        }
        this.garbagePending = 0;
        this.revision++;
    }

    public isBoardEmpty(): boolean {
        return this.stage.every(row => row.every(cell => cell[1] === 'clear' && !cell[2]));
    }

    public getHighestBlockY(): number {
        if (!this.core.flippedGravity) {
            // Standard: Stack grows from bottom (20) up to 0.
            // Find the minimum Y that has a block.
            for(let y=0; y<STAGE_HEIGHT; y++) {
                if (this.stage[y].some(c => c[1] !== 'clear')) return y;
            }
            return STAGE_HEIGHT; // Board is empty
        } else {
            // Flipped: Stack grows from top (0) down to 20.
            // Find the maximum Y that has a block.
            for(let y=STAGE_HEIGHT-1; y>=0; y--) {
                if (this.stage[y].some(c => c[1] !== 'clear')) return y;
            }
            return -1; // Board is empty
        }
    }

    public resetZenMode(): void {
        this.stage = createStage();
        this.revision++;
        this.core.callbacks.onAudio('CLEAR_4');
        this.core.addFloatingText('ZEN RESET', '#06b6d4');
    }

    public addGarbage(amount: number): void {
        this.garbagePending += amount;
        // Ensure garbage pending doesn't go negative (e.g. from P5 crush)
        if (this.garbagePending < 0) this.garbagePending = 0;
        this.core.callbacks.onGarbageChange(this.garbagePending);
    }

    public processGarbage(): void {
        if (this.garbagePending > 0) {
            this.stage = addGarbageLines(this.stage, this.garbagePending, false, this.core.flippedGravity);
            this.revision++;
            this.garbagePending = 0;
            this.core.callbacks.onGarbageChange(0);
            this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'soft' });
            this.core.addFloatingText("WARNING!", "#ef4444");
        }
    }

    public clearBottomLine(): void {
        const bottomRowIndex = this.core.flippedGravity ? 0 : STAGE_HEIGHT - 1;
        const tempStage = this.stage.map(row => [...row]);
        if (tempStage[bottomRowIndex]) {
            tempStage[bottomRowIndex].fill([null, 'clear']);
            this.sweepRows(tempStage, false, [bottomRowIndex]);
        }
    }

    public nukeBoard(): void {
        const rowsToClear: number[] = [];
        for (let y = 0; y < STAGE_HEIGHT; y++) {
            rowsToClear.push(y);
        }
        const tempStage = createStage();
        this.sweepRows(tempStage, false, rowsToClear);
        this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
        this.core.callbacks.onVisualEffect({ type: 'FLASH', payload: { color: MODIFIER_COLORS.NUKE_BLOCK, duration: 500 } });
        this.core.callbacks.onAudio('NUKE_CLEAR');
    }

    /**
     * Resolve all 'zoned' rows at the end of Zone mode.
     * Removes them and collapses the board.
     * @returns Number of lines cleared
     */
    public endZone(): number {
        let zonedLinesCount = 0;
        const newStage = this.stage.filter(row => {
            const isZoned = row.some(cell => cell[1] === 'zoned');
            if (isZoned) zonedLinesCount++;
            return !isZoned;
        });

        // Refill with empty rows at top/bottom based on gravity
        while (newStage.length < STAGE_HEIGHT) {
            const emptyRow = new Array(STAGE_WIDTH).fill([null, 'clear']);
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
                // BEDROCK LOGIC: If a row contains BEDROCK, it is structural and cannot be cleared by normal means.
                // It breaks the line clear.
                const hasBedrock = row.some(cell => cell[2]?.type === 'BEDROCK');
                if (hasBedrock) return;

                // In Zone, we only check merged lines, ignore already zoned lines (which should be at bottom)
                const isFull = row.every(cell => cell[1] !== 'clear' && cell[1] !== 'zoned');
                if (isFull) fullRowIndices.push(y); 
            });
        }

        const clearingRowIndices: number[] = [];
        const frozenRowIndices: number[] = [];
        
        // Pattern Tracking
        let monoClearCount = 0;
        let alternatingClearCount = 0;
        let lastMonoColor: string | undefined;

        fullRowIndices.forEach(y => {
            let isFrozen = false;
            let rowColor: string | null = null;
            let rowColors: string[] = [];
            let isMono = true;

            for(let x = 0; x < STAGE_WIDTH; x++) {
                const cell = newStage[y][x];
                // Check Modifiers
                if (cell[2]?.type === 'ICE') {
                    cell[2].hits = (cell[2].hits || 2) - 1;
                    if ((cell[2].hits || 0) > 0) {
                        isFrozen = true;
                        cell[2].type = 'CRACKED_ICE'; 
                        this.core.addFloatingText('FROZEN!', MODIFIER_COLORS.ICE, 0.6, 'default');
                        this.core.callbacks.onVisualEffect({ type: 'PARTICLE', payload: { x, y, color: MODIFIER_COLORS.ICE, amount: 8 }});
                    } else {
                        cell[2] = undefined; 
                        this.core.addFloatingText('SHATTERED!', '#fff', 0.7, 'default');
                        this.core.callbacks.onVisualEffect({ type: 'PARTICLE', payload: { x, y, color: '#a5f3fc', amount: 15 }});
                    }
                } 
                
                // Check Color for Pattern Bonus
                const type = cell[0] as TetrominoType;
                const cellColor = cell[3] || (type ? COLORS[type] : null);
                
                if (cellColor) {
                    rowColors.push(cellColor);
                    if (rowColor === null) rowColor = cellColor;
                    else if (rowColor !== cellColor) isMono = false;
                } else {
                    isMono = false;
                    rowColors.push('none'); // Break patterns on garbage or special blocks
                }
            }

            if (isFrozen) {
                frozenRowIndices.push(y);
                // PARTIAL CLEAR LOGIC (Ice cracks but row doesn't vanish)
                for(let x = 0; x < STAGE_WIDTH; x++) {
                    const cell = newStage[y][x];
                    if (cell[2]?.type !== 'CRACKED_ICE' && cell[2]?.type !== 'ICE') {
                         newStage[y][x] = [null, 'clear'];
                    }
                }
                this.core.callbacks.onAudio('HARD_DROP'); 
                this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'soft' });
            } else {
                clearingRowIndices.push(y);
                
                // Pattern Detection
                if (isMono && rowColor) {
                    monoClearCount++;
                    lastMonoColor = rowColor;
                } else if (rowColors.length === STAGE_WIDTH && !rowColors.includes('none')) {
                    // Check Alternating
                    const unique = new Set(rowColors);
                    if (unique.size === 2) {
                        let isAlt = true;
                        for(let i=1; i<rowColors.length; i++) {
                            if (rowColors[i] === rowColors[i-1]) {
                                isAlt = false;
                                break;
                            }
                        }
                        if (isAlt) alternatingClearCount++;
                    }
                }
            }
        });

        const rowsCleared: number = clearingRowIndices.length;
        this._processClearedRowModifiers(newStage, clearingRowIndices);

        // If only frozen lines were hit, no sweep needed
        if (rowsCleared === 0 && !isTSpinDetected && frozenRowIndices.length > 0) {
            this.stage = newStage;
            this.revision++;
            this.core.scoreManager.resetCombo();
            this.core.adventureManager.checkObjectives();
            return;
        }

        let finalStage: Board;

        if (isZoneActive && rowsCleared > 0) {
            // --- ZONE LOGIC: DEFER CLEAR ---
            // 1. Extract cleared rows and convert to 'zoned'
            const zoneRows = newStage.filter((_, index) => clearingRowIndices.includes(index)).map(row => {
                return row.map(cell => [cell[0], 'zoned', cell[2], cell[3]] as CellData);
            });
            
            // 2. Keep remaining rows (non-cleared)
            const remainingRows = newStage.filter((_, index) => !clearingRowIndices.includes(index));
            
            // 3. Reassemble: [Empty, ActiveStack, ZonedRows]
            //    Zoned rows act as a "floor" that grows.
            
            finalStage = [];
            
            // Add empty rows to top
            const emptyNeeded = STAGE_HEIGHT - remainingRows.length - zoneRows.length;
            for(let i=0; i<emptyNeeded; i++) finalStage.push(new Array(STAGE_WIDTH).fill([null, 'clear']));
            
            // Add remaining active stack
            finalStage.push(...remainingRows);
            
            // Add zoned rows to bottom
            finalStage.push(...zoneRows);

            // Handle Flipped Gravity Reversal of this logic
            if (this.core.flippedGravity) {
                // Logic is flipped: Zoned at Top (0), Stack below, Empty at Bottom
                finalStage = [];
                finalStage.push(...zoneRows);
                finalStage.push(...remainingRows);
                for(let i=0; i<emptyNeeded; i++) finalStage.push(new Array(STAGE_WIDTH).fill([null, 'clear']));
            }

        } else {
            // --- STANDARD LOGIC ---
            finalStage = newStage.filter((_, index) => !clearingRowIndices.includes(index));
            while (finalStage.length < STAGE_HEIGHT) {
                const emptyRow = new Array(STAGE_WIDTH).fill([null, 'clear']);
                if (this.core.flippedGravity) {
                    finalStage.push(emptyRow);
                } else {
                    finalStage.unshift(emptyRow);
                }
            }
        }

        const result = this.core.scoreManager.handleLineClear(rowsCleared, isTSpinDetected, monoClearCount, lastMonoColor, alternatingClearCount);

        this._handlePostClearVisualsAndAudio(result, clearingRowIndices, rowsCleared);
        
        // Only show row clear effect if NOT in Zone (Zone clears happen at end)
        if (!isZoneActive) {
            this.core.callbacks.onVisualEffect({ type: 'ROW_CLEAR', payload: { rows: clearingRowIndices } });
        }

        this.stage = finalStage;
        this.revision++;
        
        if (!isZoneActive) {
            this.processGarbage();
        }
        
        this.core.adventureManager.checkObjectives();
        this._checkPowerupSpawn(rowsCleared, isTSpinDetected);
    }

    private _processClearedRowModifiers(stage: Board, fullRowIndices: number[]): void {
        fullRowIndices.forEach(y => {
            stage[y].forEach((cell, x) => {
                const modifier = cell[2];
                if (!modifier) return;

                if (modifier.type === 'GEM') {
                    this.core.scoreManager.stats.gemsCollected = (this.core.scoreManager.stats.gemsCollected || 0) + 1;
                    this.core.applyScore({ score: SCORES.GEM_COLLECT_BONUS });
                    this.core.addFloatingText('GEM!', MODIFIER_COLORS.GEM, 0.5, 'gem');
                } else if (modifier.type === 'BOMB') {
                    this.core.scoreManager.stats.bombsDefused = (this.core.scoreManager.stats.bombsDefused || 0) + 1;
                    this.core.applyScore({ score: SCORES.BOMB_DEFUZE_BONUS });
                    this.core.addFloatingText('BOMB DEFUZED!', '#4ade80', 0.5, 'bomb');
                } else if (modifier.type === 'WILDCARD_BLOCK') {
                    this.core.boosterManager.wildcardAvailable = true;
                    this.core.callbacks.onWildcardAvailableChange(true);
                    this.core.addFloatingText('WILDCARD READY!', MODIFIER_COLORS.WILDCARD_BLOCK, 0.7, 'powerup');
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'WILDCARD_BLOCK', x, y, color: MODIFIER_COLORS.WILDCARD_BLOCK } });
                } else if (modifier.type === 'LASER_BLOCK') {
                    setTimeout(() => this.clearBottomLine(), 50);
                    this.core.addFloatingText('LASER CLEAR!', MODIFIER_COLORS.LASER_BLOCK, 0.7, 'powerup');
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'LASER_BLOCK', x, y, color: MODIFIER_COLORS.LASER_BLOCK } });
                } else if (modifier.type === 'NUKE_BLOCK') {
                    setTimeout(() => this.nukeBoard(), 50);
                    this.core.addFloatingText('NUKE!', MODIFIER_COLORS.NUKE_BLOCK, 1.0, 'powerup');
                    this.core.applyScore({ score: SCORES.POWERUP_NUKE_BLOCK_BONUS });
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'NUKE_BLOCK', x, y, color: MODIFIER_COLORS.NUKE_BLOCK } });
                } else if (modifier.type === 'SLOW_BLOCK') {
                    this.core.boosterManager.activateSlowTime(15000); // 15s slow time
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'SLOW_BLOCK', x, y, color: MODIFIER_COLORS.SLOW_BLOCK } });
                } else if (modifier.type === 'MULTIPLIER_BLOCK') {
                    this.core.scoreManager.activateScoreMultiplier(15000); // 15s 2x score
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'MULTIPLIER_BLOCK', x, y, color: MODIFIER_COLORS.MULTIPLIER_BLOCK } });
                } else if (modifier.type === 'FREEZE_BLOCK') {
                    this.core.boosterManager.activateTimeFreeze(10000); // 10s freeze
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'FREEZE_BLOCK', x, y, color: MODIFIER_COLORS.FREEZE_BLOCK } });
                } else if (modifier.type === 'DRILL_BLOCK') {
                    // Drill Logic: Clear 3 vertical columns
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'DRILL_BLOCK', x, y, color: MODIFIER_COLORS.DRILL_BLOCK } });
                    
                    // Clear current column + adjacent
                    const colsToClear = [x-1, x, x+1].filter(c => c >= 0 && c < STAGE_WIDTH);
                    
                    colsToClear.forEach(cx => {
                        this.core.callbacks.onVisualEffect({ 
                            type: 'HARD_DROP_BEAM', 
                            payload: { x: cx, startY: 0, endY: STAGE_HEIGHT, color: MODIFIER_COLORS.DRILL_BLOCK } 
                        });
                        
                        for(let r=0; r<STAGE_HEIGHT; r++) {
                            // Only clear if not bedrock
                            if (stage[r][cx][2]?.type !== 'BEDROCK') {
                                stage[r][cx] = [null, 'clear'];
                            }
                        }
                    });
                    
                    this.core.addFloatingText('DRILL BLAST!', MODIFIER_COLORS.DRILL_BLOCK, 0.8, 'powerup');
                    this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: 'hard' });
                    this.core.callbacks.onAudio('LASER_CLEAR');
                }
            });
        });
    }

    private _checkPowerupSpawn(rowsCleared: number, isTSpin: boolean): void {
        let spawnChance = 0.3;
        if (this.core.mode === 'BLITZ') {
            spawnChance *= 2; 
        }

        // Increase chance for high-skill plays
        if (rowsCleared >= 4) spawnChance += 0.1;
        if (isTSpin) spawnChance += 0.1;

        if ((rowsCleared >= 4 || (isTSpin && rowsCleared >= 1)) && Math.random() < spawnChance) {
            const powerupTypes: CellModifierType[] = ['WILDCARD_BLOCK', 'LASER_BLOCK', 'SLOW_BLOCK', 'MULTIPLIER_BLOCK', 'FREEZE_BLOCK', 'DRILL_BLOCK'];
            if (this.core.mode === 'BLITZ') {
                powerupTypes.push('NUKE_BLOCK');
            }
            const randomPowerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            const modifier: CellModifier = { type: randomPowerupType };
            
            if (this.fillRandomClearCellExcludingPlayer(modifier)) {
                this.core.addFloatingText('POWERUP SPAWN!', '#fff', 0.6, 'powerup');
                if (randomPowerupType === 'WILDCARD_BLOCK') {
                    this.core.boosterManager.wildcardAvailable = true;
                    this.core.callbacks.onWildcardAvailableChange(true);
                }
            }
        }
    }

    public fillRandomClearCellExcludingPlayer(modifier: CellModifier, attempts: number = 100): boolean {
        const player = this.core.pieceManager.player;
        for (let i = 0; i < attempts; i++) {
            const y = Math.floor(Math.random() * STAGE_HEIGHT);
            const x = Math.floor(Math.random() * STAGE_WIDTH);

            const isPlayerCell = this.core.collisionManager.checkOverlap(player, x, y);

            if (this.stage[y][x][1] === 'clear' && !this.stage[y][x][2] && !isPlayerCell) {
                this.stage[y][x][2] = modifier;
                this.revision++;
                return true;
            }
        }
        return false;
    }

    private _handlePostClearVisualsAndAudio(result: any, fullRowIndices: number[], rowsCleared: number): void {
        const isTetris = rowsCleared >= 4;
        const isTSpin = result.text && result.text.includes('T-SPIN');
        const particleColor = isTetris ? '#06b6d4' : (isTSpin ? '#d946ef' : '#ffffff');
        const particleAmount = isTetris ? 60 : 30;

        fullRowIndices.forEach(y => {
            this.core.callbacks.onVisualEffect({ 
                type: 'PARTICLE', 
                payload: { 
                    isExplosion: true, 
                    y, 
                    color: particleColor, 
                    amount: particleAmount 
                } 
            });
        });

        if (result.visualShake) this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: result.visualShake });
        
        if (result.text) {
            const isB2B = result.text.includes('B2B');
            const color = isB2B ? '#fbbf24' : '#fff';
            const scale = isB2B ? 0.7 : 0.5;
            this.core.addFloatingText(result.text, color, scale);
        }

        if (!this.core.scoreManager.stats.isZoneActive) {
            if (rowsCleared === 1) this.core.callbacks.onAudio('CLEAR_1');
            else if (rowsCleared === 2) this.core.callbacks.onAudio('CLEAR_2');
            else if (rowsCleared === 3) this.core.callbacks.onAudio('CLEAR_3');
            else if (rowsCleared >= 4) this.core.callbacks.onAudio('CLEAR_4');
        }
    }
}

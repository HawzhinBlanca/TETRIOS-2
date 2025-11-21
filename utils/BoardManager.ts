
import { GameCore } from './GameCore';
import { Board, CellModifier, CellModifierType, TetrominoType, AdventureLevelConfig, FloatingTextVariant } from '../types';
import { createStage, createPuzzleStage, generateAdventureStage, addGarbageLines } from './gameUtils';
import { STAGE_WIDTH, STAGE_HEIGHT, MODIFIER_COLORS, SCORES, PUZZLE_LEVELS } from '../constants';

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

    public resetZenMode(): void {
        this.stage = createStage();
        this.revision++;
        this.core.callbacks.onAudio('CLEAR_4');
        this.core.addFloatingText('ZEN RESET', '#06b6d4');
    }

    public addGarbage(amount: number): void {
        this.garbagePending += amount;
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

    public sweepRows(newStage: Board, isTSpinDetected: boolean = false, manualClearedRows?: number[]): void {
        let fullRowIndices: number[] = [];
        if (manualClearedRows) {
            fullRowIndices = manualClearedRows;
        } else {
            newStage.forEach((row, y) => { if (row.every(cell => cell[1] !== 'clear')) fullRowIndices.push(y); });
        }

        const rowsCleared: number = fullRowIndices.length;

        this._processClearedRowModifiers(newStage, fullRowIndices);

        if (rowsCleared === 0 && !isTSpinDetected) {
            this.core.scoreManager.resetCombo();
            this.stage = newStage;
            this.revision++;
            this.core.adventureManager.checkObjectives();
            return;
        }

        const sweepedStage: Board = newStage.filter((_, index) => !fullRowIndices.includes(index));
        while (sweepedStage.length < STAGE_HEIGHT) {
            const emptyRow = new Array(STAGE_WIDTH).fill([null, 'clear']);
            if (this.core.flippedGravity) {
                sweepedStage.push(emptyRow);
            } else {
                sweepedStage.unshift(emptyRow);
            }
        }

        const result = this.core.scoreManager.handleLineClear(rowsCleared, isTSpinDetected);

        this._handlePostClearVisualsAndAudio(result, fullRowIndices, rowsCleared);

        this.stage = sweepedStage;
        this.revision++;
        this.processGarbage();
        this.core.adventureManager.checkObjectives();

        this._checkPowerupSpawn(rowsCleared, isTSpinDetected);
    }

    private _processClearedRowModifiers(stage: Board, fullRowIndices: number[]): void {
        let modified = false;
        fullRowIndices.forEach(y => {
            stage[y].forEach((cell, x) => {
                const modifier = cell[2];
                if (!modifier) return;

                if (modifier.type === 'GEM') {
                    this.core.scoreManager.stats.gemsCollected = (this.core.scoreManager.stats.gemsCollected || 0) + 1;
                    this.core.applyScore({ score: SCORES.GEM_COLLECT_BONUS });
                    this.core.addFloatingText('GEM!', MODIFIER_COLORS.GEM, 0.5, 'gem');
                    modified = true;
                } else if (modifier.type === 'BOMB') {
                    this.core.scoreManager.stats.bombsDefused = (this.core.scoreManager.stats.bombsDefused || 0) + 1;
                    this.core.applyScore({ score: SCORES.BOMB_DEFUZE_BONUS });
                    this.core.addFloatingText('BOMB DEFUZED!', '#4ade80', 0.5, 'bomb');
                    modified = true;
                } else if (modifier.type === 'WILDCARD_BLOCK') {
                    this.core.boosterManager.wildcardAvailable = true;
                    this.core.callbacks.onWildcardAvailableChange(true);
                    this.core.addFloatingText('WILDCARD READY!', MODIFIER_COLORS.WILDCARD_BLOCK, 0.7, 'powerup');
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'WILDCARD_BLOCK', x, y, color: MODIFIER_COLORS.WILDCARD_BLOCK } });
                    modified = true;
                } else if (modifier.type === 'LASER_BLOCK') {
                    // Use timeout to avoid state update conflict during render/sweep
                    setTimeout(() => this.clearBottomLine(), 50);
                    this.core.addFloatingText('LASER CLEAR!', MODIFIER_COLORS.LASER_BLOCK, 0.7, 'powerup');
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'LASER_BLOCK', x, y, color: MODIFIER_COLORS.LASER_BLOCK } });
                    modified = true;
                } else if (modifier.type === 'NUKE_BLOCK') {
                    setTimeout(() => this.nukeBoard(), 50);
                    this.core.addFloatingText('NUKE!', MODIFIER_COLORS.NUKE_BLOCK, 1.0, 'powerup');
                    this.core.applyScore({ score: SCORES.POWERUP_NUKE_BLOCK_BONUS });
                    this.core.callbacks.onVisualEffect({ type: 'POWERUP_ACTIVATE', payload: { type: 'NUKE_BLOCK', x, y, color: MODIFIER_COLORS.NUKE_BLOCK } });
                    modified = true;
                }
            });
        });
        // No need to increment revision here as sweepRows will likely handle the main stage update, 
        // but if modifiers are removed from rows that aren't cleared (edge cases), we might need to.
        // In sweepRows, we process newStage which is then assigned to this.stage.
    }

    private _checkPowerupSpawn(rowsCleared: number, isTSpin: boolean): void {
        let spawnChance = 0.3;
        if (this.core.mode === 'BLITZ') {
            spawnChance *= 2; 
        }

        if ((rowsCleared === 4 || (isTSpin && rowsCleared >= 2)) && Math.random() < spawnChance) {
            this.core.addFloatingText('POWERUP SPAWN!', '#fff', 0.6, 'powerup');
            const powerupTypes: CellModifierType[] = ['WILDCARD_BLOCK', 'LASER_BLOCK'];
            if (this.core.mode === 'BLITZ') {
                powerupTypes.push('NUKE_BLOCK');
            }
            const randomPowerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            const modifier: CellModifier = { type: randomPowerupType };
            if (randomPowerupType === 'BOMB') modifier.timer = 10;
            if (randomPowerupType === 'ICE') modifier.hits = 2;

            if (this.fillRandomClearCellExcludingPlayer(modifier)) {
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

            let isPlayerCell = false;
            player.tetromino.shape.forEach((row, r) => {
                row.forEach((cellType, c) => {
                    if (cellType !== 0 && (player.pos.y + r === y) && (player.pos.x + c === x)) {
                        isPlayerCell = true;
                    }
                });
            });

            if (this.stage[y][x][1] === 'clear' && !this.stage[y][x][2] && !isPlayerCell) {
                this.stage[y][x][2] = modifier;
                this.revision++;
                return true;
            }
        }
        return false;
    }

    private _handlePostClearVisualsAndAudio(result: any, fullRowIndices: number[], rowsCleared: number): void {
        fullRowIndices.forEach(y => this.core.callbacks.onVisualEffect({ type: 'PARTICLE', payload: { isExplosion: true, y, color: 'white' } }));
        if (result.visualShake) this.core.callbacks.onVisualEffect({ type: 'SHAKE', payload: result.visualShake });
        if (result.text) this.core.addFloatingText(result.text, '#fff', 0.5);

        if (rowsCleared === 1) this.core.callbacks.onAudio('CLEAR_1');
        else if (rowsCleared === 2) this.core.callbacks.onAudio('CLEAR_2');
        else if (rowsCleared === 3) this.core.callbacks.onAudio('CLEAR_3');
        else if (rowsCleared >= 4) this.core.callbacks.onAudio('CLEAR_4');
    }
}

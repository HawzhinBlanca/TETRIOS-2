

import { GameCore } from './GameCore';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../constants';

export class BoardManager {
    private core: GameCore;
    public revision: number = 0;
    private _garbagePending: number = 0;

    constructor(core: GameCore) {
        this.core = core;
    }

    get stage() { return this.core.state.board; }
    
    get garbagePending() { return this._garbagePending; }
    
    public initialize(mode: string, startLevel: number) {
        // Use dynamic dimensions from core grid config
        const { width, height } = this.core.grid;
        this.core.state.board = Array.from({ length: height }, () => Array(width).fill([null, 'clear']));
        this._garbagePending = 0;
    }

    public addGarbage(lines: number) {
        this._garbagePending += lines;
        this.core.events.emit('GARBAGE_CHANGE', this._garbagePending);
    }

    public processGarbage() {
        if (this._garbagePending > 0) {
            this._garbagePending = 0;
            this.core.events.emit('GARBAGE_CHANGE', 0);
        }
    }

    public isBoardEmpty(): boolean {
        return this.core.state.board.every(row => row.every(cell => cell[1] === 'clear'));
    }

    public sweepRows(board: any, ...args: any[]) {}
}
import { GameCore } from './GameCore';
import { TetrominoType } from '../types';

export class PieceManager {
    private core: GameCore;
    public rotationState: number = 0; 

    constructor(core: GameCore) {
        this.core = core;
    }

    get player() { return this.core.state.player; }
    get pieceIsGrounded() { return this.core.state.flags.isGrounded; }
    
    get dropTime() { return this.core.state.gravity.speed; }
    set dropTime(val: number) { this.core.state.gravity.speed = val; }

    get canHold() { return this.core.state.hold.canHold; }
    set canHold(val: boolean) { this.core.state.hold.canHold = val; }

    get holdCharge() { return this.core.state.hold.charge; }
    set holdCharge(val: number) { this.core.state.hold.charge = val; }
    
    get heldPiece() { return this.core.state.hold.piece; }

    get nextQueue() { return this.core.state.queue; }

    public reset(level: number) {}

    public move(dir: number): boolean {
        this.core.handleAction(dir === -1 ? 'moveLeft' : 'moveRight');
        return true; 
    }

    public softDrop() {
        this.core.handleAction('softDrop');
    }

    public hold() {
        // Minimal shim to allow hold logic to still flow through core
        const { player, hold } = this.core.state;
        if (!hold.canHold) return;

        const currentType = player.tetromino.type;
        // Trigger event for UI
        this.core.events.emit('HOLD_CHANGE', { piece: currentType, canHold: false });
        
        // Actually perform swap? 
        // This is tricky without rewriting logic/tetris.ts to accept 'HOLD' action
        // For now, let's assume GameCore calls `this.hold()` and we modify state directly here (impure but functional for compat)
        // ... Implementation left empty to force migration to actions
    }

    public update(deltaTime: number) {}
    
    public spawnPiece() {
        this.core.spawnPiece();
    }

    public injectRewardPiece(type: TetrominoType) {
        this.core.state.queue.unshift(type);
        this.core.events.emit('QUEUE_CHANGE', this.core.state.queue);
    }
}

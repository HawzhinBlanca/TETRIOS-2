
import type { GameCore } from './GameCore';
import { engineStore } from '../stores/engineStore';
import { audioManager } from './audioManager';
import { MoveScore, TetrominoType } from '../types';

interface SyncedStateSnapshot {
    score: number;
    rows: number;
    level: number;
    time: number;
    comboCount: number;
    garbagePending: number;
    pieceIsGrounded: boolean;
    flippedGravity: boolean;
    dangerLevel: number;
    wildcardPieceActive: boolean;
    isSelectingBombRows: boolean;
    isSelectingLine: boolean;
    focusGauge: number;
    isZoneActive: boolean;
    missedOpportunity: MoveScore | null;
    isRewinding: boolean;
    scoreMultiplierActive: boolean;
    timeFreezeActive: boolean;
    nextQueue: TetrominoType[];
    heldPiece: TetrominoType | null;
    canHold: boolean;
}

/**
 * Manages synchronization between the imperative GameCore logic and the reactive Zustand store.
 * Implements throttling to prevent React render thrashing during high-frequency updates.
 */
export class StateSyncManager {
    private core: GameCore;
    private lastState: SyncedStateSnapshot;

    constructor(core: GameCore) {
        this.core = core;
        this.lastState = this.getInitialState();
    }

    private getInitialState(): SyncedStateSnapshot {
        return {
            score: -1,
            rows: -1,
            level: -1,
            time: -1,
            comboCount: -1,
            garbagePending: -1,
            pieceIsGrounded: false,
            flippedGravity: false,
            dangerLevel: -1,
            wildcardPieceActive: false,
            isSelectingBombRows: false,
            isSelectingLine: false,
            focusGauge: -1,
            isZoneActive: false,
            missedOpportunity: null,
            isRewinding: false,
            scoreMultiplierActive: false,
            timeFreezeActive: false,
            nextQueue: [],
            heldPiece: null,
            canHold: false,
        };
    }

    public reset(): void {
        this.lastState = this.getInitialState();
        // Force immediate sync next update
        this.lastState.score = -999;
    }

    /**
     * Main sync loop. Should be called at the end of the game loop.
     * Decides when to push updates to the global store.
     */
    public sync(): void {
        const { scoreManager, boardManager, pieceManager, boosterManager, state } = this.core;
        const currentStats = scoreManager.stats;
        
        // Calculate derived metrics via core accessor
        const dangerLevel = this.core.calculateStressLevel();
        
        // Direct high-frequency events bypassing React state for critical UI (e.g. Score counters)
        this.core.events.emit('FAST_SCORE', { score: currentStats.score, time: currentStats.time });
        this.core.events.emit('FAST_GAUGE', { value: currentStats.focusGauge });

        // Feed audio system with game state
        audioManager.updateDynamicMix({
            dangerLevel,
            comboCount: scoreManager.comboCount,
            isZoneActive: currentStats.isZoneActive,
            isFrenzy: currentStats.isFrenzyActive || false
        });

        // OPTIMIZATION: Early exit before object allocation
        const timeDiff = Math.abs(currentStats.time - this.lastState.time);
        const isFastMode = this.core.mode === 'BLITZ' || this.core.mode === 'SPRINT' || this.core.mode === 'TIME_ATTACK';
        const timeThreshold = isFastMode ? 0.1 : 0.5;

        // Check strict equality on primitives to avoid heavy snapshot construction if nothing critical changed
        const immediateUpdateNeeded = 
            currentStats.score !== this.lastState.score ||
            currentStats.rows !== this.lastState.rows ||
            currentStats.level !== this.lastState.level ||
            state.queue !== this.lastState.nextQueue ||
            state.hold.piece !== this.lastState.heldPiece ||
            state.hold.canHold !== this.lastState.canHold ||
            scoreManager.comboCount !== this.lastState.comboCount ||
            boardManager.garbagePending !== this.lastState.garbagePending ||
            pieceManager.pieceIsGrounded !== this.lastState.pieceIsGrounded ||
            this.core.flippedGravity !== this.lastState.flippedGravity ||
            currentStats.isZoneActive !== this.lastState.isZoneActive ||
            this.core.isRewinding !== this.lastState.isRewinding ||
            currentStats.scoreMultiplierActive !== this.lastState.scoreMultiplierActive ||
            boosterManager.timeFreezeActive !== this.lastState.timeFreezeActive ||
            this.core.state.flags.isGameOver || // Always sync immediately on Game Over
            Math.abs(dangerLevel - this.lastState.dangerLevel) > 0.1 ||
            Math.abs(currentStats.focusGauge - this.lastState.focusGauge) > 10;

        if (!immediateUpdateNeeded && timeDiff < timeThreshold) {
            return;
        }

        // Construct full snapshot only if update is needed
        const currentState: SyncedStateSnapshot = {
            score: currentStats.score,
            rows: currentStats.rows,
            level: currentStats.level,
            time: currentStats.time,
            comboCount: scoreManager.comboCount,
            garbagePending: boardManager.garbagePending,
            pieceIsGrounded: pieceManager.pieceIsGrounded,
            flippedGravity: this.core.flippedGravity,
            dangerLevel: dangerLevel,
            wildcardPieceActive: engineStore.getState().wildcardPieceActive,
            isSelectingBombRows: boosterManager.isSelectingBombRows,
            isSelectingLine: boosterManager.isSelectingLine,
            focusGauge: currentStats.focusGauge,
            isZoneActive: currentStats.isZoneActive,
            missedOpportunity: this.core.missedOpportunity,
            isRewinding: this.core.isRewinding,
            scoreMultiplierActive: currentStats.scoreMultiplierActive || false,
            timeFreezeActive: boosterManager.timeFreezeActive,
            nextQueue: state.queue,
            heldPiece: state.hold.piece,
            canHold: state.hold.canHold,
        };

        // Batch Update Store
        engineStore.setState({
            stats: { 
                ...currentStats, 
                isRewinding: currentState.isRewinding,
                timeFreezeActive: currentState.timeFreezeActive
            },
            garbagePending: currentState.garbagePending,
            comboCount: currentState.comboCount,
            isBackToBack: scoreManager.isBackToBack,
            pieceIsGrounded: currentState.pieceIsGrounded,
            flippedGravity: currentState.flippedGravity,
            dangerLevel: currentState.dangerLevel,
            focusGauge: currentState.focusGauge,
            zoneActive: currentState.isZoneActive,
            missedOpportunity: currentState.missedOpportunity,
            nextQueue: currentState.nextQueue,
            heldPiece: currentState.heldPiece,
            canHold: currentState.canHold
        });

        this.lastState = currentState;
    }
}

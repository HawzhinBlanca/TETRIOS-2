
import type { GameCore } from './GameCore';
import { engineStore } from '../stores/engineStore';
import { audioManager } from './audioManager';
import { MoveScore } from '../types';

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
        const { scoreManager, boardManager, pieceManager, boosterManager } = this.core;
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

        // Throttling Logic for React Updates
        const timeDiff = Math.abs(currentStats.time - this.lastState.time);
        const isFastMode = this.core.mode === 'BLITZ' || this.core.mode === 'SPRINT' || this.core.mode === 'TIME_ATTACK';
        
        // Update more frequently in fast modes to show accurate timer
        const timeThreshold = isFastMode ? 0.1 : 0.5;

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
            timeFreezeActive: boosterManager.timeFreezeActive
        };

        if (this.shouldUpdate(currentState, timeDiff, timeThreshold)) {
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
                missedOpportunity: currentState.missedOpportunity
            });

            this.lastState = currentState;
        }
    }

    private shouldUpdate(current: SyncedStateSnapshot, timeDiff: number, timeThreshold: number): boolean {
        // Check for any significant state change that requires a React re-render
        return (
            current.score !== this.lastState.score ||
            current.rows !== this.lastState.rows ||
            current.level !== this.lastState.level ||
            timeDiff > timeThreshold ||
            current.comboCount !== this.lastState.comboCount ||
            current.garbagePending !== this.lastState.garbagePending ||
            current.pieceIsGrounded !== this.lastState.pieceIsGrounded ||
            current.flippedGravity !== this.lastState.flippedGravity ||
            Math.abs(current.dangerLevel - this.lastState.dangerLevel) > 0.1 ||
            current.wildcardPieceActive !== this.lastState.wildcardPieceActive ||
            current.isSelectingBombRows !== this.lastState.isSelectingBombRows ||
            current.isSelectingLine !== this.lastState.isSelectingLine ||
            Math.abs(current.focusGauge - this.lastState.focusGauge) > 10 ||
            current.isZoneActive !== this.lastState.isZoneActive ||
            current.isRewinding !== this.lastState.isRewinding ||
            current.scoreMultiplierActive !== this.lastState.scoreMultiplierActive ||
            current.timeFreezeActive !== this.lastState.timeFreezeActive
        );
    }
}

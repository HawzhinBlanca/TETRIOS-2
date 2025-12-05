
import { GameState, TetrominoType } from '../types';

export type EventMap = {
    STATE_CHANGE: { newState: GameState; previousState: GameState };
    STATS_CHANGE: any;
    QUEUE_CHANGE: TetrominoType[];
    HOLD_CHANGE: { piece: TetrominoType; canHold: boolean };
    GROUNDED_CHANGE: boolean;
    AI_TRIGGER: void;
    AUDIO: { event: string; val?: number; type?: TetrominoType; extra?: any }; 
    VISUAL_EFFECT: any;
    GAME_OVER: { state: 'GAMEOVER' | 'VICTORY'; levelId?: string; rewards?: any };
    ACHIEVEMENT_UNLOCKED: string;
    FAST_SCORE: { score: number; time: number };
    FAST_GAUGE: { value: number };
    COMBO_CHANGE: { combo: number; backToBack: boolean };
    GARBAGE_CHANGE: number;
    SLOW_TIME_CHANGE: { active: boolean; timer: number };
    WILDCARD_AVAILABLE_CHANGE: boolean;
    BOMB_BOOSTER_READY_CHANGE: boolean;
    LINE_CLEARER_ACTIVE_CHANGE: boolean;
    FLIPPED_GRAVITY_TIMER_CHANGE: { active: boolean; timer: number };
    BOMB_SELECTION_START: number;
    BOMB_SELECTION_END: void;
    LINE_SELECTION_START: void;
    LINE_SELECTION_END: void;
    BLITZ_SPEED_UP: number;
    WILDCARD_SELECTION_START: void;
    STRESS_CHANGE: number;
    LEVEL_UP: number;
};

type EventHandler<T = any> = (payload: T) => void;

export class EventManager {
    private listeners: Map<string, Set<EventHandler>> = new Map();

    public on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    public off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(handler);
        }
    }

    public emit<K extends keyof EventMap>(event: K, payload?: EventMap[K]): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.forEach(handler => {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            });
        }
    }

    public clear(): void {
        this.listeners.clear();
    }
}

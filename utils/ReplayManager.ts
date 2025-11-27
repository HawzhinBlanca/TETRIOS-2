
import { ReplayData, ReplayFrame, GameMode, KeyAction, Difficulty } from '../types';
import { safeStorage } from './safeStorage';

const REPLAY_STORAGE_KEY = 'tetrios-last-replay';

// Mapping for compression
const ACTION_MAP: Record<KeyAction, string> = {
    moveLeft: 'L', moveRight: 'R', softDrop: 'S', hardDrop: 'H',
    rotateCW: 'C', rotateCCW: 'W', hold: 'O', zone: 'Z', rewind: 'B',
    ability1: '1', ability2: '2', ability3: '3'
};
const REVERSE_MAP: Record<string, KeyAction> = Object.entries(ACTION_MAP).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {}) as Record<string, KeyAction>;

interface CompressedReplayData extends Omit<ReplayData, 'inputs'> {
    inputs: string; // Compressed string
}

export class ReplayManager {
    public isRecording: boolean = false;
    public isReplaying: boolean = false;
    
    private currentReplay: ReplayData | null = null;
    private playbackIndex: number = 0;
    private startTime: number = 0;

    constructor() {}

    public startRecording(mode: GameMode, difficulty: Difficulty, seed: string) {
        this.isRecording = true;
        this.isReplaying = false;
        this.startTime = Date.now();
        this.currentReplay = {
            seed,
            mode,
            difficulty,
            inputs: [],
            finalScore: 0,
            date: Date.now()
        };
    }

    public recordInput(action: KeyAction) {
        if (!this.isRecording || !this.currentReplay) return;
        const time = Date.now() - this.startTime;
        this.currentReplay.inputs.push({ time, action });
    }

    public finishRecording(finalScore: number) {
        if (this.isRecording && this.currentReplay) {
            this.currentReplay.finalScore = finalScore;
            
            // Compress before saving
            const compressed = this.compress(this.currentReplay);
            safeStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(compressed));
        }
        this.isRecording = false;
    }

    public startReplay(data: ReplayData | null = null) {
        if (data) {
            this.currentReplay = data;
        } else {
            const raw = safeStorage.getJson<CompressedReplayData | ReplayData>(REPLAY_STORAGE_KEY);
            if (!raw) return false;
            
            // Check if it's compressed or legacy array
            if (typeof raw.inputs === 'string') {
                this.currentReplay = this.decompress(raw as CompressedReplayData);
            } else {
                this.currentReplay = raw as ReplayData;
            }
        }

        if (!this.currentReplay) return false;

        this.isReplaying = true;
        this.isRecording = false;
        this.playbackIndex = 0;
        this.startTime = Date.now();
        return true;
    }

    public getPlaybackInput(gameTime: number): KeyAction[] {
        if (!this.isReplaying || !this.currentReplay) return [];
        
        const actions: KeyAction[] = [];
        
        while (this.playbackIndex < this.currentReplay.inputs.length) {
            const frame = this.currentReplay.inputs[this.playbackIndex];
            if (frame.time <= gameTime) {
                actions.push(frame.action);
                this.playbackIndex++;
            } else {
                break;
            }
        }
        
        return actions;
    }

    public getSeed(): string | null {
        return this.currentReplay ? this.currentReplay.seed : null;
    }
    
    public getMode(): GameMode | null {
        return this.currentReplay ? this.currentReplay.mode : null;
    }

    // --- Compression Utils ---

    private compress(data: ReplayData): CompressedReplayData {
        let lastTime = 0;
        // Format: ActionChar + DeltaTime(Base36) + ; 
        // e.g. "L10;R5;H20"
        const inputsStr = data.inputs.map(f => {
            const delta = Math.max(0, f.time - lastTime); // Ensure non-negative
            lastTime = f.time;
            const code = ACTION_MAP[f.action] || '?';
            return `${code}${delta.toString(36)}`;
        }).join(';');

        return {
            ...data,
            inputs: inputsStr
        };
    }

    private decompress(data: CompressedReplayData): ReplayData {
        const inputs: ReplayFrame[] = [];
        let currentTime = 0;
        
        const segments = data.inputs.split(';');
        for (const seg of segments) {
            if (!seg) continue;
            const charCode = seg.charAt(0);
            const deltaStr = seg.slice(1);
            
            const action = REVERSE_MAP[charCode];
            const delta = parseInt(deltaStr, 36);
            
            if (action && !isNaN(delta)) {
                currentTime += delta;
                inputs.push({ time: currentTime, action });
            }
        }

        return {
            ...data,
            inputs
        };
    }
}

export const replayManager = new ReplayManager();

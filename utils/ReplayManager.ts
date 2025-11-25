
import { ReplayData, ReplayFrame, GameMode, KeyAction, Difficulty } from '../types';
import { safeStorage } from './safeStorage';

const REPLAY_STORAGE_KEY = 'tetrios-last-replay';

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
            safeStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(this.currentReplay));
        }
        this.isRecording = false;
    }

    public startReplay(data: ReplayData | null = null) {
        const replayToLoad = data || safeStorage.getJson<ReplayData>(REPLAY_STORAGE_KEY);
        if (!replayToLoad) return false;

        this.currentReplay = replayToLoad;
        this.isReplaying = true;
        this.isRecording = false;
        this.playbackIndex = 0;
        this.startTime = Date.now();
        return true;
    }

    public getPlaybackInput(gameTime: number): KeyAction[] {
        if (!this.isReplaying || !this.currentReplay) return [];
        
        const actions: KeyAction[] = [];
        
        // Fetch all actions that should have happened by now
        // Using a loop to catch up if frame dropped
        while (this.playbackIndex < this.currentReplay.inputs.length) {
            const frame = this.currentReplay.inputs[this.playbackIndex];
            // Add slight buffer or direct match? Direct match relies on consistent time updates.
            // Better: consume all actions <= gameTime
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
}

export const replayManager = new ReplayManager();

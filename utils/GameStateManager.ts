
import { GameCore } from './GameCore';
import { GameState } from '../types';
import { audioManager } from './audioManager';

type StateConfig = {
    [key in GameState]?: {
        allowedTransitions: GameState[];
        onEnter?: () => void;
        onExit?: () => void;
    };
};

export class GameStateManager {
    private core: GameCore;
    private _currentState: GameState = 'MENU';

    constructor(core: GameCore) {
        this.core = core;
    }

    get currentState(): GameState {
        return this._currentState;
    }

    // Define the State Machine Rules
    private get stateConfig(): StateConfig {
        return {
            MENU: {
                allowedTransitions: ['MAP', 'PLAYING', 'STORY'], // PLAYING via resetGame
                onEnter: () => {
                    audioManager.playUiBack();
                }
            },
            MAP: {
                allowedTransitions: ['MENU', 'BOOSTER_SELECTION', 'STORY', 'PLAYING'], // PLAYING via level select
                onEnter: () => {
                    // Logic for entering map
                }
            },
            STORY: {
                allowedTransitions: ['MAP', 'PLAYING', 'MENU'],
            },
            BOOSTER_SELECTION: {
                allowedTransitions: ['MAP', 'PLAYING'],
            },
            PLAYING: {
                allowedTransitions: ['PAUSED', 'GAMEOVER', 'VICTORY', 'WILDCARD_SELECTION', 'BOMB_SELECTION', 'LINE_SELECTION'],
                onEnter: () => {
                    this.core.resumeGameLoop();
                    audioManager.startMusic();
                },
                onExit: () => {
                    // Pause logic is handled by the loop check, but we can do cleanup here
                }
            },
            PAUSED: {
                allowedTransitions: ['PLAYING', 'MENU'],
                onEnter: () => {
                    this.core.pauseGameLoop();
                    audioManager.stopMusic();
                },
                onExit: () => {
                    audioManager.playUiClick();
                }
            },
            WILDCARD_SELECTION: {
                allowedTransitions: ['PLAYING'],
                onEnter: () => {
                    // Specific logic if needed
                }
            },
            BOMB_SELECTION: {
                allowedTransitions: ['PLAYING'],
            },
            LINE_SELECTION: {
                allowedTransitions: ['PLAYING'],
            },
            GAMEOVER: {
                allowedTransitions: ['MENU', 'MAP', 'PLAYING'], // PLAYING via retry
                onEnter: () => {
                    this.core.pauseGameLoop();
                    audioManager.playGameOver();
                }
            },
            VICTORY: {
                allowedTransitions: ['MENU', 'MAP', 'STORY', 'PLAYING'],
                onEnter: () => {
                    this.core.pauseGameLoop();
                    audioManager.playClear(4); // Victory sound
                }
            }
        };
    }

    public transitionTo(newState: GameState): boolean {
        const config = this.stateConfig[this._currentState];
        const targetConfig = this.stateConfig[newState];

        // Validation: Check if transition is allowed
        // Note: We allow 'PLAYING' to transition from anywhere if it's a hard reset (handled by resetGame usually),
        // but strictly speaking, the FSM should enforce paths.
        if (config && !config.allowedTransitions.includes(newState)) {
            console.warn(`Invalid State Transition: ${this._currentState} -> ${newState}`);
            return false;
        }

        // Execute Exit Action of current state
        if (config?.onExit) {
            config.onExit();
        }

        console.log(`State Change: ${this._currentState} -> ${newState}`);
        const previousState = this._currentState;
        this._currentState = newState;

        // Execute Enter Action of new state
        if (targetConfig?.onEnter) {
            targetConfig.onEnter();
        }

        // Notify React/UI
        this.core.callbacks.onStateChange(newState, previousState);

        return true;
    }

    // Force state set (used during resets/initialization where rules might be bypassed)
    public forceState(newState: GameState): void {
        const config = this.stateConfig[this._currentState];
        if (config?.onExit) config.onExit();

        const previousState = this._currentState;
        this._currentState = newState;
        
        const targetConfig = this.stateConfig[newState];
        if (targetConfig?.onEnter) targetConfig.onEnter();

        this.core.callbacks.onStateChange(newState, previousState);
    }

    public isPlaying(): boolean {
        return this._currentState === 'PLAYING';
    }

    public isPaused(): boolean {
        return this._currentState === 'PAUSED';
    }

    public isMenu(): boolean {
        return this._currentState === 'MENU' || this._currentState === 'MAP';
    }
}


import { KeyAction, KeyMap } from '../types';

interface InputConfig {
  keyMap: KeyMap;
  das: number;
  arr: number;
  flippedGravity?: boolean;
}

export class InputManager {
  private activeKeys: Set<string> = new Set();
  private keyState: Record<string, { pressed: boolean; timer: number; lastActionTime: number }> = {};
  private actionListeners: Set<(action: KeyAction) => void> = new Set();
  private config: InputConfig;

  constructor(config: InputConfig) {
    this.config = config;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public updateConfig(newConfig: Partial<InputConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public addActionListener(listener: (action: KeyAction) => void): void {
    this.actionListeners.add(listener);
  }

  private emitAction(action: KeyAction): void {
    this.actionListeners.forEach(listener => listener(action));
  }

  /**
   * Determines the effective action based on current game state (e.g., flipped gravity).
   * Swaps directional inputs to maintain intuitive controls.
   */
  private getEffectiveAction(action: KeyAction): KeyAction {
    if (this.config.flippedGravity) {
      // In flipped gravity (falling up):
      // Physical Up (rotateCW) should become Soft Drop (fall up)
      // Physical Down (softDrop) should become Rotate (swap)
      if (action === 'softDrop') return 'rotateCW';
      if (action === 'rotateCW') return 'softDrop';
    }
    return action;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent default for all mapped keys
    for (const actionKeys of Object.values(this.config.keyMap)) {
      if (actionKeys.includes(e.key)) {
        e.preventDefault();
        break;
      }
    }

    if (!this.activeKeys.has(e.key)) { 
      this.activeKeys.add(e.key);
      this.keyState[e.key] = { pressed: true, timer: 0, lastActionTime: 0 };
      this.triggerInitialAction(e.key); 
    } else {
      if(this.keyState[e.key]) this.keyState[e.key].pressed = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (this.activeKeys.has(e.key)) {
      this.activeKeys.delete(e.key);
      delete this.keyState[e.key];
    }
  };

  private triggerInitialAction(key: string): void {
    for (const [action, keys] of Object.entries(this.config.keyMap)) {
      if (keys.includes(key)) {
        const effectiveAction = this.getEffectiveAction(action as KeyAction);

        if (['rotateCW', 'rotateCCW', 'hardDrop', 'hold'].includes(effectiveAction)) {
          this.emitAction(effectiveAction);
        } else if (effectiveAction === 'moveLeft' || effectiveAction === 'moveRight' || effectiveAction === 'softDrop') {
          this.emitAction(effectiveAction);
          if (this.keyState[key]) {
            this.keyState[key].lastActionTime = this.keyState[key].timer;
          }
        }
        break;
      }
    }
  }

  public update(deltaTime: number): void {
    const triggeredActions = new Set<KeyAction>();

    this.activeKeys.forEach(key => {
      if (this.keyState[key]) {
        this.keyState[key].timer += deltaTime;
        const { timer, lastActionTime } = this.keyState[key];
        
        for (const [action, keys] of Object.entries(this.config.keyMap)) {
            if (keys.includes(key)) {
                const effectiveAction = this.getEffectiveAction(action as KeyAction);

                if (effectiveAction === 'moveLeft' || effectiveAction === 'moveRight' || effectiveAction === 'softDrop') {
                    // DAS/ARR Logic
                    if (timer > this.config.das && (timer - lastActionTime) >= this.config.arr) {
                        if (!triggeredActions.has(effectiveAction)) {
                            this.emitAction(effectiveAction);
                            triggeredActions.add(effectiveAction);
                        }
                        // Sync timer to prevent interleaved triggers from other keys mapped to the same action
                        this.keyState[key].lastActionTime = timer;
                    }
                }
                break;
            }
        }
      }
    });
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

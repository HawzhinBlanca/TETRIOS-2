import { KeyAction, KeyMap } from '../types';

interface InputConfig {
  keyMap: KeyMap;
  das: number;
  arr: number;
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
        if (['rotateCW', 'rotateCCW', 'hardDrop', 'hold'].includes(action)) {
          this.emitAction(action as KeyAction);
        } else if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
          this.emitAction(action as KeyAction);
          if (this.keyState[key]) {
            this.keyState[key].lastActionTime = this.keyState[key].timer;
          }
        }
        break;
      }
    }
  }

  public update(deltaTime: number): void {
    this.activeKeys.forEach(key => {
      if (this.keyState[key]) {
        this.keyState[key].timer += deltaTime;
        const { timer, lastActionTime } = this.keyState[key];
        
        for (const [action, keys] of Object.entries(this.config.keyMap)) {
            if (keys.includes(key)) {
                if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
                    // DAS/ARR Logic
                    if (timer > this.config.das && (timer - lastActionTime) >= this.config.arr) {
                        this.emitAction(action as KeyAction);
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
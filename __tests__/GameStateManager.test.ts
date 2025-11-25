
import { GameStateManager } from '../utils/GameStateManager';
import { GameCore } from '../utils/GameCore';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

jest.mock('../utils/audioManager', () => ({
    audioManager: {
        startMusic: jest.fn(),
        stopMusic: jest.fn(),
        playUiBack: jest.fn(),
        playUiClick: jest.fn(),
        playGameOver: jest.fn(),
        playClear: jest.fn(),
    }
}));

const mockCore = {
  resumeGameLoop: jest.fn(),
  pauseGameLoop: jest.fn(),
  callbacks: {
    onStateChange: jest.fn(),
  }
} as unknown as GameCore;

describe('GameStateManager', () => {
  let stateManager: GameStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new GameStateManager(mockCore);
  });

  it('starts in MENU state', () => {
    expect(stateManager.currentState).toBe('MENU');
  });

  it('transitions from MENU to PLAYING', () => {
    const success = stateManager.transitionTo('PLAYING');
    expect(success).toBe(true);
    expect(stateManager.currentState).toBe('PLAYING');
    expect(mockCore.resumeGameLoop).toHaveBeenCalled();
  });

  it('transitions from PLAYING to PAUSED', () => {
    stateManager.forceState('PLAYING');
    const success = stateManager.transitionTo('PAUSED');
    expect(success).toBe(true);
    expect(stateManager.currentState).toBe('PAUSED');
    expect(mockCore.pauseGameLoop).toHaveBeenCalled();
  });

  it('blocks invalid transitions', () => {
    stateManager.forceState('MENU');
    const success = stateManager.transitionTo('PAUSED'); // Menu -> Paused invalid
    expect(success).toBe(false);
    expect(stateManager.currentState).toBe('MENU');
  });

  it('allows forcing state', () => {
    stateManager.forceState('GAMEOVER');
    expect(stateManager.currentState).toBe('GAMEOVER');
  });
});
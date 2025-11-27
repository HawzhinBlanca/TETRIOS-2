
import { ScoreManager } from '../utils/ScoreManager';
import { GameCore } from '../utils/GameCore';
import { FRENZY_COMBO_THRESHOLD, SCORES } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mock Audio Manager
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    isOnBeat: jest.fn(),
  }
}));

const mockCore = {
  mode: 'MARATHON',
  events: {
    emit: jest.fn(),
  },
  addFloatingText: jest.fn(),
  triggerGameOver: jest.fn(),
  handleLevelUp: jest.fn(),
  pieceManager: { dropTime: 1000, injectRewardPiece: jest.fn(), player: { pos: { x: 0, y: 0 } } },
  adventureManager: { applyBossDamage: jest.fn(), config: null },
  boardManager: { isBoardEmpty: jest.fn() },
} as unknown as GameCore;

describe('ScoreManager', () => {
  let manager: ScoreManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore.mode = 'MARATHON';
    manager = new ScoreManager(mockCore);
    manager.reset('MARATHON', 0);
  });

  it('handles basic line clear scoring', () => {
    manager.handleLineClear(1, false); // Single
    expect(manager.stats.score).toBe(SCORES.SINGLE);
    expect(manager.stats.rows).toBe(1);
    expect(manager.comboCount).toBe(0);
  });

  it('activates Frenzy Mode on combo threshold', () => {
    manager.comboCount = FRENZY_COMBO_THRESHOLD - 1; // One away
    manager.handleLineClear(1, false);
    
    expect(manager.frenzyActive).toBe(true);
    expect(manager.frenzyMultiplier).toBe(SCORES.FRENZY_MULTIPLIER);
    expect(mockCore.events.emit).toHaveBeenCalledWith('VISUAL_EFFECT', { type: 'FRENZY_START' });
  });

  it('applies Frenzy multiplier to score', () => {
    manager.frenzyActive = true;
    manager.frenzyMultiplier = 2;
    
    manager.applyScore(100);
    expect(manager.stats.score).toBe(200);
  });

  it('handles Blitz Speed Up', () => {
    mockCore.mode = 'BLITZ';
    manager.reset('BLITZ', 0);
    
    manager.applyScore(5000); // First threshold
    
    expect(mockCore.pieceManager.dropTime).toBeLessThan(1000); // Should reduce drop time
    expect(mockCore.events.emit).toHaveBeenCalledWith('BLITZ_SPEED_UP', expect.anything());
  });

  it('handles Time Attack countdown', () => {
    mockCore.mode = 'TIME_ATTACK';
    manager.reset('TIME_ATTACK', 0);
    
    const initialTime = manager.stats.time;
    manager.update(1000); // +1s in Time Attack (elapsed)
    expect(manager.stats.time).toBeGreaterThan(initialTime);
  });

  it('handles Blitz countdown', () => {
      mockCore.mode = 'BLITZ';
      manager.reset('BLITZ', 0);
      const initialTime = manager.stats.time;
      
      manager.update(1000); // -1s in Blitz (remaining)
      expect(manager.stats.time).toBeLessThan(initialTime);
  });
});

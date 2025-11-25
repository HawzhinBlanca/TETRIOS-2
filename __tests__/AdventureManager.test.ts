
import { AdventureManager } from '../utils/AdventureManager';
import { GameCore } from '../utils/GameCore';
import { AdventureLevelConfig } from '../types';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mock dependencies
const mockCore = {
  boardManager: {
    stage: [],
    addGarbage: jest.fn(),
  },
  scoreManager: {
    stats: { score: 0, rows: 0, time: 0, gemsCollected: 0 },
  },
  callbacks: {
    onAudio: jest.fn(),
    onVisualEffect: jest.fn(),
    onGameOver: jest.fn(),
  },
  addFloatingText: jest.fn(),
  triggerGameOver: jest.fn(),
} as unknown as GameCore;

describe('AdventureManager', () => {
  let manager: AdventureManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new AdventureManager(mockCore);
  });

  const mockLevelConfig: AdventureLevelConfig = {
    id: 'test_lvl',
    index: 0,
    title: 'Test Level',
    description: 'Test',
    worldId: 'w1',
    objective: { type: 'LINES', target: 10 },
    style: { background: '#000', accentColor: '#fff' }
  };

  it('initializes correctly with config', () => {
    manager.reset(mockLevelConfig);
    expect(manager.config).toBe(mockLevelConfig);
  });

  it('checks victory condition (LINES)', () => {
    manager.reset(mockLevelConfig);
    mockCore.scoreManager.stats.rows = 5;
    manager.checkObjectives();
    expect(mockCore.triggerGameOver).not.toHaveBeenCalled();

    mockCore.scoreManager.stats.rows = 10;
    manager.checkObjectives();
    expect(mockCore.triggerGameOver).toHaveBeenCalledWith('VICTORY', expect.anything());
  });

  it('handles Boss HP and Damage', () => {
    const bossConfig: AdventureLevelConfig = {
        ...mockLevelConfig,
        objective: { type: 'BOSS', target: 1000 },
        boss: { name: 'TestBoss', ability: 'GARBAGE_RAIN', interval: 1000 }
    };
    manager.reset(bossConfig);
    expect(manager.bossHp).toBe(1000);

    manager.applyBossDamage(500); // 500 score / 100 = 5 damage
    expect(manager.bossHp).toBe(995);
    expect(mockCore.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('-5HP'), expect.anything(), expect.anything());

    manager.applyBossDamage(100000); // Overkill
    expect(manager.bossHp).toBe(0);
    expect(mockCore.triggerGameOver).toHaveBeenCalledWith('VICTORY', expect.anything());
  });

  it('triggers boss ability on timer', () => {
    const bossConfig: AdventureLevelConfig = {
        ...mockLevelConfig,
        objective: { type: 'BOSS', target: 1000 },
        boss: { name: 'TestBoss', ability: 'GARBAGE_RAIN', interval: 1000 }
    };
    manager.reset(bossConfig);
    
    manager.update(500);
    expect(mockCore.boardManager.addGarbage).not.toHaveBeenCalled();
    
    manager.update(600); // Total 1100ms
    expect(mockCore.boardManager.addGarbage).toHaveBeenCalled();
    expect(manager.bossTimer).toBe(100); // Remainder
  });

  it('fails on Move Limit', () => {
      const limitConfig: AdventureLevelConfig = {
          ...mockLevelConfig,
          constraints: { movesLimit: 5 }
      };
      manager.reset(limitConfig);
      mockCore.scoreManager.stats.movesTaken = 4;
      manager.checkObjectives();
      expect(mockCore.triggerGameOver).not.toHaveBeenCalled();

      mockCore.scoreManager.stats.movesTaken = 5;
      manager.checkObjectives();
      expect(mockCore.triggerGameOver).toHaveBeenCalledWith('GAMEOVER');
  });
});
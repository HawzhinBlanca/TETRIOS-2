
import { BoosterManager } from '../utils/BoosterManager';
import { GameCore } from '../utils/GameCore';
import { SLOW_TIME_BOOSTER_DURATION_MS } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

const mockCore = {
  addFloatingText: jest.fn(),
  setFlippedGravity: jest.fn(),
  pieceManager: { canHold: false },
  events: {
    emit: jest.fn(),
  },
  boardManager: {
      stage: Array(20).fill(Array(10).fill([null, 'clear'])),
      sweepRows: jest.fn(),
  },
  applyScore: jest.fn(),
  flippedGravity: false,
  initialFlippedGravityGimmick: false
} as unknown as GameCore;

describe('BoosterManager', () => {
  let manager: BoosterManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new BoosterManager(mockCore);
  });

  it('initializes active boosters correctly', () => {
    manager.reset(['SLOW_TIME_BOOSTER', 'BOMB_BOOSTER']);
    expect(manager.slowTimeActive).toBe(true);
    expect(manager.bombBoosterReady).toBe(true);
    expect(manager.slowTimeTimer).toBe(SLOW_TIME_BOOSTER_DURATION_MS);
    expect(mockCore.addFloatingText).toHaveBeenCalled();
  });

  it('updates Slow Time timer', () => {
    manager.reset(['SLOW_TIME_BOOSTER']);
    
    manager.update(1000);
    expect(manager.slowTimeTimer).toBe(SLOW_TIME_BOOSTER_DURATION_MS - 1000);
    expect(mockCore.events.emit).toHaveBeenCalledWith('SLOW_TIME_CHANGE', { active: true, timer: expect.any(Number) });

    manager.update(SLOW_TIME_BOOSTER_DURATION_MS);
    expect(manager.slowTimeActive).toBe(false);
    expect(mockCore.events.emit).toHaveBeenCalledWith('SLOW_TIME_CHANGE', { active: false, timer: 0 });
  });

  it('executes Bomb Booster', () => {
    manager.reset(['BOMB_BOOSTER']);
    manager.activateBombBoosterSelection();
    expect(manager.isSelectingBombRows).toBe(true);
    
    manager.executeBombBooster(18, 2);
    
    expect(manager.isSelectingBombRows).toBe(false);
    expect(mockCore.boardManager.sweepRows).toHaveBeenCalled();
    expect(manager.activeBoosters).not.toContain('BOMB_BOOSTER'); // Consumed
  });

  it('executes Line Clearer', () => {
      manager.reset(['LINE_CLEARER_BOOSTER']);
      manager.activateLineClearerSelection();
      expect(manager.isSelectingLine).toBe(true);

      manager.executeLineClearer(19);

      expect(manager.isSelectingLine).toBe(false);
      expect(mockCore.boardManager.sweepRows).toHaveBeenCalled();
      expect(manager.activeBoosters).not.toContain('LINE_CLEARER_BOOSTER');
  });
});

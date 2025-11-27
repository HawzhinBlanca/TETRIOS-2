
import { BoardManager } from '../utils/BoardManager';
import { ScoreManager } from '../utils/ScoreManager';
import { GameCore } from '../utils/GameCore';
import { STAGE_HEIGHT } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mocks
jest.mock('../utils/audioManager', () => ({
  audioManager: {
      isOnBeat: jest.fn(),
  }
}));

const mockCore = {
  flippedGravity: false,
  events: {
    emit: jest.fn(),
  },
  scoreManager: {
      stats: { isZoneActive: false },
      handleLineClear: jest.fn().mockReturnValue({ score: 100, text: 'SINGLE', isBackToBack: false }),
      resetCombo: jest.fn(),
  },
  adventureManager: { checkObjectives: jest.fn(), applyBossDamage: jest.fn() },
  fxManager: { addFloatingText: jest.fn() },
  addFloatingText: jest.fn(),
  applyScore: jest.fn(),
  boosterManager: { activeBoosters: [] },
} as unknown as GameCore;

// Init ScoreManager mock
// mockCore.scoreManager = new ScoreManager(mockCore);

describe('BoardManager', () => {
  let boardManager: BoardManager;

  beforeEach(() => {
    jest.clearAllMocks();
    boardManager = new BoardManager(mockCore);
    boardManager.initialize('MARATHON', 0);
  });

  it('initializes an empty stage', () => {
    expect(boardManager.stage.length).toBe(STAGE_HEIGHT);
    expect(boardManager.stage[0][0][1]).toBe('clear');
  });

  it('adds garbage lines', () => {
    boardManager.addGarbage(2);
    expect(boardManager.garbagePending).toBe(2);
    expect(mockCore.events.emit).toHaveBeenCalledWith('GARBAGE_CHANGE', 2);
    
    boardManager.processGarbage();
    // Bottom line should be garbage
    expect(boardManager.stage[STAGE_HEIGHT - 1][0][0]).toBe('G');
    expect(boardManager.garbagePending).toBe(0);
  });

  it('detects empty board', () => {
    expect(boardManager.isBoardEmpty()).toBe(true);
    boardManager.addGarbage(1);
    boardManager.processGarbage();
    expect(boardManager.isBoardEmpty()).toBe(false);
  });

  it('clears full rows', () => {
    // Fill bottom row
    boardManager.stage[STAGE_HEIGHT - 1].fill(['I', 'merged']);
    
    boardManager.sweepRows(boardManager.stage);
    
    // Row should be cleared (moved/removed)
    expect(boardManager.stage[STAGE_HEIGHT - 1][0][1]).toBe('clear');
    // With mocked scoreManager, we check if handleLineClear was called
    expect(mockCore.scoreManager.handleLineClear).toHaveBeenCalled();
    expect(mockCore.events.emit).toHaveBeenCalledWith('AUDIO', expect.objectContaining({ event: 'CLEAR_1' }));
  });
});

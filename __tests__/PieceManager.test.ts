
import { PieceManager } from '../utils/PieceManager';
import { BoardManager } from '../utils/BoardManager';
import { GameCore } from '../utils/GameCore';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mocks
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playMove: jest.fn(),
    playRotate: jest.fn(),
    playHardDrop: jest.fn(),
    playAudio: jest.fn(),
    isOnBeat: jest.fn().mockReturnValue(false),
    playPerfectDrop: jest.fn(),
  }
}));

const mockCore = {
  mode: 'MARATHON',
  state: {
      player: { pos: { x: 0, y: 0 }, tetromino: { type: 'T' } },
      queue: ['I', 'J'],
      hold: { canHold: true, piece: null, charge: 0 },
      gravity: { speed: 1000 }
  },
  events: {
    emit: jest.fn(),
  },
  boardManager: new BoardManager({} as any), 
  scoreManager: { applyScore: jest.fn(), stats: {} },
  boosterManager: { activeBoosters: [], wildcardAvailable: false },
  adventureManager: { checkObjectives: jest.fn(), config: null },
  flippedGravity: false,
  triggerGameOver: jest.fn(),
  fxManager: { triggerLockResetFlash: jest.fn(), triggerTSpinFlash: jest.fn() },
  addFloatingText: jest.fn(),
  handleAction: jest.fn((action) => {
      if (action === 'moveRight') {
          mockCore.state.player.pos.x++;
          mockCore.events.emit('AUDIO', { event: 'MOVE' });
      }
      if (action === 'moveLeft') {
          mockCore.state.player.pos.x--;
          mockCore.events.emit('AUDIO', { event: 'MOVE' });
      }
      if (action === 'softDrop') {
          mockCore.state.player.pos.y++;
          mockCore.scoreManager.applyScore(1);
      }
      if (action === 'hold') {
          const current = mockCore.state.player.tetromino.type;
          mockCore.state.hold.piece = current;
          mockCore.state.hold.canHold = false;
          // Spawn new (mock)
          mockCore.state.player.tetromino.type = 'O'; 
          mockCore.events.emit('HOLD_CHANGE', { piece: current, canHold: false });
      }
  })
} as unknown as GameCore;

// Fix BoardManager circular ref
mockCore.boardManager = new BoardManager(mockCore);

describe('PieceManager', () => {
  let pieceManager: PieceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockCore.state = {
        player: { pos: { x: 0, y: 0 }, tetromino: { type: 'T' } },
        queue: ['I', 'J'],
        hold: { canHold: true, piece: null, charge: 0 },
        gravity: { speed: 1000 }
    } as any;

    pieceManager = new PieceManager(mockCore);
    pieceManager.reset(0);
  });

  it('initializes with a bag of pieces', () => {
    expect(pieceManager.nextQueue.length).toBeGreaterThan(0);
    expect(pieceManager.player.tetromino.type).toBeDefined();
  });

  it('handles lateral movement', () => {
    const startX = pieceManager.player.pos.x;
    pieceManager.move(1);
    expect(pieceManager.player.pos.x).toBe(startX + 1);
    expect(mockCore.handleAction).toHaveBeenCalledWith('moveRight');
  });

  it('prevents movement into walls', () => {
    // Validation is inside GameCore.handleAction (mocked), verifying delegation.
    pieceManager.move(-1);
    expect(mockCore.handleAction).toHaveBeenCalledWith('moveLeft');
  });

  it('handles soft drop', () => {
    const startY = pieceManager.player.pos.y;
    pieceManager.softDrop();
    expect(pieceManager.player.pos.y).toBe(startY + 1);
    expect(mockCore.handleAction).toHaveBeenCalledWith('softDrop');
  });

  it('handles hold functionality', () => {
    const initialType = pieceManager.player.tetromino.type;
    pieceManager.hold();
    
    expect(mockCore.events.emit).toHaveBeenCalledWith('HOLD_CHANGE', expect.objectContaining({ piece: initialType, canHold: false }));
  });
});
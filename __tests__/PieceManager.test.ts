
import { PieceManager } from '../utils/PieceManager';
import { CollisionManager } from '../utils/CollisionManager';
import { BoardManager } from '../utils/BoardManager';
import { ScoreManager } from '../utils/ScoreManager';
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
  }
}));

const mockCore = {
  mode: 'MARATHON',
  callbacks: {
    onQueueChange: jest.fn(),
    onHoldChange: jest.fn(),
    onGroundedChange: jest.fn(),
    onAiTrigger: jest.fn(),
    onAudio: jest.fn(),
    onVisualEffect: jest.fn(),
    onStatsChange: jest.fn(),
  },
  collisionManager: new CollisionManager(),
  boardManager: new BoardManager({} as any), // Circular dependency hack, minimal mock
  scoreManager: { applySoftDrop: jest.fn(), applyHardDrop: jest.fn(), stats: {} },
  boosterManager: { activeBoosters: [], wildcardAvailable: false },
  adventureManager: { checkObjectives: jest.fn() },
  flippedGravity: false,
  triggerGameOver: jest.fn(),
} as unknown as GameCore;

// Fix BoardManager circular ref
mockCore.boardManager = new BoardManager(mockCore);

describe('PieceManager', () => {
  let pieceManager: PieceManager;

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockCore.callbacks.onAudio).toHaveBeenCalledWith('MOVE', expect.anything());
  });

  it('prevents movement into walls', () => {
    // Move to far left
    pieceManager.player.pos.x = 0;
    const moved = pieceManager.move(-1);
    expect(moved).toBe(false);
    expect(pieceManager.player.pos.x).toBe(0);
  });

  it('handles soft drop', () => {
    const startY = pieceManager.player.pos.y;
    pieceManager.softDrop();
    expect(pieceManager.player.pos.y).toBe(startY + 1);
    expect(mockCore.scoreManager.applySoftDrop).toHaveBeenCalled();
  });

  it('handles hold functionality', () => {
    const initialType = pieceManager.player.tetromino.type;
    pieceManager.hold();
    
    expect(pieceManager.heldPiece).toBe(initialType);
    expect(pieceManager.player.tetromino.type).not.toBe(initialType); // Spawns new piece
    expect(pieceManager.canHold).toBe(false); // Cannot hold twice
    expect(mockCore.callbacks.onHoldChange).toHaveBeenCalledWith(initialType, false);
  });

  it('updates gravity (drop)', () => {
    pieceManager.dropTime = 50;
    const startY = pieceManager.player.pos.y;
    
    pieceManager.update(60); // Delta > DropTime
    
    expect(pieceManager.player.pos.y).toBe(startY + 1);
  });
});
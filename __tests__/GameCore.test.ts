
import { GameCore } from '../utils/GameCore';
import { InputManager } from '../utils/InputManager';
import { DEFAULT_DAS, DEFAULT_ARR, DEFAULT_CONTROLS } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;
declare var beforeEach: any;

// Mock Audio Manager
jest.mock('../utils/audioManager', () => ({
  audioManager: {
    playUiHover: jest.fn(),
    playUiClick: jest.fn(),
    playUiSelect: jest.fn(),
    playUiBack: jest.fn(),
    playMove: jest.fn(),
    playRotate: jest.fn(),
    playHardDrop: jest.fn(),
    playLock: jest.fn(),
    playSoftLand: jest.fn(),
    init: jest.fn(),
    setIntensity: jest.fn(),
    setTempo: jest.fn(),
    updateDynamicMix: jest.fn(),
  }
}));

// Mock Input Manager to allow headless testing
class MockInputManager extends InputManager {
    constructor() {
        super({ keyMap: DEFAULT_CONTROLS, das: DEFAULT_DAS, arr: DEFAULT_ARR });
    }
    // Override standard methods that might rely on DOM
    addActionListener(listener: (action: any) => void) {
        // We can manually trigger this in tests if needed, but for GameCore tests
        // we often call GameCore methods directly.
    }
    update() {}
    destroy() {}
}

describe('GameCore Integration', () => {
    let game: GameCore;
    let emitSpy: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Instantiate GameCore with correct signature
        game = new GameCore({
            keyMap: DEFAULT_CONTROLS,
            das: DEFAULT_DAS,
            arr: DEFAULT_ARR
        });

        emitSpy = jest.spyOn(game.events, 'emit');
    });

    it('should initialize with default stats', () => {
        game.resetGame('MARATHON', 0, undefined);
        expect(game.scoreManager.stats.score).toBe(0);
        expect(game.scoreManager.stats.level).toBe(0);
        expect(game.pieceManager.nextQueue.length).toBeGreaterThan(0);
    });

    it('should handle hard drop and lock piece', () => {
        game.resetGame('MARATHON', 0, undefined);
        const initialPiece = game.pieceManager.player.tetromino.type;
        
        // Simulate Hard Drop
        game.handleAction('hardDrop');
        
        // Assertions
        expect(game.scoreManager.stats.score).toBeGreaterThan(0); // Should score points for drop
        
        // Check if LOCK audio event was emitted
        expect(emitSpy).toHaveBeenCalledWith('AUDIO', expect.objectContaining({ event: 'LOCK', type: initialPiece }));
        
        // Queue should have shifted
        expect(game.pieceManager.player.tetromino.type).not.toBe(initialPiece);
    });

    it('should handle line clears', () => {
        game.resetGame('MARATHON', 0, undefined);
        
        // Manually set up a board with a full line
        const fullRow = Array(10).fill(['I', 'merged']);
        game.boardManager.stage[19] = fullRow;
        
        // Trigger sweep (normally called by lockPiece, but we can test isolation)
        game.sweepRows(game.boardManager.stage);
        
        expect(game.scoreManager.stats.rows).toBe(1);
        expect(game.scoreManager.stats.score).toBeGreaterThan(100); // Single clear score
        expect(emitSpy).toHaveBeenCalledWith('AUDIO', expect.objectContaining({ event: 'CLEAR_1' }));
    });

    it('should transition to Game Over when topping out', () => {
        game.resetGame('MARATHON', 0, undefined);
        
        // Fill the board to top
        for(let y=0; y<20; y++) {
            game.boardManager.stage[y].fill(['G', 'merged']);
        }
        
        // Try to spawn a piece
        game.spawnPiece();
        
        expect(emitSpy).toHaveBeenCalledWith('GAME_OVER', expect.anything());
    });
});
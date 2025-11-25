
import { CollisionManager } from '../utils/CollisionManager';
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { createStage } from '../utils/gameUtils';
import { Player } from '../types';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeEach: any;

describe('CollisionManager', () => {
  let manager: CollisionManager;
  let stage: any[][];
  let player: Player;

  beforeEach(() => {
    manager = new CollisionManager();
    stage = createStage();
    player = {
      pos: { x: 4, y: 0 },
      tetromino: TETROMINOS['T'], // T shape
      collided: false,
      trail: []
    };
  });

  describe('checkCollision', () => {
    it('detects collision with floor (Standard Gravity)', () => {
      // Position at bottom
      player.pos.y = STAGE_HEIGHT - 2; // T piece height is 2 effective
      // Check moving down 1
      const result = manager.checkCollision(player, stage, { x: 0, y: 1 }, false);
      // Depending on shape definition, T might have empty rows. 
      // Standard T shape: [[0, 'T', 0], ['T', 'T', 'T'], [0, 0, 0]]
      // y=0 is top row (mostly 0). y=1 is middle (full).
      expect(result).toBe(false); 
      
      // Move further down to definitely collide
      player.pos.y = STAGE_HEIGHT - 1;
      const resultHard = manager.checkCollision(player, stage, { x: 0, y: 1 }, false);
      expect(resultHard).toBe(true);
    });

    it('detects collision with walls', () => {
      player.pos.x = -1; 
      const resultLeft = manager.checkCollision(player, stage, { x: 0, y: 0 }, false);
      expect(resultLeft).toBe(true);

      player.pos.x = STAGE_WIDTH;
      const resultRight = manager.checkCollision(player, stage, { x: 0, y: 0 }, false);
      expect(resultRight).toBe(true);
    });

    it('detects collision with other blocks', () => {
      stage[5][4] = ['I', 'merged'];
      player.pos.y = 4;
      player.pos.x = 4;
      // T-piece center is at 1,1 relative to pos. 
      // T shape row 1 is ['T','T','T'].
      // If player is at 4,4. Row 1 is at y=5.
      // stage[5][4] is occupied.
      // player.shape[1][0] is T. Relative x=0. Absolute x=4.
      // Collision!
      const result = manager.checkCollision(player, stage, { x: 0, y: 0 }, false);
      expect(result).toBe(true);
    });

    it('handles Flipped Gravity bounds', () => {
      // In flipped gravity, floor is y < 0
      player.pos.y = 0;
      const result = manager.checkCollision(player, stage, { x: 0, y: -1 }, true);
      expect(result).toBe(true);
    });
  });

  describe('checkOverlap', () => {
    it('returns true if specific coordinate overlaps player block', () => {
      player.pos = { x: 10, y: 10 };
      // T Piece: 
      // 0 1 0
      // 1 1 1
      // 0 0 0
      
      // Center (11, 11) should overlap
      expect(manager.checkOverlap(player, 11, 11)).toBe(true);
      // Top Left (10, 10) is 0, should NOT overlap
      expect(manager.checkOverlap(player, 10, 10)).toBe(false);
    });
  });

  describe('isTSpin', () => {
    it('detects T-Spin based on 3-corner rule', () => {
        // Mock a T-Spin setup
        // X . X
        // . T .
        // X T X
        
        // Clear stage
        stage = createStage();
        player.tetromino = TETROMINOS['T'];
        player.pos = { x: 1, y: 1 };
        
        // Fill corners around player
        stage[1][1] = ['G', 'merged']; // Top-Left relative to T-center? 
        // isTSpin checks corners of the 3x3 bounding box: (0,0), (2,0), (0,2), (2,2) relative to pos
        // Player at 1,1. Corners are: (1,1), (3,1), (1,3), (3,3)
        
        stage[1][1] = ['G', 'merged'];
        stage[3][1] = ['G', 'merged'];
        stage[1][3] = ['G', 'merged'];
        
        expect(manager.isTSpin(player, stage, 0, false)).toBe(true);
    });
  });
});

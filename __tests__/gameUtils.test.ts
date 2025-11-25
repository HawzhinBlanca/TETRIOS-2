
import { rotateMatrix, generateBag, parseRgb, createStage } from '../utils/gameUtils';
import { STAGE_WIDTH, STAGE_HEIGHT } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe('gameUtils', () => {
  describe('createStage', () => {
    it('creates a stage of correct dimensions', () => {
      const stage = createStage(10, 20);
      expect(stage.length).toBe(20);
      expect(stage[0].length).toBe(10);
      expect(stage[0][0][1]).toBe('clear');
    });
  });

  describe('rotateMatrix', () => {
    it('rotates clockwise correctly', () => {
      const matrix = [[1, 2], [3, 4]];
      // Expected: [[3, 1], [4, 2]]
      const result = rotateMatrix(matrix as any, 1);
      expect(result[0][0]).toBe(3);
      expect(result[0][1]).toBe(1);
    });

    it('rotates counter-clockwise correctly', () => {
      const matrix = [[1, 2], [3, 4]];
      // Expected: [[2, 4], [1, 3]]
      const result = rotateMatrix(matrix as any, -1);
      expect(result[0][0]).toBe(2);
      expect(result[0][1]).toBe(4);
    });
  });

  describe('generateBag', () => {
    it('returns a shuffled bag of 7 unique tetrominos', () => {
      const bag = generateBag();
      expect(bag.length).toBe(7);
      const unique = new Set(bag);
      expect(unique.size).toBe(7);
      expect(unique.has('I')).toBe(true);
      expect(unique.has('T')).toBe(true);
    });
  });

  describe('parseRgb', () => {
    it('parses hex colors to rgb string', () => {
      expect(parseRgb('#ff0000')).toBe('255,0,0');
      expect(parseRgb('#00ff00')).toBe('0,255,0');
      expect(parseRgb('#0000ff')).toBe('0,0,255');
    });

    it('parses short hex', () => {
      expect(parseRgb('#f00')).toBe('255,0,0');
    });

    it('parses rgb strings', () => {
      expect(parseRgb('rgb(100, 100, 100)')).toBe('100, 100, 100');
    });

    it('handles robustly invalid input', () => {
      expect(parseRgb('invalid')).toBe('255,255,255'); // Default fallback
      expect(parseRgb(null as any)).toBe('255,255,255');
    });
  });
});
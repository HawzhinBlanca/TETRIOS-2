
import { calculateScore } from '../utils/scoreRules';
import { SCORES } from '../constants';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe('scoreRules', () => {
  const MOCK_LEVEL = 0;

  describe('calculateScore', () => {
    it('returns correct score for Single line clear', () => {
      const result = calculateScore(1, MOCK_LEVEL, false, false, 0);
      expect(result.score).toBe(SCORES.SINGLE);
      expect(result.text).toContain('SINGLE');
      expect(result.isBackToBack).toBe(false);
    });

    it('returns correct score for Tetris (4 lines)', () => {
      const result = calculateScore(4, MOCK_LEVEL, false, false, 0);
      expect(result.score).toBe(SCORES.TETRIS);
      expect(result.text).toBe('TETRIS');
      expect(result.isBackToBack).toBe(true);
      expect(result.visualShake).toBe('hard');
    });

    it('applies Back-to-Back bonus correctly', () => {
      // Previous was difficult (isBackToBack=true), Current is Tetris
      const result = calculateScore(4, MOCK_LEVEL, false, true, 0);
      const expected = Math.floor(SCORES.TETRIS * SCORES.BACK_TO_BACK_MULTIPLIER);
      expect(result.score).toBe(expected);
      expect(result.text).toContain('B2B');
      expect(result.isBackToBack).toBe(true);
    });

    it('breaks Back-to-Back sequence on easy clear', () => {
      // Previous was difficult, Current is Single
      const result = calculateScore(1, MOCK_LEVEL, false, true, 0);
      expect(result.score).toBe(SCORES.SINGLE); // No bonus
      expect(result.isBackToBack).toBe(false); // B2B broken
    });

    it('handles T-Spin Double correctly', () => {
      const result = calculateScore(2, MOCK_LEVEL, true, false, 0);
      expect(result.score).toBe(SCORES.TSPIN_DOUBLE);
      expect(result.text).toBe('T-SPIN DOUBLE');
      expect(result.isBackToBack).toBe(true); // T-Spins enable B2B
    });

    it('handles T-Spin Zero (No lines cleared)', () => {
      const result = calculateScore(0, MOCK_LEVEL, true, true, 0);
      expect(result.score).toBe(SCORES.TSPIN);
      expect(result.text).toBe('T-SPIN');
      expect(result.isBackToBack).toBe(true); // Maintains B2B
    });

    it('calculates Combo bonuses', () => {
      // Combo count 2 (3rd consecutive clear)
      const combo = 2;
      const result = calculateScore(1, MOCK_LEVEL, false, false, combo);
      const expected = SCORES.SINGLE + (SCORES.COMBO_FACTOR * combo);
      expect(result.score).toBe(expected);
      expect(result.text).toContain(`+${combo} COMBO`);
    });

    it('scales score with level', () => {
      const level = 9;
      const result = calculateScore(1, level, false, false, 0);
      expect(result.score).toBe(SCORES.SINGLE * (level + 1));
    });
  });
});
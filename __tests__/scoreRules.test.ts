
import { calculateScore } from '../utils/scoreRules';
import { SCORES } from '../constants';

declare const describe: (name: string, callback: () => void) => void;
declare const it: (name: string, callback: () => void) => void;
declare const expect: (actual: any) => { 
    toBe: (expected: any) => void; 
    toEqual: (expected: any) => void; 
    toContain: (expected: any) => void; 
};

describe('calculateScore', () => {
  const MOCK_LEVEL = 0;

  it('should calculate score for a Single clear', () => {
    const result = calculateScore(1, MOCK_LEVEL, false, false, 0);
    expect(result.score).toBe(SCORES.SINGLE);
    expect(result.isBackToBack).toBe(false);
  });

  it('should calculate score for a Tetris', () => {
    const result = calculateScore(4, MOCK_LEVEL, false, false, 0);
    expect(result.score).toBe(SCORES.TETRIS);
    expect(result.isBackToBack).toBe(true);
  });

  it('should apply Back-to-Back bonus for consecutive Tetrises', () => {
    // First Tetris sets B2B true (tested above)
    // Second Tetris with B2B true
    const result = calculateScore(4, MOCK_LEVEL, false, true, 0);
    const expected = Math.floor(SCORES.TETRIS * SCORES.BACK_TO_BACK_MULTIPLIER);
    expect(result.score).toBe(expected);
    expect(result.text).toContain('B2B');
  });

  it('should break Back-to-Back on a Single', () => {
    const result = calculateScore(1, MOCK_LEVEL, false, true, 0);
    expect(result.score).toBe(SCORES.SINGLE); // No multiplier
    expect(result.isBackToBack).toBe(false);
  });

  it('should calculate T-Spin Double score', () => {
    const result = calculateScore(2, MOCK_LEVEL, true, false, 0);
    expect(result.score).toBe(SCORES.TSPIN_DOUBLE);
    expect(result.text).toBe('T-SPIN DOUBLE');
    expect(result.isBackToBack).toBe(true);
  });

  it('should apply Combo bonus', () => {
    const comboCount = 2;
    const result = calculateScore(1, MOCK_LEVEL, false, false, comboCount);
    const expected = SCORES.SINGLE + (SCORES.COMBO_FACTOR * comboCount);
    expect(result.score).toBe(expected);
    expect(result.text).toContain('COMBO');
  });
});

import { SCORES } from '../constants';
import { GameState } from '../types'; // Assuming GameState is needed for context but not directly used in score calculation.

/**
 * Interface for the result of a score calculation.
 */
export interface ScoreResult {
  score: number;
  text: string;
  isBackToBack: boolean;
  soundLevel: number; // Represents the number of lines cleared for sound purposes
  visualShake: 'hard' | 'soft' | null;
}

/**
 * Pure function to calculate score, text, and effects based on clearing action.
 * Adheres to standard Tetris scoring rules, including T-Spins, Back-to-Back, and Combos.
 * @param {number} rowsCleared The number of lines cleared by the current action.
 * @param {number} level The current game level.
 * @param {boolean} isTSpin True if a T-Spin was performed.
 * @param {boolean} isBackToBack True if the previous difficult clear was B2B.
 * @param {number} comboCount The current combo chain count (0 for first clear in chain).
 * @returns {ScoreResult} An object containing the calculated score, text, B2B status, sound level, and visual shake.
 */
export const calculateScore = (
  rowsCleared: number,
  level: number,
  isTSpin: boolean,
  isBackToBack: boolean,
  comboCount: number
): ScoreResult => {
  let score: number = 0;
  let text: string = '';
  let soundLevel: number = rowsCleared;
  let visualShake: 'hard' | 'soft' | null = 'soft'; // Default shake for line clears
  let newBackToBack: boolean = isBackToBack; // Track new B2B status for next clear

  // 1. Base Score & Text (T-Spin or Standard Clears)
  if (isTSpin) {
    const tSpinScores: number[] = [SCORES.TSPIN, SCORES.TSPIN_SINGLE, SCORES.TSPIN_DOUBLE, SCORES.TSPIN_TRIPLE]; // T-Spin 0, 1, 2, 3 lines
    // Clamp rowsCleared to max 3 for T-Spin scores
    score = (tSpinScores[Math.min(rowsCleared, 3)] || SCORES.TSPIN) * (level + 1);
    
    if (rowsCleared === 3) text = 'T-SPIN TRIPLE';
    else if (rowsCleared === 2) text = 'T-SPIN DOUBLE';
    else if (rowsCleared === 1) text = 'T-SPIN SINGLE';
    else text = 'T-SPIN'; // T-Spin Zero

    // T-Spins (with lines) maintain/start B2B
    if (rowsCleared > 0) newBackToBack = true; 
    else newBackToBack = isBackToBack; // T-Spin Zero maintains B2B but doesn't start it if not active

  } else {
    // Standard Clears
    const basePoints: number[] = [0, SCORES.SINGLE, SCORES.DOUBLE, SCORES.TRIPLE, SCORES.TETRIS];
    score = (basePoints[rowsCleared] || 0) * (level + 1);

    if (rowsCleared === 4) {
      text = 'TETRIS';
      visualShake = 'hard'; // Stronger shake for Tetris
      newBackToBack = true; // Tetris maintains/starts B2B
    } else if (rowsCleared > 0) {
      text = rowsCleared === 3 ? 'TRIPLE' : rowsCleared === 2 ? 'DOUBLE' : 'SINGLE';
      newBackToBack = false; // Non-Tetris clears break B2B
    }
  }

  // 2. Back-to-Back Bonus
  // Apply B2B multiplier *after* base score if the current clear is a 'difficult' clear (Tetris or T-Spin with lines)
  // AND the previous clear was also a difficult clear.
  const isDifficultClear: boolean = (isTSpin && rowsCleared > 0) || rowsCleared === 4;
  if (isBackToBack && isDifficultClear) {
    score *= SCORES.BACK_TO_BACK_MULTIPLIER;
    if (text) text += ' B2B'; // Append B2B to text
  }

  // 3. Combo Bonus (applies to any line clear when combo is active)
  if (rowsCleared > 0 && comboCount > 0) {
    score += SCORES.COMBO_FACTOR * comboCount * (level + 1);
    text += ` +${comboCount} COMBO`;
  }

  return {
    score,
    text,
    isBackToBack: newBackToBack,
    soundLevel,
    visualShake: rowsCleared > 0 ? visualShake : null // Only shake if lines were cleared
  };
};
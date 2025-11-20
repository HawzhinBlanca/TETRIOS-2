
import { SCORES } from '../constants';

export interface ScoreResult {
  score: number;
  text: string;
  isBackToBack: boolean;
  soundLevel: number; // 0-4 for clears, specific ID for T-Spin etc if expanded
  visualShake: 'hard' | 'soft' | null;
}

/**
 * Pure function to calculate score, text, and effects based on clearing action.
 */
export const calculateScore = (
  rowsCleared: number,
  level: number,
  isTSpin: boolean,
  isBackToBack: boolean,
  comboCount: number
): ScoreResult => {
  let score = 0;
  let text = '';
  let soundLevel = rowsCleared;
  let visualShake: 'hard' | 'soft' | null = 'soft';
  let newBackToBack = isBackToBack;

  // 1. Base Score & Text
  if (isTSpin) {
    const tSpinScores = [0, SCORES.TSPIN_SINGLE, SCORES.TSPIN_DOUBLE, SCORES.TSPIN_TRIPLE];
    // Fallback to Triple if rows > 3 (unlikely for standard T-Spin)
    score = (tSpinScores[rowsCleared] || SCORES.TSPIN_TRIPLE) * (level + 1);
    
    if (rowsCleared === 3) text = 'T-SPIN TRIPLE';
    else if (rowsCleared === 2) text = 'T-SPIN DOUBLE';
    else if (rowsCleared === 1) text = 'T-SPIN SINGLE';
    else text = 'T-SPIN'; // T-Spin Zero

    if (isBackToBack && rowsCleared > 0) {
      score *= SCORES.BACK_TO_BACK_MULTIPLIER;
      text += ' B2B';
    }
    // T-Spin moves (even 0 line) maintain B2B if they are difficult enough, 
    // but standard rules usually require lines for B2B. 
    // Assuming logic: Lines > 0 sets B2B true.
    if (rowsCleared > 0) newBackToBack = true;
    
  } else {
    // Standard Clears
    const basePoints = [0, SCORES.SINGLE, SCORES.DOUBLE, SCORES.TRIPLE, SCORES.TETRIS];
    score = (basePoints[rowsCleared] || 0) * (level + 1);

    if (rowsCleared === 4) {
      text = 'TETRIS';
      visualShake = 'hard';
      if (isBackToBack) {
        score *= SCORES.BACK_TO_BACK_MULTIPLIER;
        text += ' B2B';
      }
      newBackToBack = true;
    } else if (rowsCleared > 0) {
      text = rowsCleared === 3 ? 'TRIPLE' : rowsCleared === 2 ? 'DOUBLE' : 'SINGLE';
      newBackToBack = false;
    }
  }

  // 2. Combo Bonus
  if (rowsCleared > 0 && comboCount > 0) {
    score += SCORES.COMBO_FACTOR * comboCount * (level + 1);
    text += ` +${comboCount} COMBO`;
  }

  return {
    score,
    text,
    isBackToBack: newBackToBack,
    soundLevel,
    visualShake: rowsCleared > 0 ? visualShake : null
  };
};

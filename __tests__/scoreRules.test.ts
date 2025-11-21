
// Basic test setup for scoring rules.
// Note: In a real environment, you would run this with Jest or Vitest.

import { calculateScore } from '../utils/scoreRules';
import { SCORES } from '../constants';

// Mock console for test output
const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    } else {
        // console.log(`✅ PASS: ${message}`);
    }
};

export const runScoreTests = () => {
    console.log("Running Score Tests...");

    // Test 1: Single Line Clear
    let result = calculateScore(1, 0, false, false, -1);
    assert(result.score === SCORES.SINGLE, "Single line clear (level 0) should be 100");
    assert(result.text === 'SINGLE', "Single line text correct");
    assert(result.isBackToBack === false, "Single clear should break B2B");

    // Test 2: Tetris (4 lines)
    result = calculateScore(4, 0, false, false, -1);
    assert(result.score === SCORES.TETRIS, "Tetris (level 0) should be 800");
    assert(result.text === 'TETRIS', "Tetris text correct");
    assert(result.isBackToBack === true, "Tetris should enable B2B");

    // Test 3: Back-to-Back Tetris
    result = calculateScore(4, 0, false, true, -1);
    assert(result.score === SCORES.TETRIS * SCORES.BACK_TO_BACK_MULTIPLIER, "B2B Tetris should be 1200");
    assert(result.text.includes('B2B'), "B2B text present");

    // Test 4: T-Spin Double
    result = calculateScore(2, 0, true, false, -1);
    assert(result.score === SCORES.TSPIN_DOUBLE, "T-Spin Double (level 0) should be 1200");
    assert(result.text === 'T-SPIN DOUBLE', "TSD text correct");
    assert(result.isBackToBack === true, "TSD should enable B2B");

    // Test 5: Combo
    result = calculateScore(1, 0, false, false, 1); // Combo count 1
    const expectedScore = SCORES.SINGLE + (SCORES.COMBO_FACTOR * 1);
    assert(result.score === expectedScore, "Single with Combo 1 calculation");
    assert(result.text.includes('COMBO'), "Combo text present");

    console.log("All Score Tests Passed.");
};

// Run tests if in a test environment (mocked here)
// runScoreTests(); 

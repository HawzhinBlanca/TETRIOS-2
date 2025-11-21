
import { checkCollision, rotateMatrix, createStage } from '../utils/gameUtils';
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT } from '../constants';
import { Board, Player } from '../types';

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    }
};

export const runGameUtilsTests = () => {
    console.log("Running Game Utils Tests...");

    // Test 1: Rotate Matrix
    const matrix = [
        [1, 2],
        [3, 4]
    ];
    // Cast inputs and outputs to any/unknown to bypass type safety for mock data validation
    const rotatedCW = rotateMatrix(matrix as any, 1) as any;
    assert(rotatedCW[0][0] === 3 && rotatedCW[0][1] === 1, "Matrix rotated CW correctly");
    const rotatedCCW = rotateMatrix(matrix as any, -1) as any;
    assert(rotatedCCW[0][0] === 2 && rotatedCCW[0][1] === 4, "Matrix rotated CCW correctly");

    // Test 2: Collision Detection (Wall)
    const stage = createStage();
    const player: Player = {
        pos: { x: -1, y: 0 }, // Partially outside left
        tetromino: TETROMINOS['I'], // I piece is wide
        collided: false
    };
    // I piece shape is 4x4. If x=-1, x=0 index is 0 (empty), x=1 is 'I'.
    // At x=-1, the block at index 1 is at world x=0. Valid.
    // But index 0 is at world x=-1.
    // Wait, I piece shape:
    // [[0, I, 0, 0], ...]
    // at x=-1, 'I' is at -1 + 1 = 0. Valid.
    // But let's move it further left.
    
    player.pos.x = -2; 
    // 'I' is at -2 + 1 = -1. Collision!
    const collisionLeft = checkCollision(player, stage, { x: 0, y: 0 });
    assert(collisionLeft === true, "Collision detected on left wall");

    // Test 3: Collision (Floor)
    player.pos.x = 5;
    player.pos.y = STAGE_HEIGHT - 1; // I piece lowest block is at row 1 inside shape.
    // Shape:
    // 0: 0000
    // 1: IIII
    // ...
    // y = 19. Block is at 19 + 1 = 20. Collision.
    const collisionFloor = checkCollision(player, stage, { x: 0, y: 0 });
    assert(collisionFloor === true, "Collision detected on floor");

    console.log("All Game Utils Tests Passed.");
};
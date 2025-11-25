
import { Player, Board, TetrominoType, Position } from '../types';
import { STAGE_WIDTH, STAGE_HEIGHT, KICKS } from '../constants';

const KICK_TRANSITIONS: Record<string, { index: number; modifier: number }> = {
  '0->1': { index: 0, modifier: 1 },
  '1->0': { index: 0, modifier: -1 },
  '1->2': { index: 1, modifier: 1 },
  '2->1': { index: 1, modifier: -1 },
  '2->3': { index: 2, modifier: 1 },
  '3->2': { index: 2, modifier: -1 },
  '3->0': { index: 3, modifier: 1 },
  '0->3': { index: 3, modifier: -1 },
};

// Static offset array for T-Spin corners relative to center (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
// Relative to the 3x3 bounding box top-left: (0,0), (2,0), (0,2), (2,2)
const TSPIN_OFFSETS = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: 2, y: 2 }
];

export class CollisionManager {
    /**
     * Checks if a player's tetromino collides with the stage boundaries or merged blocks.
     * Optimized for early exits.
     */
    public checkCollision(
        player: Player,
        stage: Board,
        { x: moveX, y: moveY }: { x: number; y: number },
        flippedGravity: boolean = false
    ): boolean {
        const { shape } = player.tetromino;
        const shapeSize = shape.length;
        if (shapeSize === 0) return false;
        
        const { x: posX, y: posY } = player.pos;
        const targetStartX = posX + moveX;
        const targetStartY = posY + moveY;

        // Optimization: Board dimensions are constant during a check
        const boardH = STAGE_HEIGHT;
        const boardW = STAGE_WIDTH;

        // Standard nested loop for 4x4 matrix is extremely fast, 
        // but we can ensure we don't access undefined array indices.
        for (let y = 0; y < shapeSize; y++) {
            const row = shape[y];
            const targetY = targetStartY + y;

            // Pre-calculate vertical boundary checks that apply to the whole row
            const isCeiling = flippedGravity ? targetY < 0 : targetY < 0; 
            const isFloor = flippedGravity ? targetY < 0 : targetY >= boardH; // In flipped, floor is < 0

            // Optimization: Skip empty rows
            // (Tetromino shapes often have empty rows)
            let hasBlock = false;
            for(let k=0; k<row.length; k++) if(row[k]!==0) { hasBlock=true; break; }
            if(!hasBlock) continue;

            for (let x = 0; x < row.length; x++) {
                if (row[x] !== 0) {
                    const targetX = targetStartX + x;

                    // 1. Horizontal Walls
                    if (targetX < 0 || targetX >= boardW) return true;

                    // 2. Vertical Floor/Ceiling
                    // Logic:
                    // Normal: Floor is Y >= Height. Ceiling is Y < 0 (usually allowed for spawn but dangerous)
                    // Flipped: Floor is Y < 0. Ceiling is Y >= Height.
                    
                    if (flippedGravity) {
                        if (targetY < 0) return true; // Hit floor (top)
                    } else {
                        if (targetY >= boardH) return true; // Hit floor (bottom)
                    }

                    // 3. Block Collision
                    if (targetY >= 0 && targetY < boardH) {
                        // Accessing stage[targetY][targetX] is safe due to bounds checks above
                        if (stage[targetY][targetX][1] !== 'clear') {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Checks if a specific coordinate overlaps with any block of the player's current tetromino.
     */
    public checkOverlap(player: Player, targetX: number, targetY: number): boolean {
        const { shape } = player.tetromino;
        const { x: posX, y: posY } = player.pos;
        
        // Quick bounding box check before detailed shape check
        const size = shape.length;
        if (targetX < posX || targetX >= posX + size || targetY < posY || targetY >= posY + size) {
            return false;
        }

        // Detailed shape check
        const relX = targetX - posX;
        const relY = targetY - posY;
        
        // Safety check for shape bounds (rotation might change effective width, but matrix is square)
        if (shape[relY] && shape[relY][relX] !== 0) {
            return true;
        }
        
        return false;
    }

    /**
     * Retrieves wall kick data for a given tetromino type, rotation state, and direction.
     */
    public getWallKicks(type: TetrominoType, rotationState: number, direction: number): number[][] {
        let nextState = (rotationState + direction) % 4;
        if (nextState < 0) nextState += 4;

        const transitionKey = `${rotationState}->${nextState}`;
        const transition = KICK_TRANSITIONS[transitionKey];

        if (!transition) return [[0, 0]];

        const kickKey = type === 'I' ? 'I' : 'JLSTZ';
        const kickData = KICKS[kickKey][transition.index];

        return kickData.map(k => [k[0] * transition.modifier, k[1] * transition.modifier]);
    }

    /**
     * Detects if a T-Spin has occurred based on the 3-corner rule.
     * Optimized to reuse static offset array.
     */
    public isTSpin(player: Player, stage: Board, rotationState: number, flippedGravity: boolean): boolean {
        if (player.tetromino.type !== 'T') return false;

        const { x: startX, y: startY } = player.pos;
        let occupiedCorners = 0;

        for (let i = 0; i < 4; i++) {
            const offset = TSPIN_OFFSETS[i];
            const tx = startX + offset.x;
            const ty = startY + offset.y;

            // Wall is occupied
            if (tx < 0 || tx >= STAGE_WIDTH) {
                occupiedCorners++;
                continue;
            }

            // Floor is occupied, Sky is empty
            if (flippedGravity) {
                if (ty < 0) { occupiedCorners++; continue; }
                if (ty >= STAGE_HEIGHT) continue;
            } else {
                if (ty >= STAGE_HEIGHT) { occupiedCorners++; continue; }
                if (ty < 0) continue;
            }

            // Block check
            if (stage[ty][tx][1] !== 'clear') {
                occupiedCorners++;
            }
        }
        
        return occupiedCorners >= 3;
    }
}

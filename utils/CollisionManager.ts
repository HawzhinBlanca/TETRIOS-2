
import { Player, Board, TetrominoType } from '../types';
import { KICKS } from '../constants';

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

const TSPIN_OFFSETS = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: 2, y: 2 }
];

export class CollisionManager {
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

        // Dynamic Dimensions from Stage
        const boardH = stage.length;
        const boardW = stage[0]?.length || 0;

        for (let y = 0; y < shapeSize; y++) {
            const row = shape[y];
            const targetY = targetStartY + y;

            let hasBlock = false;
            for(let k=0; k<row.length; k++) if(row[k]!==0) { hasBlock=true; break; }
            if(!hasBlock) continue;

            for (let x = 0; x < row.length; x++) {
                if (row[x] !== 0) {
                    const targetX = targetStartX + x;

                    if (targetX < 0 || targetX >= boardW) return true;

                    if (flippedGravity) {
                        if (targetY < 0) return true; 
                    } else {
                        if (targetY >= boardH) return true; 
                    }

                    if (targetY >= 0 && targetY < boardH) {
                        if (stage[targetY][targetX][1] !== 'clear') {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    public checkOverlap(player: Player, targetX: number, targetY: number): boolean {
        const { shape } = player.tetromino;
        const { x: posX, y: posY } = player.pos;
        const size = shape.length;
        if (targetX < posX || targetX >= posX + size || targetY < posY || targetY >= posY + size) {
            return false;
        }
        const relX = targetX - posX;
        const relY = targetY - posY;
        if (shape[relY] && shape[relY][relX] !== 0) {
            return true;
        }
        return false;
    }

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

    public isTSpin(player: Player, stage: Board, rotationState: number, flippedGravity: boolean): boolean {
        if (player.tetromino.type !== 'T') return false;

        const { x: startX, y: startY } = player.pos;
        const boardH = stage.length;
        const boardW = stage[0]?.length || 0;
        let occupiedCorners = 0;

        for (let i = 0; i < 4; i++) {
            const offset = TSPIN_OFFSETS[i];
            const tx = startX + offset.x;
            const ty = startY + offset.y;

            if (tx < 0 || tx >= boardW) {
                occupiedCorners++;
                continue;
            }

            if (flippedGravity) {
                if (ty < 0) { occupiedCorners++; continue; }
                if (ty >= boardH) continue;
            } else {
                if (ty >= boardH) { occupiedCorners++; continue; }
                if (ty < 0) continue;
            }

            if (stage[ty][tx][1] !== 'clear') {
                occupiedCorners++;
            }
        }
        
        return occupiedCorners >= 3;
    }
}

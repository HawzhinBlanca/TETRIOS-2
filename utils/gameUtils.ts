
import { STAGE_HEIGHT, STAGE_WIDTH, TETROMINOS, KICKS, PuzzleDefinition } from '../constants';
import { Board, CellData, TetrominoType, Player } from '../types';

export const createStage = (): Board =>
  Array.from(Array(STAGE_HEIGHT), () =>
    new Array(STAGE_WIDTH).fill([null, 'clear'])
  );

export const createPuzzleStage = (puzzle: PuzzleDefinition): Board => {
    const stage = createStage();
    // Map layout from bottom up
    const layout = [...puzzle.layout].reverse();
    
    layout.forEach((rowStr, yIndex) => {
        const stageY = STAGE_HEIGHT - 1 - yIndex;
        if (stageY >= 0) {
            rowStr.split('').forEach((char, x) => {
                if (char === 'X') {
                    stage[stageY][x] = ['G', 'merged'];
                }
            });
        }
    });
    return stage;
};

export const addGarbageLines = (stage: Board, count: number): Board => {
    const newStage = stage.map(row => [...row]);
    for(let i=0; i<count; i++) {
        newStage.shift(); // Remove top row (game over check happens elsewhere usually)
        const hole = Math.floor(Math.random() * STAGE_WIDTH);
        const garbageRow: CellData[] = Array.from({ length: STAGE_WIDTH }, (_, x) => 
            x === hole ? [null, 'clear'] : ['G', 'merged']
        );
        newStage.push(garbageRow);
    }
    return newStage;
};

export const generateBag = (): TetrominoType[] => {
  const shapes: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }
  return shapes;
};

export const randomTetromino = (bag: TetrominoType[]): { piece: any; newBag: TetrominoType[] } => {
  if (bag.length === 0) bag = generateBag();
  const type = bag.pop()!;
  if (bag.length < 7) bag = [...generateBag(), ...bag];
  return { piece: TETROMINOS[type], newBag: bag };
};

export const checkCollision = (
  player: Player,
  stage: Board,
  { x: moveX, y: moveY }: { x: number; y: number }
) => {
  for (let y = 0; y < player.tetromino.shape.length; y += 1) {
    for (let x = 0; x < player.tetromino.shape[y].length; x += 1) {
      if (player.tetromino.shape[y][x] !== 0) {
        if (
          !stage[y + player.pos.y + moveY] ||
          !stage[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
          stage[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !== 'clear'
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

export const rotateMatrix = (matrix: any[][], dir: number) => {
  const rotatedGrid = matrix.map((_, index) => matrix.map((col) => col[index]));
  if (dir > 0) return rotatedGrid.map((row) => row.reverse());
  return rotatedGrid.reverse();
};

export const getWallKicks = (type: TetrominoType, rotationState: number, direction: number) => {
    let nextState = (rotationState + direction) % 4;
    if (nextState < 0) nextState += 4;

    const kickKey = type === 'I' ? 'I' : 'JLSTZ';
    const kickData = KICKS[kickKey];
    
    let kickIndex = -1;
    let modifier = 1;

    if (rotationState === 0 && nextState === 1) kickIndex = 0;
    else if (rotationState === 1 && nextState === 0) { kickIndex = 0; modifier = -1; }
    else if (rotationState === 1 && nextState === 2) kickIndex = 1;
    else if (rotationState === 2 && nextState === 1) { kickIndex = 1; modifier = -1; }
    else if (rotationState === 2 && nextState === 3) kickIndex = 2;
    else if (rotationState === 3 && nextState === 2) { kickIndex = 2; modifier = -1; }
    else if (rotationState === 3 && nextState === 0) kickIndex = 3;
    else if (rotationState === 0 && nextState === 3) { kickIndex = 3; modifier = -1; }

    if (kickIndex === -1) return [[0,0]];

    const rawKicks = kickData[kickIndex];
    return rawKicks.map(k => [k[0] * modifier, k[1] * modifier]);
};

// T-Spin Detection (3-corner rule)
export const isTSpin = (player: Player, stage: Board): boolean => {
    if (player.tetromino.type !== 'T') return false;

    const { x, y } = player.pos;
    // Check 4 corners: (0,0), (2,0), (0,2), (2,2) in local 3x3 grid
    // Global: (x,y), (x+2,y), (x,y+2), (x+2,y+2)
    
    let occupiedCorners = 0;
    const corners = [
        { cx: x, cy: y },         // Top Left
        { cx: x + 2, cy: y },     // Top Right
        { cx: x, cy: y + 2 },     // Bottom Left
        { cx: x + 2, cy: y + 2 }, // Bottom Right
    ];

    corners.forEach(c => {
        // Bounds check: walls/floor count as occupied for T-Spin purposes
        if (c.cx < 0 || c.cx >= STAGE_WIDTH || c.cy >= STAGE_HEIGHT) {
            occupiedCorners++;
        } else if (c.cy >= 0 && stage[c.cy][c.cx][1] !== 'clear') {
            occupiedCorners++;
        }
    });

    return occupiedCorners >= 3;
};

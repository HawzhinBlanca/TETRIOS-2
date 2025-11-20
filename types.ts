
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type TetrominoShape = (string | number)[][];

export interface Tetromino {
  type: TetrominoType;
  shape: TetrominoShape;
  color: string;
}

export type CellData = [TetrominoType | null, string]; // [Type, ColorState] "clear" or "merged"

export type Board = CellData[][];

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  pos: Position;
  tetromino: Tetromino;
  collided: boolean;
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface GameStats {
  score: number;
  rows: number;
  level: number;
}

// AI Types
export interface MoveScore {
  r: number; // rotation (0-3)
  x: number; // x position
  y?: number; // calculated drop y position
  score: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number; // 0 to 1
  color: string;
  scale: number;
}

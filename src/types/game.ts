export type Player = 'black' | 'red';
export type PieceType = 'normal' | 'king' | 'superKing';
export type GameMode = 'single' | 'two-player' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  player: Player;
  type: PieceType;
  position: Position;
  mustContinueCapture?: boolean;
}

export interface GameState {
  pieces: Piece[];
  currentPlayer: Player;
  selectedPiece: string | null;
  validMoves: Position[];
  scores: Record<Player, number>;
  gameOver: boolean;
  winner: Player | null;
  activeCaptureSequence: boolean;
  gameMode: GameMode | null;
  difficulty: Difficulty | null;
  showGameSelection: boolean;
}
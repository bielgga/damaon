export type PlayerColor = 'black' | 'red';
export type PieceType = 'normal' | 'king' | 'superKing';
export type GameMode = 'single' | 'two-player' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
  row: number;
  col: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
}

export interface Room {
  id: string;
  name: string;
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface Piece {
  id: string;
  player: PlayerColor;
  type: PieceType;
  position: Position;
  mustContinueCapture?: boolean;
}

export interface GameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  selectedPiece: string | null;
  validMoves: Position[];
  scores: Record<PlayerColor, number>;
  gameOver: boolean;
  winner: PlayerColor | null;
  activeCaptureSequence: boolean;
  gameMode: GameMode | null;
  difficulty: Difficulty | null;
  showGameSelection: boolean;
  currentRoom: Room | null;
}
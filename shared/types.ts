export type PlayerColor = 'black' | 'red';
export type PieceType = 'normal' | 'king' | 'superKing';
export type GameMode = 'single' | 'two-player' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Player = PlayerColor;

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
  gameData?: GameData;
}

export interface Piece {
  id: string;
  player: PlayerColor;
  type: PieceType;
  position: Position;
  mustContinueCapture?: boolean;
}

export interface GameData {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  scores: Record<PlayerColor, number>;
} 
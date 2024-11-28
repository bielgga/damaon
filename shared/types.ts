export type PlayerColor = 'black' | 'red';
export type PieceType = 'normal' | 'king' | 'superKing';

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
  gameData?: {
    pieces: any[];
    currentPlayer: PlayerColor;
    scores: {
      red: number;
      black: number;
    };
  };
}

export interface Piece {
  id: string;
  player: PlayerColor;
  type: PieceType;
  position: Position;
  mustContinueCapture?: boolean;
} 
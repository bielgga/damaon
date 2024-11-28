export interface RoomPlayer {
  id: string;
  name: string;
  color: 'red' | 'black';
}

export interface Room {
  id: string;
  name: string;
  players: RoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  gameData?: {
    pieces: any[];
    currentPlayer: 'red' | 'black';
    scores: {
      red: number;
      black: number;
    };
  };
} 
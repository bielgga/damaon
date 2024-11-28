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
} 
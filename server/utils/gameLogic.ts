import { Piece } from '../../shared/types';

export function initializeBoard(): Piece[] {
  const pieces: Piece[] = [];
  let id = 1;

  const addPiece = (row: number, col: number, player: 'red' | 'black') => {
    pieces.push({
      id: `${player}-${id++}`,
      player,
      type: 'normal',
      position: { row, col }
    });
  };

  // Adiciona peças pretas (linhas 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        addPiece(row, col, 'black');
      }
    }
  }

  // Adiciona peças vermelhas (linhas 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        addPiece(row, col, 'red');
      }
    }
  }

  return pieces;
} 
import { Piece, Position } from '../../shared/types';

export function getBasicMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // Direções possíveis de movimento
  const directions = piece.type === 'normal'
    ? (piece.player === 'black' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]])
    : [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // Verifica cada direção possível
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;

    // Verifica se está dentro do tabuleiro
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    // Verifica se a posição está vazia
    if (!pieces.some(p => p.position.row === newRow && p.position.col === newCol)) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

export function getCaptureMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // Direções possíveis de captura
  const directions = piece.type === 'normal'
    ? (piece.player === 'black' ? [[2, -2], [2, 2]] : [[-2, -2], [-2, 2]])
    : [[-2, -2], [-2, 2], [2, -2], [2, 2]];

  // Verifica cada direção possível
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const midRow = row + dRow/2;
    const midCol = col + dCol/2;

    // Verifica se está dentro do tabuleiro
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    // Verifica se há uma peça adversária no meio
    const capturedPiece = pieces.find(p => 
      p.position.row === midRow && 
      p.position.col === midCol && 
      p.player !== piece.player
    );

    // Verifica se a posição final está vazia
    const isDestinationEmpty = !pieces.some(p =>
      p.position.row === newRow && p.position.col === newCol
    );

    if (capturedPiece && isDestinationEmpty) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function hasMoreCaptures(piece: Piece, pieces: Piece[]): boolean {
  return getCaptureMoves(piece, pieces).length > 0;
} 
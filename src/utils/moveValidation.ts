import { Piece, Position } from '../types/game';

const DIAGONAL_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function getBasicMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // All pieces can only move one square diagonally for basic moves
  const directions = piece.type === 'normal'
    ? (piece.player === 'black' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]])
    : DIAGONAL_DIRECTIONS;

  // Basic one-square moves (only if not in a capture sequence)
  if (!piece.mustContinueCapture) {
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      
      if (isValidPosition(newRow, newCol) && !pieces.some(p => 
        p.position.row === newRow && p.position.col === newCol
      )) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
}

export function getCaptureMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // Check all diagonal directions
  for (const [dRow, dCol] of DIAGONAL_DIRECTIONS) {
    let foundPiece = false;
    let captureDistance = 0;

    // Look along the diagonal until we find a piece or reach the board edge
    for (let i = 1; i < 8 && !foundPiece; i++) {
      const checkRow = row + dRow * i;
      const checkCol = col + dCol * i;

      if (!isValidPosition(checkRow, checkCol)) break;

      const pieceAtPosition = pieces.find(p => 
        p.position.row === checkRow && p.position.col === checkCol
      );

      if (pieceAtPosition) {
        foundPiece = true;
        // If it's an opponent's piece and we can land behind it
        if (pieceAtPosition.player !== piece.player) {
          const landingRow = checkRow + dRow;
          const landingCol = checkCol + dCol;

          if (isValidPosition(landingRow, landingCol)) {
            const isLandingEmpty = !pieces.some(p => 
              p.position.row === landingRow && p.position.col === landingCol
            );

            if (isLandingEmpty) {
              // For normal pieces, only allow capturing adjacent pieces
              if (piece.type === 'normal' && i > 1) break;

              // For kings and super kings, check if path is clear
              let pathClear = true;
              for (let j = 1; j < i; j++) {
                const pathRow = row + dRow * j;
                const pathCol = col + dCol * j;
                if (pieces.some(p => 
                  p.position.row === pathRow && p.position.col === pathCol
                )) {
                  pathClear = false;
                  break;
                }
              }

              if (pathClear) {
                moves.push({ row: landingRow, col: landingCol });
                captureDistance = i;
              }
            }
          }
        }
        break;
      }
    }
  }

  return moves;
}

export function hasAdditionalCaptures(piece: Piece, pieces: Piece[]): boolean {
  return getCaptureMoves(piece, pieces).length > 0;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}
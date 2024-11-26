import { Piece, PieceType, Player, Position } from '../types/game';
import { getBasicMoves, getCaptureMoves, hasAdditionalCaptures } from './moveValidation';

export function initializeBoard(): Piece[] {
  const pieces: Piece[] = [];
  const setupRows = (player: Player, startRow: number, direction: number) => {
    for (let row = startRow; row !== startRow + 3 * direction; row += direction) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({
            id: `${player}-${row}-${col}`,
            player,
            type: 'normal',
            position: { row, col },
          });
        }
      }
    }
  };

  setupRows('black', 0, 1);
  setupRows('red', 7, -1);
  return pieces;
}

export function getValidMoves(piece: Piece, pieces: Piece[]): Position[] {
  // If the piece must continue capturing, only return capture moves
  if (piece.mustContinueCapture) {
    return getCaptureMoves(piece, pieces);
  }

  // Check for any pieces that must capture
  const playerPieces = pieces.filter(p => p.player === piece.player);
  const hasCaptures = playerPieces.some(p => getCaptureMoves(p, pieces).length > 0);

  // If any piece can capture, only those moves are valid
  if (hasCaptures) {
    return getCaptureMoves(piece, pieces);
  }

  // If no captures are available, return basic moves
  return getBasicMoves(piece, pieces);
}

export function makeMove(
  pieces: Piece[],
  from: Position,
  to: Position,
  currentPlayer: Player
): { newPieces: Piece[], captured: boolean, turnEnds: boolean } | null {
  const piece = pieces.find(p => p.position.row === from.row && p.position.col === from.col);
  if (!piece || piece.player !== currentPlayer) return null;

  const validMoves = getValidMoves(piece, pieces);
  if (!validMoves.some(move => move.row === to.row && move.col === to.col)) return null;

  let newPieces = pieces.filter(p => p !== piece);
  
  // Check if this was a capture move
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);
  const isCapture = rowDiff > 1 || colDiff > 1;
  
  if (isCapture) {
    const dRow = Math.sign(to.row - from.row);
    const dCol = Math.sign(to.col - from.col);
    
    // Find and remove captured piece
    for (let i = 1; i < Math.max(rowDiff, colDiff); i++) {
      const checkRow = from.row + dRow * i;
      const checkCol = from.col + dCol * i;
      const capturedPiece = pieces.find(p => 
        p.position.row === checkRow && 
        p.position.col === checkCol &&
        p.player !== piece.player
      );
      
      if (capturedPiece) {
        newPieces = newPieces.filter(p => p !== capturedPiece);
        break;
      }
    }
  }

  // Check for promotion
  let newType = piece.type;
  const isAtOppositeEnd = (piece.player === 'black' && to.row === 7) ||
                         (piece.player === 'red' && to.row === 0);
  
  if (isAtOppositeEnd) {
    newType = piece.type === 'king' ? 'superKing' : 'king';
  }

  const updatedPiece = {
    ...piece,
    position: to,
    type: newType,
    mustContinueCapture: false // Reset by default
  };

  // Check for additional captures
  if (isCapture) {
    const tempPieces = [...newPieces, updatedPiece];
    const hasMore = hasAdditionalCaptures(updatedPiece, tempPieces);
    if (hasMore) {
      updatedPiece.mustContinueCapture = true;
    }
  }

  newPieces.push(updatedPiece);

  return { 
    newPieces, 
    captured: isCapture,
    turnEnds: !updatedPiece.mustContinueCapture
  };
}
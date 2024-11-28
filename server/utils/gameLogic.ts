import { Piece, Position, PlayerColor } from '../../shared/types';

export function isValidMove(
  from: Position,
  to: Position,
  pieces: Piece[],
  currentPlayer: PlayerColor
): boolean {
  const piece = pieces.find(p => p.position.row === from.row && p.position.col === from.col);
  if (!piece || piece.player !== currentPlayer) return false;

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  // Verifica se o movimento é diagonal
  if (rowDiff !== colDiff) return false;

  // Verifica se está dentro do tabuleiro
  if (to.row < 0 || to.row > 7 || to.col < 0 || to.col > 7) return false;

  // Verifica se o destino está ocupado
  if (pieces.some(p => p.position.row === to.row && p.position.col === to.col)) {
    return false;
  }

  // Movimento normal (1 casa)
  if (rowDiff === 1) {
    // Peças normais só podem mover para frente
    if (piece.type === 'normal') {
      const direction = currentPlayer === 'black' ? 1 : -1;
      if (Math.sign(to.row - from.row) !== direction) return false;
    }
    return true;
  }

  // Movimento de captura (2 casas)
  if (rowDiff === 2) {
    const midRow = (from.row + to.row) / 2;
    const midCol = (from.col + to.col) / 2;
    const capturedPiece = pieces.find(
      p => p.position.row === midRow && 
          p.position.col === midCol && 
          p.player !== currentPlayer
    );
    
    if (!capturedPiece) return false;

    // Peças normais só podem capturar para frente
    if (piece.type === 'normal') {
      const direction = currentPlayer === 'black' ? 1 : -1;
      if (Math.sign(to.row - from.row) !== direction) return false;
    }

    return true;
  }

  return false;
} 
import { Difficulty, Piece, Player, Position } from '../types/game';
import { getValidMoves, makeMove } from './gameLogic';

interface Move {
  from: Position;
  to: Position;
  score: number;
  captureSequence?: Position[];
}

const PIECE_VALUES = {
  normal: 100,
  king: 250,
  superKing: 400,
};

const CENTER_BONUS = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 10, 10, 10, 10, 10, 10, 0],
  [0, 10, 20, 20, 20, 20, 10, 0],
  [0, 10, 20, 30, 30, 20, 10, 0],
  [0, 10, 20, 30, 30, 20, 10, 0],
  [0, 10, 20, 20, 20, 20, 10, 0],
  [0, 10, 10, 10, 10, 10, 10, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const ADVANCEMENT_BONUS = Array(8).fill(0).map((_, i) => i * 15);
const EDGE_PROTECTION = 15;

function evaluateBoard(pieces: Piece[]): number {
  return pieces.reduce((score, piece) => {
    const multiplier = piece.player === 'black' ? 1 : -1;
    const { row, col } = piece.position;
    
    let value = PIECE_VALUES[piece.type];
    value += CENTER_BONUS[row][col];
    
    if (piece.type === 'normal') {
      value += piece.player === 'black' 
        ? ADVANCEMENT_BONUS[row]
        : ADVANCEMENT_BONUS[7 - row];
    }
    
    if (col === 0 || col === 7) {
      value += EDGE_PROTECTION;
    }
    
    const supportingPieces = pieces.filter(p => 
      p.player === piece.player &&
      Math.abs(p.position.row - row) === 1 &&
      Math.abs(p.position.col - col) === 1
    );
    value += supportingPieces.length * 20;
    
    if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
      value += 25;
    }
    
    return score + (value * multiplier);
  }, 0);
}

function findCaptureSequences(
  pieces: Piece[],
  startPiece: Piece,
  currentSequence: Position[] = [],
  visited: Set<string> = new Set()
): Position[][] {
  const sequences: Position[][] = [];
  const validMoves = getValidMoves(startPiece, pieces);
  
  for (const move of validMoves) {
    const moveKey = `${move.row},${move.col}`;
    if (visited.has(moveKey)) continue;

    const result = makeMove(pieces, startPiece.position, move, startPiece.player);
    if (!result || !result.captured) continue;

    const newSequence = [...currentSequence, move];
    sequences.push(newSequence);

    // If there are additional captures available
    if (!result.turnEnds) {
      const updatedPiece = result.newPieces.find(
        p => p.position.row === move.row && p.position.col === move.col
      );
      if (updatedPiece) {
        const newVisited = new Set(visited).add(moveKey);
        const subsequences = findCaptureSequences(
          result.newPieces,
          updatedPiece,
          newSequence,
          newVisited
        );
        sequences.push(...subsequences);
      }
    }
  }

  return sequences;
}

function getAllPossibleMoves(pieces: Piece[], player: Player): Move[] {
  const moves: Move[] = [];
  const playerPieces = pieces.filter(p => p.player === player);
  let hasCaptureMove = false;

  // First, check for capture sequences
  for (const piece of playerPieces) {
    const captureSequences = findCaptureSequences(pieces, piece);
    if (captureSequences.length > 0) {
      hasCaptureMove = true;
      for (const sequence of captureSequences) {
        let currentPieces = [...pieces];
        let currentPiece = piece;
        let totalScore = 0;

        // Simulate the entire capture sequence
        for (const move of sequence) {
          const result = makeMove(currentPieces, currentPiece.position, move, player);
          if (!result) continue;

          currentPieces = result.newPieces;
          currentPiece = currentPieces.find(
            p => p.position.row === move.row && p.position.col === move.col
          )!;
          totalScore += evaluateBoard(currentPieces) + 50; // Bonus for capture
        }

        moves.push({
          from: piece.position,
          to: sequence[sequence.length - 1],
          score: totalScore,
          captureSequence: sequence,
        });
      }
    }
  }

  // If no capture moves are available, add regular moves
  if (!hasCaptureMove) {
    playerPieces.forEach(piece => {
      const validMoves = getValidMoves(piece, pieces);
      validMoves.forEach(move => {
        const result = makeMove(pieces, piece.position, move, player);
        if (result) {
          let moveScore = evaluateBoard(result.newPieces);
          
          const isPromotion = (player === 'black' && move.row === 7) ||
                             (player === 'red' && move.row === 0);
          if (isPromotion) moveScore += 150;

          moves.push({
            from: piece.position,
            to: move,
            score: moveScore,
          });
        }
      });
    });
  }

  return moves;
}

function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  difficulty: Difficulty
): number {
  if (depth === 0) {
    return evaluateBoard(pieces);
  }

  const currentPlayer = maximizingPlayer ? 'black' : 'red';
  const moves = getAllPossibleMoves(pieces, currentPlayer);

  if (difficulty === 'easy' && depth > 2) {
    return evaluateBoard(pieces) + (Math.random() - 0.5) * 200;
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      let result;
      if (move.captureSequence) {
        result = simulateSequence(pieces, move.captureSequence, currentPlayer);
      } else {
        result = makeMove(pieces, move.from, move.to, currentPlayer);
      }

      if (result) {
        const evaluation = minimax(result.newPieces, depth - 1, alpha, beta, false, difficulty);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      let result;
      if (move.captureSequence) {
        result = simulateSequence(pieces, move.captureSequence, currentPlayer);
      } else {
        result = makeMove(pieces, move.from, move.to, currentPlayer);
      }

      if (result) {
        const evaluation = minimax(result.newPieces, depth - 1, alpha, beta, true, difficulty);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
}

function simulateSequence(
  pieces: Piece[],
  sequence: Position[],
  player: Player
): { newPieces: Piece[] } | null {
  let currentPieces = [...pieces];
  let currentPiece = pieces.find(p => 
    p.player === player && 
    sequence.length > 0 && 
    p.position.row === sequence[0].row - 2 && 
    p.position.col === sequence[0].col - 2
  );

  if (!currentPiece) return null;

  for (const move of sequence) {
    const result = makeMove(currentPieces, currentPiece.position, move, player);
    if (!result) return null;

    currentPieces = result.newPieces;
    currentPiece = currentPieces.find(
      p => p.position.row === move.row && p.position.col === move.col
    )!;
  }

  return { newPieces: currentPieces };
}

export function calculateBestMove(pieces: Piece[], difficulty: Difficulty): { from: Position; to: Position } | null {
  const moves = getAllPossibleMoves(pieces, 'black');
  if (!moves.length) return null;

  const searchDepth = {
    easy: 2,
    medium: 4,
    hard: 6,
  }[difficulty];

  const evaluatedMoves = moves.map(move => {
    let result;
    if (move.captureSequence) {
      result = simulateSequence(pieces, move.captureSequence, 'black');
    } else {
      result = makeMove(pieces, move.from, move.to, 'black');
    }

    if (!result) return { ...move, score: -Infinity };

    let score = minimax(result.newPieces, searchDepth, -Infinity, Infinity, false, difficulty);
    
    if (difficulty === 'hard') {
      if (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5) {
        score += 50;
      }
      const piece = pieces.find(p => p.position.row === move.from.row && p.position.col === move.from.col);
      if (piece?.type === 'king' || piece?.type === 'superKing') {
        const isDefensive = move.to.row <= 1 || move.to.col === 0 || move.to.col === 7;
        if (isDefensive) score += 30;
      }
    }
    
    return { ...move, score };
  });

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  if (difficulty === 'hard' && evaluatedMoves.length > 1 && Math.random() < 0.1) {
    return evaluatedMoves[1];
  }
  
  return evaluatedMoves[0];
}
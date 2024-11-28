import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Position } from '../types/game';
import { useGameStore } from '../store/gameStore';

interface SquareProps {
  row: number;
  col: number;
  isBlackSquare: boolean;
  children?: ReactNode;
}

export default function Square({ 
  row, 
  col, 
  isBlackSquare, 
  children 
}: SquareProps) {
  const { validMoves, selectedPiece } = useGameStore();
  
  // Verifica se esta posição é um movimento válido
  const isValidMove = validMoves.some(
    move => move.row === row && move.col === col
  );

  // Configuração do droppable
  const { setNodeRef } = useDroppable({
    id: JSON.stringify({ row, col }),
  });

  // Handler para clique no quadrado
  const handleClick = () => {
    if (!selectedPiece) return;
    
    // Se for um movimento válido, realiza o movimento
    if (isValidMove) {
      const store = useGameStore.getState();
      const piece = store.pieces.find(p => p.id === selectedPiece);
      if (piece) {
        store.movePiece(piece.position, { row, col });
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`relative aspect-square ${
        isBlackSquare 
          ? 'bg-slate-800 hover:bg-slate-700' 
          : 'bg-slate-600 hover:bg-slate-500'
      } flex items-center justify-center cursor-pointer transition-all duration-200`}
    >
      {isValidMove && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          className="absolute inset-[15%] rounded-full bg-indigo-400 pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}
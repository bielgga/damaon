import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Piece as PieceType } from '../types/game';
import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

interface PieceProps {
  piece: PieceType;
}

export default function Piece({ piece }: PieceProps) {
  const { id, player, type } = piece;
  const { selectedPiece, currentPlayer } = useGameStore();
  const isSelected = selectedPiece === id;
  const isCurrentPlayer = currentPlayer === player;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: piece,
    disabled: !isCurrentPlayer,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ scale: 0.8 }}
      animate={{ 
        scale: isSelected ? 1.1 : 1,
        boxShadow: isSelected ? '0 0 15px rgba(0,0,0,0.3)' : 'none'
      }}
      className={clsx(
        'w-[80%] h-[80%] rounded-full relative',
        'flex items-center justify-center transition-colors',
        'border-2',
        player === 'black' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-400',
        !isCurrentPlayer && 'opacity-80',
        isCurrentPlayer && 'hover:scale-105'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {(type === 'king' || type === 'superKing') && (
        <Crown 
          className={clsx(
            'w-1/2 h-1/2',
            player === 'black' ? 'text-gray-700' : 'text-red-400',
            type === 'superKing' && 'drop-shadow-lg scale-125'
          )}
        />
      )}
    </motion.div>
  );
}
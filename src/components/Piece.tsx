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
        boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
      }}
      className={clsx(
        'w-[80%] h-[80%] rounded-full relative',
        'flex items-center justify-center transition-all duration-200',
        'shadow-lg backdrop-blur-sm',
        player === 'black' 
          ? 'bg-slate-900 border-2 border-slate-700' 
          : 'bg-gradient-to-br from-rose-500 to-rose-600 border-2 border-rose-400',
        !isCurrentPlayer && 'opacity-80',
        isCurrentPlayer && 'hover:scale-105 cursor-grab active:cursor-grabbing',
        isSelected && 'ring-4 ring-indigo-500/50'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {(type === 'king' || type === 'superKing') && (
        <Crown 
          className={clsx(
            'w-1/2 h-1/2',
            player === 'black' ? 'text-slate-700' : 'text-rose-300',
            type === 'superKing' && 'drop-shadow-lg scale-125'
          )}
        />
      )}
    </motion.div>
  );
}
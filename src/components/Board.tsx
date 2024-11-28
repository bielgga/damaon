import { useGameStore } from '../store/gameStore';
import Square from './Square';
import Piece from './Piece';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';

export default function Board() {
  const { currentRoom } = useGameStore();
  const pieces = currentRoom?.gameData?.pieces || [];
  const { setNodeRef } = useDroppable({ id: 'board' });

  console.log('Current pieces:', pieces); // Debug log

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative"
    >
      {/* Board Glow Effect */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10" />
      
      <div 
        ref={setNodeRef}
        className="grid grid-cols-8 w-[600px] h-[600px] bg-slate-900 rounded-2xl 
                   overflow-hidden shadow-2xl border border-slate-800/50"
      >
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const piece = pieces.find(p => 
            p.position.row === row && 
            p.position.col === col
          );
          const isBlackSquare = (row + col) % 2 === 1;

          return (
            <Square
              key={`${row}-${col}`}
              row={row}
              col={col}
              isBlackSquare={isBlackSquare}
            >
              {piece && (
                <Piece 
                  key={piece.id} 
                  piece={piece} 
                />
              )}
            </Square>
          );
        })}
      </div>
    </motion.div>
  );
}
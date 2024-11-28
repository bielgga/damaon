import { useGameStore } from '../store/gameStore';
import Square from './Square';
import Piece from './Piece';
import { useDroppable } from '@dnd-kit/core';

export default function Board() {
  const { currentRoom } = useGameStore();
  const pieces = currentRoom?.gameData?.pieces || [];
  const { setNodeRef } = useDroppable({ id: 'board' });

  console.log('Rendering board with pieces:', pieces);

  return (
    <div 
      ref={setNodeRef}
      className="grid grid-cols-8 w-[600px] h-[600px] bg-amber-900 rounded-lg overflow-hidden shadow-2xl"
    >
      {Array.from({ length: 64 }, (_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const piece = pieces.find(p => p.position.row === row && p.position.col === col);
        const isBlackSquare = (row + col) % 2 === 1;

        return (
          <Square
            key={`${row}-${col}`}
            row={row}
            col={col}
            isBlackSquare={isBlackSquare}
          >
            {piece && <Piece piece={piece} />}
          </Square>
        );
      })}
    </div>
  );
}
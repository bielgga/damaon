import { useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import Square from './Square';
import Piece from './Piece';
import { motion } from 'framer-motion';
import { RoomPlayer } from '../types/game';

export default function Board() {
  const { pieces, validMoves, selectedPiece, selectPiece, movePiece, currentRoom } = useGameStore();
  const { setNodeRef } = useDroppable({ id: 'board' });

  const getPlayerByColor = (color: 'red' | 'black'): RoomPlayer | undefined => {
    return currentRoom?.players.find(p => p.color === color);
  };

  const handleSquareClick = (row: number, col: number) => {
    const piece = pieces.find(p => p.position.row === row && p.position.col === col);
    
    if (piece) {
      selectPiece(piece.id);
      return;
    }

    if (selectedPiece && validMoves.some(move => move.row === row && move.col === col)) {
      const selectedPieceObj = pieces.find(p => p.id === selectedPiece);
      if (selectedPieceObj) {
        movePiece(selectedPieceObj.position, { row, col });
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex items-center gap-16">
        {/* Avatar Jogador Vermelho */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold">
              {getPlayerByColor('red')?.name[0].toUpperCase() || '?'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-medium">
              {getPlayerByColor('red')?.name || 'Aguardando jogador...'}
            </p>
            <p className="text-sm text-red-400">Vermelho</p>
          </div>
        </motion.div>

        {/* Tabuleiro */}
        <div 
          ref={setNodeRef}
          className="board-grid grid grid-cols-8 border-4 border-amber-950 shadow-2xl rounded-xl overflow-hidden bg-white/5 backdrop-blur-md"
          style={{ width: 'min(80vh, 600px)', height: 'min(80vh, 600px)' }}
        >
          {Array(64).fill(null).map((_, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const piece = pieces.find(p => p.position.row === row && p.position.col === col);
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);

            return (
              <Square 
                key={index} 
                row={row} 
                col={col} 
                isValidMove={isValidMove}
                onClick={() => handleSquareClick(row, col)}
              >
                {piece && <Piece piece={piece} />}
              </Square>
            );
          })}
        </div>

        {/* Avatar Jogador Preto */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold">
              {getPlayerByColor('black')?.name[0].toUpperCase() || '?'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-medium">
              {getPlayerByColor('black')?.name || 'Aguardando jogador...'}
            </p>
            <p className="text-sm text-gray-400">Preto</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
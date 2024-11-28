import { useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import Square from './Square';
import Piece from './Piece';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { socketService } from '../services/socket';
import { Position, Room } from '../types/game';

export default function Board() {
  const { roomId } = useParams();
  const { pieces, validMoves, selectedPiece, selectPiece, movePiece, currentRoom, playerName } = useGameStore();
  const { setNodeRef } = useDroppable({ id: 'board' });

  const handleSquareClick = (row: number, col: number) => {
    if (!isPlayerTurn()) return;

    const piece = pieces.find(p => p.position.row === row && p.position.col === col);
    
    if (piece) {
      selectPiece(piece.id);
      return;
    }

    if (selectedPiece && validMoves.some(move => move.row === row && move.col === col)) {
      const selectedPieceObj = pieces.find(p => p.id === selectedPiece);
      if (selectedPieceObj) {
        const from: Position = selectedPieceObj.position;
        const to: Position = { row, col };

        if (currentRoom && roomId) {
          // Envia o movimento para o servidor
          socketService.makeMove(roomId, from, to);
        }
        
        // Atualiza o estado local
        movePiece(from, to);
      }
    }
  };

  // Verifica se é a vez do jogador atual
  const isPlayerTurn = () => {
    if (!currentRoom || !playerName) return false;
    const player = currentRoom.players.find(p => p.name === playerName);
    if (!player || !currentRoom.gameData) return false;
    return player.color === currentRoom.gameData.currentPlayer;
  };

  const getPlayerName = (color: 'red' | 'black') => {
    const player = currentRoom?.players.find(p => p.color === color);
    return player?.name || 'Aguardando jogador...';
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
              {getPlayerName('red')[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-medium">{getPlayerName('red')}</p>
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
              {getPlayerName('black')[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="text-center">
            <p className="font-medium">{getPlayerName('black')}</p>
            <p className="text-sm text-gray-400">Preto</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import Board from '../components/Board';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { ArrowLeft } from 'lucide-react';
import WaitingRoom from '../components/WaitingRoom';

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, playerName } = useGameStore();

  useEffect(() => {
    if (!roomId || !playerName) {
      navigate('/salas');
      return;
    }

    console.log('Inicializando GameRoom:', { roomId, playerName });
    socketService.connect();

    return () => {
      if (currentRoom) {
        socketService.leaveRoom(currentRoom.id);
      }
    };
  }, [roomId, playerName, navigate]);

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando sala...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10"
      >
        <button
          onClick={() => navigate('/salas')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Salas
        </button>

        {currentRoom.status === 'playing' ? (
          <div className="px-4 py-2 bg-gray-800/50 rounded-xl backdrop-blur-sm">
            {currentRoom.gameData?.currentPlayer === 'red' ? 'Vez do Vermelho' : 'Vez do Preto'}
          </div>
        ) : (
          <div className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl backdrop-blur-sm animate-pulse">
            Aguardando Jogador...
          </div>
        )}
      </motion.div>

      {/* Game Board */}
      <div className="flex items-center justify-center min-h-screen">
        <DndContext onDragEnd={handleDragEnd}>
          <Board />
        </DndContext>
      </div>

      {/* Players */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-8">
        {currentRoom.players.map((player) => (
          <div
            key={player.id}
            className={`px-6 py-3 rounded-xl backdrop-blur-sm ${
              currentRoom.gameData?.currentPlayer === player.color
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800/50'
            }`}
          >
            {player.name} ({player.color === 'red' ? 'Vermelho' : 'Preto'})
          </div>
        ))}
        {currentRoom.players.length === 1 && (
          <div className="px-6 py-3 bg-gray-800/50 rounded-xl backdrop-blur-sm animate-pulse">
            Aguardando Oponente...
          </div>
        )}
      </div>
    </div>
  );
}

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const from = JSON.parse(active.id as string);
  const to = JSON.parse(over.id as string);
  const currentRoom = useGameStore.getState().currentRoom;

  if (currentRoom) {
    socketService.makeMove(currentRoom.id, from, to);
  }
} 
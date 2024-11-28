import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import Board from '../components/Board';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { ArrowLeft, Crown, Users } from 'lucide-react';

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, playerName, setRoomData } = useGameStore();

  useEffect(() => {
    if (!roomId || !playerName) {
      navigate('/salas');
      return;
    }

    console.log('Inicializando GameRoom:', { roomId, playerName });
    
    // Conecta ao socket
    socketService.connect();

    // Configura os listeners
    const handleRoomJoined = (room: any) => {
      console.log('Room joined:', room);
      setRoomData(room);
    };

    const handleGameStarted = (room: any) => {
      console.log('Game started:', room);
      setRoomData(room);
    };

    socketService.socket?.on('roomJoined', handleRoomJoined);
    socketService.socket?.on('gameStarted', handleGameStarted);

    // Tenta entrar na sala
    socketService.joinRoom(roomId, playerName);

    return () => {
      socketService.socket?.off('roomJoined', handleRoomJoined);
      socketService.socket?.off('gameStarted', handleGameStarted);
      if (currentRoom) {
        socketService.leaveRoom(currentRoom.id);
      }
    };
  }, [roomId, playerName, navigate, setRoomData]);

  // Debug logs
  console.log('Current room:', currentRoom);

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Carregando sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="fixed inset-0 bg-grid-pattern opacity-5" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between"
        >
          <button
            onClick={() => navigate('/salas')}
            className="flex items-center gap-2 px-4 py-2 glass-panel hover:bg-slate-800/50"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Salas
          </button>

          <div className="glass-panel px-6 py-3">
            {currentRoom?.status === 'playing' ? (
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-400" />
                <span>
                  Vez do {currentRoom.gameData?.currentPlayer === 'red' ? 'Vermelho' : 'Preto'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="animate-pulse">Aguardando Jogador...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Game Board */}
        <div className="flex items-center justify-center min-h-screen">
          <DndContext onDragEnd={handleDragEnd}>
            <Board />
          </DndContext>
        </div>

        {/* Players */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-8">
          {currentRoom?.players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel px-6 py-3 ${
                currentRoom.gameData?.currentPlayer === player.color
                  ? 'ring-2 ring-indigo-500'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                  ${player.color === 'red' 
                    ? 'bg-gradient-to-br from-rose-500 to-rose-600' 
                    : 'bg-slate-800'}`}
                >
                  {player.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-gray-400">
                    {player.color === 'red' ? 'Vermelho' : 'Preto'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
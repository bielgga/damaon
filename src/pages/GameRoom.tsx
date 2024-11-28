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
    
    // Conecta ao socket apenas se não estiver conectado
    if (!socketService.socket?.connected) {
      socketService.connect();
    }

    // Configura os listeners
    const handleRoomJoined = (room: any) => {
      console.log('Room joined:', room);
      setRoomData(room);
    };

    const handleGameStarted = (room: any) => {
      console.log('Game started:', room);
      setRoomData(room);
    };

    // Remove listeners anteriores para evitar duplicação
    socketService.socket?.off('roomJoined', handleRoomJoined);
    socketService.socket?.off('gameStarted', handleGameStarted);

    // Adiciona novos listeners
    socketService.socket?.on('roomJoined', handleRoomJoined);
    socketService.socket?.on('gameStarted', handleGameStarted);

    // Tenta entrar na sala apenas se não estiver nela
    if (!currentRoom || currentRoom.id !== roomId) {
      socketService.joinRoom(roomId, playerName);
    }

    return () => {
      socketService.socket?.off('roomJoined', handleRoomJoined);
      socketService.socket?.off('gameStarted', handleGameStarted);
      if (currentRoom) {
        socketService.leaveRoom(currentRoom.id);
      }
    };
  }, [roomId, playerName, navigate, setRoomData]);

  if (!currentRoom) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Carregando sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between"
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

        {/* Left Player */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-8 top-1/2 -translate-y-1/2"
        >
          {currentRoom.players.find(p => p.color === 'red') && (
            <PlayerCard
              player={currentRoom.players.find(p => p.color === 'red')!}
              isCurrentTurn={currentRoom.gameData?.currentPlayer === 'red'}
            />
          )}
        </motion.div>

        {/* Game Board */}
        <DndContext onDragEnd={handleDragEnd}>
          <Board />
        </DndContext>

        {/* Right Player */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-8 top-1/2 -translate-y-1/2"
        >
          {currentRoom.players.find(p => p.color === 'black') && (
            <PlayerCard
              player={currentRoom.players.find(p => p.color === 'black')!}
              isCurrentTurn={currentRoom.gameData?.currentPlayer === 'black'}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    color: 'red' | 'black';
  };
  isCurrentTurn: boolean;
}

function PlayerCard({ player, isCurrentTurn }: PlayerCardProps) {
  return (
    <motion.div
      animate={{ 
        scale: isCurrentTurn ? 1.05 : 1,
        opacity: isCurrentTurn ? 1 : 0.8 
      }}
      className={`glass-panel p-6 ${isCurrentTurn ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold
          ${player.color === 'red' 
            ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white' 
            : 'bg-slate-800 text-slate-300'}`}
        >
          {player.name[0].toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-medium">{player.name}</p>
          <p className="text-sm text-gray-400">
            {player.color === 'red' ? 'Vermelho' : 'Preto'}
          </p>
        </div>
        {isCurrentTurn && (
          <div className="flex items-center gap-2 text-indigo-400">
            <Crown className="w-5 h-5" />
            <span className="text-sm">Sua vez</span>
          </div>
        )}
      </div>
    </motion.div>
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
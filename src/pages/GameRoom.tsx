import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import Board from '../components/Board';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { ArrowLeft, Crown, Users } from 'lucide-react';
import { Room, RoomPlayer } from '../types/game';

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
    
    // Conecta ao socket e configura os listeners
    const socket = socketService.connect();

    const handleRoomJoined = (room: Room) => {
      console.log('Room joined:', room);
      setRoomData(room);
    };

    const handleGameStarted = (room: Room) => {
      console.log('Game started:', room);
      setRoomData(room);
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
      navigate('/salas');
    };

    socket?.on('roomJoined', handleRoomJoined);
    socket?.on('gameStarted', handleGameStarted);
    socket?.on('error', handleError);

    // Tenta entrar na sala apenas se não estiver nela
    if (!currentRoom || currentRoom.id !== roomId) {
      socketService.joinRoom(roomId, playerName);
    }

    return () => {
      socket?.off('roomJoined', handleRoomJoined);
      socket?.off('gameStarted', handleGameStarted);
      socket?.off('error', handleError);
      if (currentRoom?.id === roomId) {
        socketService.leaveRoom(roomId);
      }
    };
  }, [roomId, playerName, navigate, setRoomData]);

  // Loading state com timeout
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentRoom) {
        navigate('/salas');
      }
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [currentRoom, navigate]);

  if (isLoading || !currentRoom) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Carregando sala...</p>
        </div>
      </div>
    );
  }

  const redPlayer = currentRoom.players.find(p => p.color === 'red');
  const blackPlayer = currentRoom.players.find(p => p.color === 'black');

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
            {currentRoom.status === 'playing' ? (
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

        {/* Left Player (Red) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-8 top-1/2 -translate-y-1/2"
        >
          {redPlayer && (
            <PlayerCard
              player={redPlayer}
              isCurrentTurn={currentRoom.gameData?.currentPlayer === 'red'}
            />
          )}
        </motion.div>

        {/* Game Board */}
        <DndContext onDragEnd={handleDragEnd}>
          <Board />
        </DndContext>

        {/* Right Player (Black) */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-8 top-1/2 -translate-y-1/2"
        >
          {blackPlayer && (
            <PlayerCard
              player={blackPlayer}
              isCurrentTurn={currentRoom.gameData?.currentPlayer === 'black'}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: RoomPlayer;
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
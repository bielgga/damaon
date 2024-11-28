import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Copy } from 'lucide-react';
import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from './Notifications';

export default function WaitingRoom() {
  const { roomId } = useParams();
  const { currentRoom, playerName } = useGameStore();
  const navigate = useNavigate();
  const notifications = useNotifications();

  useEffect(() => {
    if (!roomId || !playerName) {
      navigate('/salas');
      return;
    }

    console.log('Conectando ao socket na WaitingRoom...');
    socketService.connect();

    // Reconecta à sala se necessário
    if (currentRoom?.id === roomId) {
      console.log('Reconectando à sala:', roomId);
      socketService.joinRoom(roomId, playerName);
    }

    return () => {
      console.log('Limpando WaitingRoom...');
    };
  }, [roomId, playerName, navigate, currentRoom]);

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    notifications.addNotification('success', 'Código copiado!');
  };

  if (!currentRoom) {
    console.log('Sala não encontrada, redirecionando...');
    navigate('/salas');
    return null;
  }

  console.log('Renderizando WaitingRoom:', { currentRoom, roomId });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-8">
        <h2 className="text-2xl font-bold">Aguardando Jogador</h2>
        
        <div className="flex justify-center gap-8">
          {currentRoom.players.map((player, index) => (
            <div key={player.id} className="space-y-4">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold
                ${player.color === 'red' ? 'bg-red-500/20' : 'bg-gray-700'}`}>
                {player.name[0].toUpperCase()}
              </div>
              <p className="font-medium">{player.name}</p>
              <p className="text-sm text-gray-400">{player.color === 'red' ? 'Vermelho' : 'Preto'}</p>
            </div>
          ))}
          {Array(2 - (currentRoom.players.length || 0)).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-gray-700/50 mx-auto animate-pulse" />
              <p className="text-gray-500">Aguardando...</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-700 rounded-xl p-4 space-y-2">
          <p className="text-gray-400">Código da Sala</p>
          <div className="flex items-center justify-center gap-4">
            <p className="text-2xl font-bold tracking-wider">{roomId}</p>
            <button
              onClick={copyRoomId}
              className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
              title="Copiar código"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-gray-400">
          Compartilhe este código com seu oponente para iniciar a partida
        </p>
      </div>
    </motion.div>
  );
} 
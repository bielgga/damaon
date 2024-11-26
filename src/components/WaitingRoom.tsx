import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Copy } from 'lucide-react';

export default function WaitingRoom() {
  const { roomId, currentRoom } = useGameStore();

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-8">
        <h2 className="text-2xl font-bold">Aguardando Jogador</h2>
        
        <div className="flex justify-center gap-8">
          {currentRoom?.players.map((player, index) => (
            <div key={player.id} className="space-y-4">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold
                ${player.color === 'red' ? 'bg-red-500/20' : 'bg-gray-700'}`}>
                {player.name[0].toUpperCase()}
              </div>
              <p className="font-medium">{player.name}</p>
            </div>
          ))}
          {Array(2 - (currentRoom?.players.length || 0)).fill(null).map((_, i) => (
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
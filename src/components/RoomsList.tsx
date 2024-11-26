import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { Users, Clock } from 'lucide-react';

export default function RoomsList() {
  const { availableRooms, playerName, setPlayerName } = useGameStore();
  const [name, setName] = useState('');

  useEffect(() => {
    socketService.connect();
    socketService.getRooms();
    const interval = setInterval(() => socketService.getRooms(), 3000);
    return () => {
      clearInterval(interval);
      socketService.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName) return;
    socketService.createRoom(playerName);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName) return;
    socketService.joinRoom(roomId, playerName);
  };

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setPlayerName(name);
    }
  };

  if (!playerName) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-gray-800 rounded-xl p-6 shadow-xl"
      >
        <form onSubmit={handleSubmitName} className="space-y-4">
          <h2 className="text-xl font-bold text-center">Digite seu nome para começar</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            maxLength={20}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Continuar
          </button>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Salas Disponíveis</h2>
          <p className="text-gray-400">Jogando como: {playerName}</p>
        </div>
        <button
          onClick={handleCreateRoom}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
        >
          Criar Nova Sala
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableRooms.map((room) => (
          <motion.div
            key={room.id}
            whileHover={{ y: -5 }}
            className="bg-gray-800 rounded-xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">{room.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  room.status === 'waiting' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {room.status === 'waiting' ? 'Aguardando' : 'Em jogo'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{room.players.length}/2</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>~15 min</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {room.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      player.color === 'red' ? 'bg-red-500/20' : 'bg-gray-700'
                    }`}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                ))}
                {Array(2 - room.players.length).fill(null).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-10 h-10 rounded-full bg-gray-700/50"
                  />
                ))}
              </div>

              <button
                onClick={() => handleJoinRoom(room.id)}
                disabled={room.status !== 'waiting' || room.players.length >= 2}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                         disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {room.status === 'waiting' ? 'Entrar na Sala' : 'Sala Cheia'}
              </button>
            </div>
          </motion.div>
        ))}

        {availableRooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p>Nenhuma sala disponível no momento</p>
            <p className="mt-2">Crie uma nova sala para começar a jogar!</p>
          </div>
        )}
      </div>
    </div>
  );
} 
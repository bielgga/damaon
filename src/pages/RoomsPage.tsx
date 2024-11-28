import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Plus, Search } from 'lucide-react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';

export default function RoomsPage() {
  const navigate = useNavigate();
  const { availableRooms, playerName } = useGameStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    socketService.connect();
    socketService.getRooms();
    return () => socketService.disconnect();
  }, []);

  const handleCreateRoom = () => {
    if (!playerName) return;
    socketService.createRoom(playerName);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName) return;
    socketService.joinRoom(roomId, playerName);
    navigate(`/sala/${roomId}`);
  };

  const filteredRooms = availableRooms.filter(room => 
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Salas Disponíveis</h1>
          <p className="text-gray-400">Jogando como {playerName}</p>
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar sala..."
              className="pl-10 pr-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            Criar Sala
          </button>
        </div>
      </div>

      {/* Salas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{room.name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm ${
                room.status === 'waiting' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {room.status === 'waiting' ? 'Aguardando' : 'Em jogo'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{room.players.length}/2</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>~15 min</span>
              </div>
            </div>

            <button
              onClick={() => handleJoinRoom(room.id)}
              disabled={room.status !== 'waiting' || room.players.length >= 2}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                       disabled:cursor-not-allowed rounded-xl"
            >
              {room.status === 'waiting' ? 'Entrar na Sala' : 'Sala Cheia'}
            </button>

            <div className="mt-4 text-center text-sm text-gray-500">
              ID da Sala: <span className="font-mono">{room.id}</span>
            </div>
          </motion.div>
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-2">Nenhuma sala encontrada</h3>
              <p className="text-gray-400 mb-6">Seja o primeiro a criar uma sala!</p>
              <button
                onClick={handleCreateRoom}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Criar Sala
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
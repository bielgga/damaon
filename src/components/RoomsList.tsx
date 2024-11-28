import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { Users, Clock, Plus, Crown, Search, Copy } from 'lucide-react';

export default function RoomsList() {
  const { availableRooms, playerName, setPlayerName } = useGameStore();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    socketService.connect();
    socketService.getRooms();
    const interval = setInterval(() => socketService.getRooms(), 2000);
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
      localStorage.setItem('playerName', name);
    }
  };

  const copyRoomId = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    setCopied(roomId);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredRooms = availableRooms.filter(room => 
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.id.toLowerCase().includes(search.toLowerCase())
  );

  if (!playerName) {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-gray-700">
          <form onSubmit={handleSubmitName} className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Bem-vindo!</h2>
              <p className="text-gray-400">Digite seu nome para começar a jogar</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 bg-gray-700/50 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={20}
              />
              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
              >
                Começar a Jogar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold">Salas Disponíveis</h2>
          <p className="text-gray-400">Jogando como <span className="text-blue-400 font-medium">{playerName}</span></p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar sala..."
              className="pl-10 pr-4 py-3 bg-gray-700/50 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleCreateRoom}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Nova Sala
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <motion.div
            key={room.id}
            whileHover={{ y: -5 }}
            className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-xl font-semibold">{room.name}</h3>
                </div>
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
                {room.players.map((player) => (
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

              <div className="pt-2">
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={room.status !== 'waiting' || room.players.length >= 2}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                           disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
                >
                  {room.status === 'waiting' ? 'Entrar na Sala' : 'Sala Cheia'}
                </button>
              </div>

              <div className="text-center text-sm text-gray-500">
                ID da Sala: <span className="font-mono">{room.id}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-2">Nenhuma sala disponível</h3>
              <p className="text-gray-400 mb-6">Seja o primeiro a criar uma sala!</p>
              <button
                onClick={handleCreateRoom}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
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
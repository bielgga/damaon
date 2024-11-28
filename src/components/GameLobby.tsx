import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Users, Trophy, Clock, Crown, Search, Plus, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../components/Notifications';

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    players: Array<{
      id: string;
      name: string;
      color: 'red' | 'black';
    }>;
    status: 'waiting' | 'playing' | 'finished';
  };
  onJoin: (roomId: string) => void;
}

export default function GameLobby() {
  const navigate = useNavigate();
  const { availableRooms, playerName } = useGameStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'players'>('recent');
  const [isCreating, setIsCreating] = useState(false);
  const notifications = useNotifications();

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    console.log('Conectando ao servidor...');
    socketService.connect();
    
    // Solicita lista de salas inicial
    socketService.getRooms();

    // Polling para atualizar lista de salas
    const interval = setInterval(() => {
      if (socketService) {
        socketService.getRooms();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [playerName, navigate]);

  const handleCreateRoom = () => {
    if (!playerName) {
      notifications.addNotification('error', 'Você precisa definir um nome primeiro');
      navigate('/');
      return;
    }
    
    setIsCreating(true);
    try {
      console.log('Criando sala para:', playerName);
      socketService.createRoom(playerName);
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      notifications.addNotification('error', 'Erro ao criar sala');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName) return;
    socketService.joinRoom(roomId, playerName);
    navigate(`/sala/${roomId}`);
  };

  const goBack = () => {
    navigate('/');
  };

  const filteredRooms = availableRooms
    .filter(room => {
      if (filter === 'waiting') return room.status === 'waiting';
      if (filter === 'playing') return room.status === 'playing';
      return true;
    })
    .filter(room => 
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.id.toLowerCase().includes(search.toLowerCase()) ||
      room.players.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'players') {
        return b.players.length - a.players.length;
      }
      // Por padrão, ordena por mais recente
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-bold">Lobby</h2>
            <p className="text-gray-400">
              {availableRooms.length} {availableRooms.length === 1 ? 'sala' : 'salas'} disponíveis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600' : 'hover:bg-white/5'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'waiting' ? 'bg-blue-600' : 'hover:bg-white/5'
              }`}
            >
              Aguardando
            </button>
            <button
              onClick={() => setFilter('playing')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'playing' ? 'bg-blue-600' : 'hover:bg-white/5'
              }`}
            >
              Em Jogo
            </button>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {isCreating ? (
              <>Criando sala...</>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Criar Sala
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, ID ou jogador..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'players')}
          className="px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="recent">Mais Recentes</option>
          <option value="players">Mais Jogadores</option>
        </select>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <RoomCard 
            key={room.id} 
            room={room} 
            onJoin={handleJoinRoom}
          />
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-2">Nenhuma sala encontrada</h3>
              <p className="text-gray-400 mb-6">
                {filter !== 'all' 
                  ? 'Tente mudar os filtros de busca'
                  : 'Seja o primeiro a criar uma sala!'}
              </p>
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

function RoomCard({ room, onJoin }: RoomCardProps) {
  return (
    <motion.div
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
            onClick={() => onJoin(room.id)}
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
  );
} 
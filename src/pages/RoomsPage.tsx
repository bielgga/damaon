import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Plus, Search, Crown, ArrowLeft } from 'lucide-react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { Room } from '../types/game';
import { useNotifications } from '../hooks/useNotifications';

export default function RoomsPage() {
  const navigate = useNavigate();
  const { availableRooms, playerName } = useGameStore();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const notifications = useNotifications();

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    socketService.connect();
    socketService.getRooms();

    const interval = setInterval(() => {
      socketService.getRooms();
    }, 3000);

    return () => {
      clearInterval(interval);
      socketService.disconnect();
    };
  }, [navigate, playerName]);

  const handleCreateRoom = async () => {
    if (!playerName) {
      notifications.addNotification('error', 'Nome do jogador não definido');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Iniciando criação de sala para:', playerName);
      const room = await socketService.createRoom(playerName);
      console.log('Sala criada:', room);
      
      if (room && room.id) {
        console.log('Redirecionando para sala:', room.id);
        navigate(`/sala/${room.id}`, { replace: true });
      } else {
        throw new Error('ID da sala não encontrado');
      }
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      notifications.addNotification('error', 'Erro ao criar sala. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName) return;
    socketService.joinRoom(roomId, playerName);
    navigate(`/sala/${roomId}`, { replace: true });
  };

  const filteredRooms = availableRooms
    .filter(room => {
      if (filter === 'waiting') return room.status === 'waiting';
      if (filter === 'playing') return room.status === 'playing';
      return true;
    })
    .filter(room => 
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.id.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/modos')}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Salas Disponíveis</h1>
              <p className="text-slate-400">
                Jogando como <span className="text-indigo-400 font-medium">{playerName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar sala..."
                className="w-full sm:w-64 pl-10 input-field"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Criar Sala
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 glass-panel p-1 w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-indigo-600' : 'hover:bg-slate-800/50'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('waiting')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'waiting' ? 'bg-indigo-600' : 'hover:bg-slate-800/50'
            }`}
          >
            Aguardando
          </button>
          <button
            onClick={() => setFilter('playing')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'playing' ? 'bg-indigo-600' : 'hover:bg-slate-800/50'
            }`}
          >
            Em Jogo
          </button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoin={handleJoinRoom}
              currentPlayerName={playerName}
            />
          ))}

          {filteredRooms.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full"
            >
              <div className="glass-panel p-8 text-center">
                <Crown className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Nenhuma sala encontrada</h3>
                <p className="text-slate-400 mb-6">
                  {filter !== 'all' 
                    ? 'Tente mudar os filtros de busca'
                    : 'Seja o primeiro a criar uma sala!'}
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="btn-primary"
                >
                  Criar Sala
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: string) => void;
  currentPlayerName: string | null;
}

function RoomCard({ room, onJoin, currentPlayerName }: RoomCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass-panel overflow-hidden"
    >
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-semibold">{room.name}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            room.status === 'waiting' 
              ? 'bg-green-500/20 text-green-400'
              : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            {room.status === 'waiting' ? 'Aguardando' : 'Em jogo'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
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
                player.color === 'red' 
                  ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white' 
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {player.name[0].toUpperCase()}
            </div>
          ))}
          {Array(2 - room.players.length).fill(null).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-sm text-slate-400"
            >
              ?
            </div>
          ))}
        </div>

        <button
          onClick={() => onJoin(room.id)}
          disabled={room.status !== 'waiting' || 
                   room.players.length >= 2 || 
                   room.players.some(p => p.name === currentPlayerName)}
          className="w-full btn-primary disabled:bg-slate-700"
        >
          {room.status === 'waiting' 
            ? room.players.some(p => p.name === currentPlayerName)
              ? 'Você está nesta sala'
              : 'Entrar na Sala'
            : 'Sala Cheia'}
        </button>

        <div className="text-center text-sm text-slate-500">
          ID: <span className="font-mono">{room.id}</span>
        </div>
      </div>
    </motion.div>
  );
} 
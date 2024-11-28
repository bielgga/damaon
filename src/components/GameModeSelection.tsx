import { motion } from 'framer-motion';
import { Users, Bot, UserPlus2, Gamepad2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../services/socket';
import { useNotifications } from '../components/Notifications';

export default function GameModeSelection() {
  const navigate = useNavigate();
  const { playerName } = useGameStore();

  const handlePlayClick = async (modeId: string) => {
    if (modeId === 'online') {
      if (!playerName) {
        navigate('/');
        return;
      }

      try {
        console.log('Iniciando modo online para:', playerName);
        socketService.connect();
        
        navigate('/salas');
      } catch (error) {
        console.error('Erro ao iniciar modo online:', error);
        useNotifications().addNotification('error', 'Erro ao conectar ao servidor');
      }
    }
  };

  const GAME_MODES = [
    {
      id: 'online',
      title: 'Multiplayer Online',
      description: 'Jogue contra outros jogadores em tempo real',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
      available: true
    },
    {
      id: 'ai',
      title: 'Contra IA',
      description: 'Desafie nossa inteligência artificial',
      icon: <Bot className="w-8 h-8" />,
      color: 'bg-purple-500/20',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      available: false,
      comingSoon: true
    },
    {
      id: 'local',
      title: 'Modo Local',
      description: 'Jogue com um amigo no mesmo dispositivo',
      icon: <UserPlus2 className="w-8 h-8" />,
      color: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/20',
      available: false,
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-6"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <Gamepad2 className="w-12 h-12 text-blue-400" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Damas Online
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Escolha seu modo de jogo preferido e comece a se divertir!
          </p>
        </motion.div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {GAME_MODES.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: index * 0.1 }
              }}
              whileHover={{ y: -5 }}
              className={`relative group p-6 rounded-2xl border ${mode.borderColor} 
                backdrop-blur-md overflow-hidden ${!mode.available && 'opacity-60'}`}
            >
              {/* Background Glow */}
              <div className={`absolute inset-0 ${mode.color} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />

              {/* Content */}
              <div className="relative space-y-4">
                <div className={`${mode.color} w-16 h-16 rounded-xl flex items-center justify-center ${mode.textColor}`}>
                  {mode.icon}
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-gray-400">{mode.description}</p>
                </div>

                {mode.available ? (
                  <button
                    onClick={() => handlePlayClick(mode.id)}
                    className={`w-full py-3 ${mode.color} hover:opacity-80 
                             rounded-xl transition-all font-medium ${mode.textColor}`}
                  >
                    Jogar Agora
                  </button>
                ) : (
                  <div className="w-full py-3 bg-gray-800/50 rounded-xl text-center text-gray-400">
                    Em Breve
                  </div>
                )}
              </div>

              {mode.comingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                    Em Breve
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
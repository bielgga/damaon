import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useGameStore } from './store/gameStore';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import GameModeSelection from './components/GameModeSelection';
import WaitingRoom from './components/WaitingRoom';
import { motion } from 'framer-motion';
import { 
  Gamepad2, 
  ChevronLeft, 
  Trophy, 
  Users, 
  Brain,
  Github,
  Timer,
  Sparkles
} from 'lucide-react';
import { Notifications, useNotifications } from './components/Notifications';
import { useEffect } from 'react';

const GAMES = [
  {
    id: 'damas',
    title: 'Damas',
    description: 'Jogo clássico de estratégia',
    features: ['IA Adaptativa', 'Multiplayer Local'],
    image: '/images/dama.png',
    available: true,
    players: '1-2 jogadores',
    time: '15-30 min'
  },
  {
    id: 'xadrez',
    title: 'Xadrez',
    description: 'Em breve',
    features: ['Em desenvolvimento'],
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=500',
    available: false,
    players: '1-2 jogadores',
    time: '30-60 min'
  },
  {
    id: 'domino',
    title: 'Dominó',
    description: 'Em breve',
    features: ['Em desenvolvimento'],
    image: '/images/domino.png',
    available: false,
    players: '2-4 jogadores',
    time: '20-40 min'
  }
];

export default function App() {
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const { initGame, selectPiece, movePiece, gameMode, showGameSelection, setShowGameSelection, goBack, isWaitingPlayer } = useGameStore();

  useEffect(() => {
    // Exemplo de uso das notificações
    const handleOnline = () => {
      addNotification('success', 'Conexão restabelecida');
    };

    const handleOffline = () => {
      addNotification('error', 'Conexão perdida');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addNotification]);

  const handleDragStart = (event: DragStartEvent) => {
    const piece = event.active.data.current;
    if (!piece) return;
    selectPiece(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const piece = active.data.current;
    if (!piece) return;

    const boardRect = document.querySelector('.board-grid')?.getBoundingClientRect();
    if (!boardRect) return;

    const squareSize = boardRect.width / 8;
    const toRow = Math.floor((over.rect.top - boardRect.top) / squareSize);
    const toCol = Math.floor((over.rect.left - boardRect.left) / squareSize);

    movePiece(piece.position, { row: toRow, col: toCol });
  };

  const renderHomePage = () => (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 space-y-6"
      >
        <h2 className="text-5xl font-bold text-white">
          Jogos de Tabuleiro
        </h2>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Reviva os clássicos em uma experiência moderna e minimalista
        </p>
      </motion.div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
        {GAMES.map((game) => (
          <motion.div
            key={game.id}
            whileHover={{ y: -5 }}
            className={`bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden ${
              !game.available && 'opacity-50'
            }`}
          >
            <div 
              className={`relative aspect-[16/9] cursor-pointer ${
                game.available && 'hover:opacity-90 transition-opacity'
              }`}
              onClick={() => game.available && setShowGameSelection(true)}
            >
              <img
                src={game.image}
                alt={game.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-2xl font-bold">{game.title}</h3>
                <p className="text-gray-300">{game.description}</p>
              </div>
              {game.available && (
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
              )}
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {game.players}
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {game.time}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {game.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (isWaitingPlayer) {
      return <WaitingRoom />;
    }

    if (gameMode) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center"
        >
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Board />
          </DndContext>
        </motion.div>
      );
    }

    return <GameModeSelection />;
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white">
      <Notifications 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
      <header className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gray-800/50 backdrop-blur-md">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          {(showGameSelection || gameMode) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goBack}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
          )}
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">Jogos de Tabuleiro</h1>
          </div>
        </motion.div>
      </header>

      <main className="h-full pt-20">
        {renderContent()}
      </main>

      <footer className="bg-gray-800/50 backdrop-blur-md py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center gap-6 text-sm text-gray-400">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
              GitHub
            </a>
            <span>•</span>
            <span>© {new Date().getFullYear()} Jogos de Tabuleiro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
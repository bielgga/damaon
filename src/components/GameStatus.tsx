import { motion } from 'framer-motion';
import { RotateCcw, Circle } from 'lucide-react';
import { Player } from '../types/game';
import { useGameStore } from '../store/gameStore';

export default function GameStatus() {
  const { currentPlayer, scores, gameOver, winner, resetGame } = useGameStore();

  const PlayerAvatar = ({ player }: { player: Player }) => (
    <div className={`flex flex-col items-center gap-2 ${
      player === currentPlayer ? 'opacity-100 scale-110' : 'opacity-50 scale-100'
    } transition-all duration-300`}
    >
      <div className={`w-16 h-16 rounded-full border-4 ${
        player === 'black' 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-red-500 border-red-400'
      } shadow-lg`} />
      <div className={`text-sm font-medium ${
        player === currentPlayer ? 'text-white' : 'text-gray-400'
      }`}>
        {player === 'black' ? 'Jogador Preto' : 'Jogador Vermelho'}
      </div>
      <div className="flex items-center gap-1">
        <Circle className={`w-4 h-4 ${
          player === 'black' ? 'text-gray-700' : 'text-red-400'
        } fill-current`} />
        <span className="font-bold">{scores[player]}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[800px]">
      <div className="flex items-center justify-between w-full px-8">
        <PlayerAvatar player="red" />
        
        <div className="flex items-center justify-center px-8 py-4 bg-white/5 backdrop-blur-md rounded-xl shadow-lg">
          {gameOver ? (
            <span className="font-bold text-blue-400 text-lg">
              {winner === 'black' ? 'Pretas' : 'Vermelhas'} vencem!
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`w-3 h-3 rounded-full ${
                  currentPlayer === 'black' ? 'bg-gray-900' : 'bg-red-500'
                } border ${currentPlayer === 'black' ? 'border-gray-700' : 'border-red-400'}`}
              />
              <span className="font-medium text-gray-300">
                Vez das {currentPlayer === 'black' ? 'Pretas' : 'Vermelhas'}
              </span>
            </div>
          )}
        </div>

        <PlayerAvatar player="black" />
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={resetGame}
        className="flex items-center gap-2 px-6 py-3 text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-lg"
      >
        <RotateCcw className="w-5 h-5" />
        Novo Jogo
      </motion.button>
    </div>
  );
}
import { motion } from 'framer-motion';
import { Users, Trophy, Star, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useState } from 'react';

export default function HomePage() {
  const navigate = useNavigate();
  const { setPlayerName } = useGameStore();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setPlayerName(name);
      navigate('/modos');
    }
  };

  return (
    <div className="container mx-auto px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 space-y-6"
      >
        <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Damas Online
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Jogue contra outros jogadores em tempo real
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome para jogar"
            className="w-full px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium"
          >
            Começar a Jogar
          </button>
        </form>
      </motion.div>
    </div>
  );
} 
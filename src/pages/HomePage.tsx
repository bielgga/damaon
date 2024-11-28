import { motion } from 'framer-motion';
import { Gamepad2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useState } from 'react';

export default function HomePage() {
  const navigate = useNavigate();
  const { setPlayerName } = useGameStore();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      setPlayerName(name);
      navigate('/modos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      
      {/* Animated Glow Effects */}
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="inline-block p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 backdrop-blur-sm mb-6"
          >
            <Gamepad2 className="w-16 h-16 text-indigo-400" />
          </motion.div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-rose-400 bg-clip-text text-transparent">
            Damas Online
          </h1>
          <p className="text-slate-400">
            Jogue contra outros jogadores em tempo real
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Seu Nome
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como devemos te chamar?"
                className="input-field"
                maxLength={20}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Começar a Jogar
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-sm text-slate-400"
        >
          Ao entrar, você concorda com nossos termos de uso
        </motion.p>
      </motion.div>
    </div>
  );
} 
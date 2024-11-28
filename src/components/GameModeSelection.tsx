import { motion } from 'framer-motion';
import RoomsList from './RoomsList';
import { Users, Trophy, Star } from 'lucide-react';

export default function GameModeSelection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-6"
        >
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Damas Online
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Jogue contra outros jogadores em tempo real, acompanhe seu progresso e divirta-se!
          </p>
          <div className="flex justify-center gap-8 pt-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-5 h-5" />
              <span>Multiplayer</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Trophy className="w-5 h-5" />
              <span>Ranking</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Star className="w-5 h-5" />
              <span>Conquistas</span>
            </div>
          </div>
        </motion.div>

        {/* Salas */}
        <RoomsList />
      </div>
    </div>
  );
}
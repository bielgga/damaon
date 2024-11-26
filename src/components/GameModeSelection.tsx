import { motion } from 'framer-motion';
import RoomsList from './RoomsList';

export default function GameModeSelection() {
  return (
    <div className="container mx-auto px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8 space-y-4"
      >
        <h1 className="text-4xl font-bold text-white">
          Damas Online
        </h1>
        <p className="text-xl text-gray-400">
          Jogue contra outros jogadores em tempo real
        </p>
      </motion.div>

      <RoomsList />
    </div>
  );
}
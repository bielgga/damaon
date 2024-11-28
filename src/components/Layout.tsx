import { Outlet } from 'react-router-dom';
import { Gamepad2, Github } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gray-800/50 backdrop-blur-md">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">Damas Online</h1>
          </div>
        </motion.div>
      </header>

      <main className="flex-1 pt-24 pb-16">
        <Outlet />
      </main>

      <footer className="bg-gray-800/50 backdrop-blur-md py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center gap-6 text-sm text-gray-400">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
              GitHub
            </a>
            <span>•</span>
            <span>© {new Date().getFullYear()} Damas Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
} 
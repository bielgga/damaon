import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SquareProps {
  row: number;
  col: number;
  isValidMove?: boolean;
  isBlackSquare: boolean;
  children?: ReactNode;
  onClick?: () => void;
}

export default function Square({ 
  row, 
  col, 
  isValidMove, 
  isBlackSquare, 
  onClick, 
  children 
}: SquareProps) {
  return (
    <div
      onClick={onClick}
      className={`relative aspect-square ${
        isBlackSquare 
          ? 'bg-slate-800 hover:bg-slate-700' 
          : 'bg-slate-600 hover:bg-slate-500'
      } flex items-center justify-center cursor-pointer transition-all duration-200`}
    >
      {isValidMove && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          className="absolute inset-[15%] rounded-full bg-indigo-400 pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}
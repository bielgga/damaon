import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SquareProps {
  row: number;
  col: number;
  isValidMove: boolean;
  onClick: () => void;
  children?: ReactNode;
}

export default function Square({ row, col, isValidMove, onClick, children }: SquareProps) {
  const isDark = (row + col) % 2 === 1;

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square ${
        isDark ? 'bg-amber-900' : 'bg-amber-100'
      } flex items-center justify-center cursor-pointer transition-colors hover:opacity-90`}
    >
      {isValidMove && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          className="absolute inset-[15%] rounded-full bg-blue-400 pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}
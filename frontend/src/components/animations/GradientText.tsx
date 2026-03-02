'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function GradientText({ children, className = '', animate = true }: GradientTextProps) {
  return (
    <motion.span
      className={`bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent ${className}`}
      animate={animate ? {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      } : undefined}
      transition={animate ? {
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      } : undefined}
      style={{
        backgroundSize: '200% 200%',
      }}
    >
      {children}
    </motion.span>
  );
}

export function ShimmerText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      initial={{ backgroundPosition: '-200% center' }}
      animate={{ backgroundPosition: '200% center' }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
    >
      {children}
    </motion.span>
  );
}

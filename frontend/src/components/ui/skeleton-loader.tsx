'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width = 'w-full', height = 'h-4' }: SkeletonProps) {
  return (
    <div className={`${width} ${height} ${className} relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800`}>
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass border-white/20 rounded-lg p-6 space-y-4">
      <Skeleton height="h-8" width="w-3/4" />
      <Skeleton height="h-4" width="w-full" />
      <Skeleton height="h-4" width="w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton height="h-10" width="w-24" />
        <Skeleton height="h-10" width="w-24" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 1 ? 'w-4/5' : 'w-full'}
        />
      ))}
    </div>
  );
}

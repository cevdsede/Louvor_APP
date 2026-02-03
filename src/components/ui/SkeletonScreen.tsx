import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'pulse'
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      default:
        return 'rounded';
    }
  };

  const getAnimationProps = () => {
    switch (animation) {
      case 'wave':
        return {
          initial: { x: -100 },
          animate: { x: 100 },
          transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: "linear"
          }
        };
      case 'pulse':
      default:
        return {
          animate: {
            opacity: [0.3, 1, 0.3]
          },
          transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut"
          }
        };
    }
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '40px')
  };

  return (
    <div className={`relative overflow-hidden bg-slate-200 dark:bg-slate-700 ${getVariantClass()} ${className}`} style={style}>
      {animation === 'wave' ? (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white dark:via-slate-600 to-transparent opacity-30"
          {...getAnimationProps()}
        />
      ) : (
        <motion.div
          className="absolute inset-0 bg-slate-300 dark:bg-slate-600"
          {...getAnimationProps()}
        />
      )}
    </div>
  );
};

// Skeleton components específicos para diferentes casos de uso

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={16} />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton height={16} />
      <Skeleton height={16} width="80%" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={14} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-8 ${className}`}>
    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`kpi-${index}`} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <Skeleton variant="circular" width={64} height={64} />
            <div className="flex-1 space-y-2">
              <Skeleton height={32} width="60%" />
              <Skeleton height={14} width="40%" />
            </div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Chart Area */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Skeleton height={24} width="30%" className="mb-6" />
        <Skeleton height={320} />
      </div>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Skeleton height={24} width="50%" className="mb-6" />
        <Skeleton height={160} />
      </div>
    </div>
  </div>
);

export default Skeleton;

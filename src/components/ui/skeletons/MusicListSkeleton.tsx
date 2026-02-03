import React from 'react';
import { Skeleton } from '../SkeletonScreen';

export const MusicListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Skeleton height={20} width="60%" className="mb-2" />
            <Skeleton height={40} />
          </div>
          <div>
            <Skeleton height={20} width="40%" className="mb-2" />
            <Skeleton height={40} />
          </div>
          <div>
            <Skeleton height={20} width="40%" className="mb-2" />
            <Skeleton height={40} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <Skeleton height={24} width="30%" />
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton variant="circular" width={48} height={48} />
                  <div className="flex-1 space-y-2">
                    <Skeleton height={20} width="70%" />
                    <Skeleton height={16} width="50%" />
                    <div className="flex space-x-2 pt-2">
                      <Skeleton height={20} width={60} />
                      <Skeleton height={20} width={80} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Skeleton width={32} height={32} />
                  <Skeleton width={32} height={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Skeleton } from '../SkeletonScreen';

export const ScaleListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton height={28} width="40%" className="mb-2" />
            <Skeleton height={16} width="60%" />
          </div>
          <Skeleton height={40} width={120} />
        </div>
      </div>

      {/* Scale Events */}
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Event Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="space-y-2">
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={16} width="40%" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton height={32} width={32} />
                <Skeleton height={32} width={32} />
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton height={16} width="30%" />
              <Skeleton height={32} width={100} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, memberIndex) => (
                <div key={memberIndex} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Skeleton variant="circular" width={40} height={40} />
                  <div className="flex-1 space-y-1">
                    <Skeleton height={16} width="70%" />
                    <Skeleton height={12} width="50%" />
                  </div>
                  <Skeleton height={20} width={60} />
                </div>
              ))}
            </div>
          </div>

          {/* Repertoire */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Skeleton height={16} width="30%" />
              <Skeleton height={32} width={100} />
            </div>
            
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, songIndex) => (
                <div key={songIndex} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded">
                      <Skeleton width={16} height={16} />
                    </div>
                    <div className="space-y-1">
                      <Skeleton height={16} width="60%" />
                      <Skeleton height={12} width="40%" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton height={16} width={40} />
                    <Skeleton height={16} width={30} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

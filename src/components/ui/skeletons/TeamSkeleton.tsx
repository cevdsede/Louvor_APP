import React from 'react';
import { Skeleton } from '../SkeletonScreen';

export const TeamSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton height={28} width="40%" className="mb-2" />
            <Skeleton height={16} width="60%" />
          </div>
          <div className="flex space-x-2">
            <Skeleton height={40} width={120} />
            <Skeleton height={40} width={120} />
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <Skeleton variant="circular" width={80} height={80} />
              
              {/* Member Info */}
              <div className="text-center space-y-2">
                <Skeleton height={20} width="70%" className="mx-auto" />
                <Skeleton height={14} width="50%" className="mx-auto" />
              </div>

              {/* Role Badge */}
              <Skeleton height={24} width={80} className="mx-auto rounded-full" />

              {/* Stats */}
              <div className="w-full space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <Skeleton height={12} width="30%" />
                  <Skeleton height={12} width="20%" />
                </div>
                <div className="flex justify-between">
                  <Skeleton height={12} width="40%" />
                  <Skeleton height={12} width="15%" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Skeleton height={32} width={32} />
                <Skeleton height={32} width={32} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Skeleton height={32} width={100} />
          <div className="flex space-x-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={32} width={32} />
            ))}
          </div>
          <Skeleton height={32} width={100} />
        </div>
      </div>
    </div>
  );
};

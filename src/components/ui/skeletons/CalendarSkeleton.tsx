import React from 'react';
import { Skeleton } from '../SkeletonScreen';

export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton height={40} width={40} />
            <div>
              <Skeleton height={24} width="30%" className="mb-2" />
              <Skeleton height={16} width="40%" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton height={32} width={32} />
            <Skeleton height={32} width={32} />
            <Skeleton height={40} width={120} />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
            <div key={index} className="text-center">
              <Skeleton height={16} width="60%" className="mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square">
              <div className="h-full border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                <Skeleton height={14} width="80%" className="mb-1" />
                <div className="space-y-1">
                  <Skeleton height={8} width="100%" />
                  <Skeleton height={8} width="60%" />
                  <Skeleton height={8} width="40%" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <Skeleton height={24} width="40%" />
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Date */}
                  <div className="bg-brand-100 dark:bg-brand-900/20 p-3 rounded-lg min-w-[60px] text-center">
                    <Skeleton height={12} width="80%" className="mx-auto mb-1" />
                    <Skeleton height={20} width="100%" className="mx-auto" />
                  </div>
                  
                  {/* Event Info */}
                  <div className="flex-1 space-y-2">
                    <Skeleton height={20} width="60%" />
                    <Skeleton height={14} width="40%" />
                    <div className="flex items-center space-x-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Skeleton width={16} height={16} />
                        <Skeleton height={12} width="60px" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton width={16} height={16} />
                        <Skeleton height={12} width="40px" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2">
                  <Skeleton height={32} width={32} />
                  <Skeleton height={32} width={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

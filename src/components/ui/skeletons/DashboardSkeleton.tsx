import React from 'react';
import { Skeleton } from '../SkeletonScreen';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
};

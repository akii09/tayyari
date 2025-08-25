/**
 * Metric Card Component
 * Displays individual metrics with optional trends
 */

'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle?: string;
  trend?: 'increasing' | 'decreasing' | 'stable';
  trendIcon?: ReactNode;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  trend, 
  trendIcon, 
  className = 'bg-white border-gray-200' 
}: MetricCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="text-gray-400">
            {icon}
          </div>
          {trend && trendIcon && (
            <div className="flex items-center space-x-1">
              {trendIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
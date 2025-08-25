/**
 * Analytics Dashboard Component
 * Displays comprehensive AI usage analytics and performance metrics
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Zap,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { UsageChart } from './UsageChart';
import { ProviderBreakdown } from './ProviderBreakdown';

interface AnalyticsData {
  analytics: {
    totalRequests: number;
    successfulRequests: number;
    totalCost: number;
    totalTokens: number;
    averageResponseTime: number;
    providerBreakdown: Record<string, {
      requests: number;
      cost: number;
      tokens: number;
      averageResponseTime: number;
    }>;
    modelBreakdown: Record<string, {
      requests: number;
      cost: number;
      tokens: number;
    }>;
    dailyUsage: Array<{
      date: string;
      requests: number;
      cost: number;
      tokens: number;
      averageResponseTime: number;
    }>;
  };
  insights: {
    mostUsedProvider: string;
    mostUsedModel: string;
    averageCostPerRequest: number;
    averageTokensPerRequest: number;
    successRate: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    requestTrend: 'increasing' | 'decreasing' | 'stable';
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ai/monitoring/analytics?days=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Network error while fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">AI usage analytics and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Requests"
              value={data.analytics.totalRequests.toLocaleString()}
              icon={<BarChart3 className="h-5 w-5" />}
              trend={data.insights.requestTrend}
              trendIcon={getTrendIcon(data.insights.requestTrend)}
              className="bg-blue-50 border-blue-200"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${(data.insights.successRate * 100).toFixed(1)}%`}
              icon={<Zap className="h-5 w-5" />}
              subtitle={`${data.analytics.successfulRequests} successful`}
              className="bg-green-50 border-green-200"
            />
            
            <MetricCard
              title="Total Cost"
              value={`$${data.analytics.totalCost.toFixed(2)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={data.insights.costTrend}
              trendIcon={getTrendIcon(data.insights.costTrend)}
              subtitle={`$${data.insights.averageCostPerRequest.toFixed(4)} per request`}
              className="bg-yellow-50 border-yellow-200"
            />
            
            <MetricCard
              title="Avg Response Time"
              value={`${data.analytics.averageResponseTime.toFixed(0)}ms`}
              icon={<Clock className="h-5 w-5" />}
              subtitle={`${data.analytics.totalTokens.toLocaleString()} total tokens`}
              className="bg-purple-50 border-purple-200"
            />
          </div>

          {/* Usage Chart */}
          <div className="mb-6">
            <UsageChart data={data.analytics.dailyUsage} />
          </div>

          {/* Provider and Model Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ProviderBreakdown
              title="Provider Usage"
              data={data.analytics.providerBreakdown}
              totalRequests={data.analytics.totalRequests}
              totalCost={data.analytics.totalCost}
            />
            
            <ProviderBreakdown
              title="Model Usage"
              data={data.analytics.modelBreakdown}
              totalRequests={data.analytics.totalRequests}
              totalCost={data.analytics.totalCost}
            />
          </div>

          {/* Insights */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Most Used Provider</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {data.insights.mostUsedProvider}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Most Used Model</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {data.insights.mostUsedModel}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Tokens/Request</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {Math.round(data.insights.averageTokensPerRequest)}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
            
            {/* Trends */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Request Trend:</span>
                  <div className={`flex items-center space-x-1 ${getTrendColor(data.insights.requestTrend)}`}>
                    {getTrendIcon(data.insights.requestTrend)}
                    <span className="capitalize">{data.insights.requestTrend}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Cost Trend:</span>
                  <div className={`flex items-center space-x-1 ${getTrendColor(data.insights.costTrend)}`}>
                    {getTrendIcon(data.insights.costTrend)}
                    <span className="capitalize">{data.insights.costTrend}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Period Info */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Data from {new Date(data.period.startDate).toLocaleDateString()} to{' '}
            {new Date(data.period.endDate).toLocaleDateString()} ({data.period.days} days)
          </div>
        </>
      )}
    </div>
  );
}
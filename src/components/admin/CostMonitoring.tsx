/**
 * Cost Monitoring Component
 * Displays cost tracking, alerts, and budget management
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target,
  RefreshCw,
  Settings,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { MetricCard } from './MetricCard';

interface CostAlert {
  id: string;
  type: 'daily_limit' | 'monthly_limit' | 'provider_limit' | 'spike_detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  provider?: string;
  createdAt: string;
}

interface CostData {
  alerts: CostAlert[];
  currentCosts: {
    today: {
      total: number;
      requests: number;
      tokens: number;
      byProvider: Array<{
        provider: string;
        cost: number;
        requests: number;
        percentage: number;
      }>;
    };
    month: {
      total: number;
      requests: number;
      tokens: number;
      byProvider: Array<{
        provider: string;
        cost: number;
        requests: number;
        percentage: number;
      }>;
    };
  };
  limits: {
    daily?: number;
    monthly?: number;
    providers?: Record<string, number>;
  };
  efficiency: {
    costPerRequest: number;
    costPerToken: number;
    averageResponseTime: number;
    successRate: number;
  };
  recommendations: Array<{
    type: 'cost_reduction' | 'efficiency' | 'provider_optimization' | 'usage_pattern';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
  }>;
}

export function CostMonitoring() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLimitSettings, setShowLimitSettings] = useState(false);

  useEffect(() => {
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/monitoring/costs');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch cost data');
      }
    } catch (err) {
      setError('Network error while fetching cost data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCostData();
    setRefreshing(false);
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Monitoring</h2>
          <p className="text-gray-600">Track costs, manage budgets, and optimize spending</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLimitSettings(!showLimitSettings)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Limits</span>
          </button>
          
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
          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Alerts</h3>
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <span className="text-xs opacity-75">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-1 text-sm opacity-75">
                          Current: ${alert.currentValue.toFixed(2)} / Threshold: ${alert.threshold.toFixed(2)}
                          {alert.provider && ` (${alert.provider})`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Today's Cost"
              value={`$${data.currentCosts.today.total.toFixed(2)}`}
              icon={<DollarSign className="h-5 w-5" />}
              subtitle={`${data.currentCosts.today.requests} requests`}
              className="bg-blue-50 border-blue-200"
            />
            
            <MetricCard
              title="Monthly Cost"
              value={`$${data.currentCosts.month.total.toFixed(2)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle={`${data.currentCosts.month.requests} requests`}
              className="bg-green-50 border-green-200"
            />
            
            <MetricCard
              title="Cost per Request"
              value={`$${data.efficiency.costPerRequest.toFixed(4)}`}
              icon={<Target className="h-5 w-5" />}
              subtitle={`$${data.efficiency.costPerToken.toFixed(6)} per token`}
              className="bg-yellow-50 border-yellow-200"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${(data.efficiency.successRate * 100).toFixed(1)}%`}
              icon={<CheckCircle className="h-5 w-5" />}
              subtitle={`${data.efficiency.averageResponseTime.toFixed(0)}ms avg`}
              className="bg-purple-50 border-purple-200"
            />
          </div>

          {/* Budget Progress */}
          {(data.limits.daily || data.limits.monthly) && (
            <div className="mb-6 bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.limits.daily && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Daily Budget</span>
                      <span className="text-sm text-gray-600">
                        ${data.currentCosts.today.total.toFixed(2)} / ${data.limits.daily.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          (data.currentCosts.today.total / data.limits.daily) > 0.9
                            ? 'bg-red-500'
                            : (data.currentCosts.today.total / data.limits.daily) > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((data.currentCosts.today.total / data.limits.daily) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((data.currentCosts.today.total / data.limits.daily) * 100).toFixed(1)}% used
                    </p>
                  </div>
                )}

                {data.limits.monthly && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Monthly Budget</span>
                      <span className="text-sm text-gray-600">
                        ${data.currentCosts.month.total.toFixed(2)} / ${data.limits.monthly.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          (data.currentCosts.month.total / data.limits.monthly) > 0.9
                            ? 'bg-red-500'
                            : (data.currentCosts.month.total / data.limits.monthly) > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((data.currentCosts.month.total / data.limits.monthly) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((data.currentCosts.month.total / data.limits.monthly) * 100).toFixed(1)}% used
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Provider Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Cost by Provider</h3>
              <div className="space-y-3">
                {data.currentCosts.today.byProvider.map((provider, index) => (
                  <div key={provider.provider} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {provider.provider}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${provider.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {provider.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cost by Provider</h3>
              <div className="space-y-3">
                {data.currentCosts.month.byProvider.map((provider, index) => (
                  <div key={provider.provider} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {provider.provider}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ${provider.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {provider.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Optimization Recommendations</h3>
              <div className="space-y-4">
                {data.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} priority
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {rec.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                        <p className="text-sm text-gray-600">{rec.description}</p>
                      </div>
                      {rec.potentialSavings && (
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium text-green-600">
                            Save ${rec.potentialSavings.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">potential</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
/**
 * Provider Health Status Component
 * Displays real-time health status of AI providers
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
}

interface ProviderHealthStatusProps {
  providers: Provider[];
}

interface HealthMetrics {
  totalProviders: number;
  healthyProviders: number;
  degradedProviders: number;
  unhealthyProviders: number;
  unknownProviders: number;
  enabledProviders: number;
}

export function ProviderHealthStatus({ providers }: ProviderHealthStatusProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const calculateMetrics = (): HealthMetrics => {
    return providers.reduce(
      (metrics, provider) => {
        metrics.totalProviders++;
        if (provider.enabled) metrics.enabledProviders++;
        
        switch (provider.healthStatus) {
          case 'healthy':
            metrics.healthyProviders++;
            break;
          case 'degraded':
            metrics.degradedProviders++;
            break;
          case 'unhealthy':
            metrics.unhealthyProviders++;
            break;
          default:
            metrics.unknownProviders++;
        }
        
        return metrics;
      },
      {
        totalProviders: 0,
        healthyProviders: 0,
        degradedProviders: 0,
        unhealthyProviders: 0,
        unknownProviders: 0,
        enabledProviders: 0,
      }
    );
  };

  const handleRefreshHealth = async () => {
    setRefreshing(true);
    try {
      // Trigger health checks for all providers
      await Promise.all(
        providers.map(provider =>
          fetch(`/api/ai/providers/${provider.id}/health`, { method: 'POST' })
        )
      );
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh health status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = calculateMetrics();
  const healthPercentage = metrics.totalProviders > 0 
    ? Math.round((metrics.healthyProviders / metrics.totalProviders) * 100)
    : 0;

  const getOverallStatus = () => {
    if (metrics.unhealthyProviders > 0) return 'critical';
    if (metrics.degradedProviders > 0) return 'warning';
    if (metrics.healthyProviders === metrics.enabledProviders && metrics.enabledProviders > 0) return 'healthy';
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Provider Health Overview</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefreshHealth}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Health</p>
              <p className="text-2xl font-bold text-gray-900">{healthPercentage}%</p>
            </div>
            <div className={`p-2 rounded-full ${
              overallStatus === 'healthy' ? 'bg-green-100' :
              overallStatus === 'warning' ? 'bg-yellow-100' :
              overallStatus === 'critical' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              {overallStatus === 'healthy' && <CheckCircle className="h-6 w-6 text-green-600" />}
              {overallStatus === 'warning' && <AlertCircle className="h-6 w-6 text-yellow-600" />}
              {overallStatus === 'critical' && <XCircle className="h-6 w-6 text-red-600" />}
              {overallStatus === 'unknown' && <Clock className="h-6 w-6 text-gray-600" />}
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Healthy</p>
              <p className="text-2xl font-bold text-green-900">{metrics.healthyProviders}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Degraded</p>
              <p className="text-2xl font-bold text-yellow-900">{metrics.degradedProviders}</p>
            </div>
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Unhealthy</p>
              <p className="text-2xl font-bold text-red-900">{metrics.unhealthyProviders}</p>
            </div>
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Provider Status List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Provider Status Details</h4>
        {providers.length === 0 ? (
          <p className="text-sm text-gray-500">No providers configured</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  !provider.enabled ? 'bg-gray-50 border-gray-200' :
                  provider.healthStatus === 'healthy' ? 'bg-green-50 border-green-200' :
                  provider.healthStatus === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
                  provider.healthStatus === 'unhealthy' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded-full ${
                    !provider.enabled ? 'bg-gray-200' :
                    provider.healthStatus === 'healthy' ? 'bg-green-200' :
                    provider.healthStatus === 'degraded' ? 'bg-yellow-200' :
                    provider.healthStatus === 'unhealthy' ? 'bg-red-200' :
                    'bg-gray-200'
                  }`}>
                    {!provider.enabled ? (
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    ) : provider.healthStatus === 'healthy' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : provider.healthStatus === 'degraded' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    ) : provider.healthStatus === 'unhealthy' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{provider.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${
                    !provider.enabled ? 'text-gray-500' :
                    provider.healthStatus === 'healthy' ? 'text-green-600' :
                    provider.healthStatus === 'degraded' ? 'text-yellow-600' :
                    provider.healthStatus === 'unhealthy' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {!provider.enabled ? 'Disabled' :
                     provider.healthStatus === 'healthy' ? 'Healthy' :
                     provider.healthStatus === 'degraded' ? 'Degraded' :
                     provider.healthStatus === 'unhealthy' ? 'Unhealthy' :
                     'Unknown'}
                  </p>
                  {provider.lastHealthCheck && (
                    <p className="text-xs text-gray-400">
                      {new Date(provider.lastHealthCheck).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
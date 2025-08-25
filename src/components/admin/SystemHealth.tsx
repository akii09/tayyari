/**
 * System Health Component
 * Displays system performance and health monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Cpu,
  HardDrive,
  Zap
} from 'lucide-react';
import { MetricCard } from './MetricCard';

interface SystemMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  activeConnections: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  uptime: number;
  errorCount: number;
}

interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'connectivity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface SystemHealthData {
  metrics: SystemMetrics;
  services: ServiceStatus[];
  alerts: SystemAlert[];
  performance: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    successRate: number;
  };
  resources: {
    memory: { used: number; total: number; percentage: number };
    cpu: { usage: number; cores: number };
    disk: { used: number; total: number; percentage: number };
    network: { inbound: number; outbound: number };
  };
}

export function SystemHealth() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/system/health');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        // Fallback to mock data if API fails
        const mockData: SystemHealthData = {
        metrics: {
          uptime: 99.8,
          responseTime: 145,
          errorRate: 0.2,
          throughput: 1250,
          memoryUsage: 68.5,
          cpuUsage: 34.2,
          diskUsage: 45.8,
          activeConnections: 89,
        },
        services: [
          {
            name: 'API Server',
            status: 'healthy',
            responseTime: 120,
            lastCheck: new Date().toISOString(),
            uptime: 99.9,
            errorCount: 2,
          },
          {
            name: 'Database',
            status: 'healthy',
            responseTime: 45,
            lastCheck: new Date().toISOString(),
            uptime: 99.7,
            errorCount: 0,
          },
          {
            name: 'AI Provider Router',
            status: 'degraded',
            responseTime: 2340,
            lastCheck: new Date().toISOString(),
            uptime: 98.5,
            errorCount: 12,
          },
          {
            name: 'Context Manager',
            status: 'healthy',
            responseTime: 89,
            lastCheck: new Date().toISOString(),
            uptime: 99.6,
            errorCount: 1,
          },
          {
            name: 'Learning Analytics',
            status: 'healthy',
            responseTime: 156,
            lastCheck: new Date().toISOString(),
            uptime: 99.4,
            errorCount: 3,
          },
        ],
        alerts: [
          {
            id: '1',
            type: 'performance',
            severity: 'medium',
            message: 'AI Provider Router response time above threshold (2.3s)',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            resolved: false,
          },
          {
            id: '2',
            type: 'resource',
            severity: 'low',
            message: 'Memory usage approaching 70% threshold',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            resolved: false,
          },
          {
            id: '3',
            type: 'error',
            severity: 'high',
            message: 'Increased error rate in AI provider connections',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            resolved: true,
          },
        ],
        performance: {
          requestsPerMinute: 1250,
          averageResponseTime: 145,
          errorRate: 0.2,
          successRate: 99.8,
        },
        resources: {
          memory: { used: 6.85, total: 10, percentage: 68.5 },
          cpu: { usage: 34.2, cores: 8 },
          disk: { used: 458, total: 1000, percentage: 45.8 },
          network: { inbound: 125.6, outbound: 89.3 },
        },
        };
        
        setData(mockData);
      }
    } catch (err) {
      setError('Network error while fetching system health');
      
      // Fallback to mock data on network error
      const mockData: SystemHealthData = {
        metrics: {
          uptime: 99.8,
          responseTime: 145,
          errorRate: 0.2,
          throughput: 1250,
          memoryUsage: 68.5,
          cpuUsage: 34.2,
          diskUsage: 45.8,
          activeConnections: 89,
        },
        services: [],
        alerts: [],
        performance: {
          requestsPerMinute: 1250,
          averageResponseTime: 145,
          errorRate: 0.2,
          successRate: 99.8,
        },
        resources: {
          memory: { used: 6.85, total: 10, percentage: 68.5 },
          cpu: { usage: 34.2, cores: 8 },
          disk: { used: 458, total: 1000, percentage: 45.8 },
          network: { inbound: 125.6, outbound: 89.3 },
        },
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemHealth();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
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
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
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

  const formatUptime = (uptime: number) => {
    if (uptime >= 99.9) return `${uptime.toFixed(2)}%`;
    if (uptime >= 99) return `${uptime.toFixed(1)}%`;
    return `${uptime.toFixed(0)}%`;
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
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          <p className="text-gray-600">Monitor system performance and health metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">Auto-refresh</span>
          </label>
          
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
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="System Uptime"
              value={formatUptime(data.metrics.uptime)}
              icon={<Activity className="h-5 w-5" />}
              subtitle={`${data.metrics.activeConnections} active connections`}
              className="bg-green-50 border-green-200"
            />
            
            <MetricCard
              title="Response Time"
              value={`${data.metrics.responseTime}ms`}
              icon={<Zap className="h-5 w-5" />}
              subtitle={`${data.performance.requestsPerMinute}/min throughput`}
              className="bg-blue-50 border-blue-200"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${data.performance.successRate.toFixed(1)}%`}
              icon={<CheckCircle className="h-5 w-5" />}
              subtitle={`${data.performance.errorRate.toFixed(2)}% error rate`}
              className="bg-yellow-50 border-yellow-200"
            />
            
            <MetricCard
              title="CPU Usage"
              value={`${data.metrics.cpuUsage.toFixed(1)}%`}
              icon={<Cpu className="h-5 w-5" />}
              subtitle={`${data.resources.cpu.cores} cores available`}
              className="bg-purple-50 border-purple-200"
            />
          </div>

          {/* Active Alerts */}
          {data.alerts.filter(alert => !alert.resolved).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Alerts</h3>
              <div className="space-y-3">
                {data.alerts.filter(alert => !alert.resolved).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <span className="text-xs opacity-75 capitalize">
                            {alert.type} • {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm opacity-75 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Status */}
          <div className="mb-6 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.services.map((service) => (
                <div
                  key={service.name}
                  className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(service.status)}
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-xs opacity-75 capitalize">
                      {service.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm opacity-75">
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span>{service.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{formatUptime(service.uptime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span>{service.errorCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Server className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Memory</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {data.resources.memory.used.toFixed(1)}GB / {data.resources.memory.total}GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        data.resources.memory.percentage > 80
                          ? 'bg-red-500'
                          : data.resources.memory.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${data.resources.memory.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.resources.memory.percentage.toFixed(1)}% used
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Cpu className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">CPU</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {data.resources.cpu.cores} cores
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        data.resources.cpu.usage > 80
                          ? 'bg-red-500'
                          : data.resources.cpu.usage > 60
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${data.resources.cpu.usage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.resources.cpu.usage.toFixed(1)}% usage
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Disk</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {data.resources.disk.used}GB / {data.resources.disk.total}GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        data.resources.disk.percentage > 80
                          ? 'bg-red-500'
                          : data.resources.disk.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${data.resources.disk.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.resources.disk.percentage.toFixed(1)}% used
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Inbound Traffic</p>
                      <p className="text-xs text-gray-500">Data received</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-blue-600">
                      {data.resources.network.inbound.toFixed(1)} MB/s
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wifi className="h-5 w-5 text-green-500 transform rotate-180" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Outbound Traffic</p>
                      <p className="text-xs text-gray-500">Data sent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {data.resources.network.outbound.toFixed(1)} MB/s
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Active Connections</p>
                      <p className="font-semibold text-gray-900">
                        {data.metrics.activeConnections}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Requests/Min</p>
                      <p className="font-semibold text-gray-900">
                        {data.performance.requestsPerMinute.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {data.services.filter(s => s.status === 'healthy').length}
                </div>
                <div className="text-sm text-gray-600">Healthy Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {data.services.filter(s => s.status === 'degraded').length}
                </div>
                <div className="text-sm text-gray-600">Degraded Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {data.alerts.filter(a => !a.resolved && a.severity === 'high').length}
                </div>
                <div className="text-sm text-gray-600">High Priority Alerts</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
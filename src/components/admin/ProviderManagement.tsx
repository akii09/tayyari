/**
 * Provider Management Component
 * Interface for managing AI provider configurations
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { ProviderConfigModal } from './ProviderConfigModal';
import { ProviderHealthStatus } from './ProviderHealthStatus';

interface Provider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  maxRequestsPerMinute: number;
  maxCostPerDay: number;
  models: string[];
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck?: string;
  totalRequests?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
}

export function ProviderManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/providers');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.data);
      } else {
        setError(data.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError('Network error while fetching providers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/ai/providers/${providerId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        await fetchProviders();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to toggle provider');
      }
    } catch (err) {
      setError('Network error while toggling provider');
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      const response = await fetch(`/api/ai/providers/${providerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProviders();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete provider');
      }
    } catch (err) {
      setError('Network error while deleting provider');
    }
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProvider(null);
  };

  const handleProviderSaved = () => {
    fetchProviders();
    handleCloseModal();
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const getHealthStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProviderTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-100 text-green-800',
      anthropic: 'bg-purple-100 text-purple-800',
      google: 'bg-blue-100 text-blue-800',
      mistral: 'bg-orange-100 text-orange-800',
      ollama: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Provider Management</h2>
          <p className="text-gray-600">Configure and manage AI provider connections</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Provider Health Overview */}
      <ProviderHealthStatus providers={providers} />

      {/* Providers Table */}
      <div className="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Configuration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {providers.map((provider) => (
              <tr key={provider.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {provider.name}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderTypeColor(provider.type)}`}>
                          {provider.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          Priority: {provider.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getHealthStatusIcon(provider.healthStatus)}
                    <div>
                      <div className={`text-sm ${provider.enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {provider.lastHealthCheck 
                          ? `Checked ${new Date(provider.lastHealthCheck).toLocaleTimeString()}`
                          : 'Never checked'
                        }
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    <div>Rate: {provider.maxRequestsPerMinute}/min</div>
                    <div>Budget: ${provider.maxCostPerDay}/day</div>
                    <div>Models: {provider.models.length}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    <div>Requests: {provider.totalRequests || 0}</div>
                    <div>Cost: ${(provider.totalCost || 0).toFixed(2)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleProvider(provider.id, !provider.enabled)}
                      className={`p-1 rounded ${
                        provider.enabled 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                      title={provider.enabled ? 'Disable' : 'Enable'}
                    >
                      {provider.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEditProvider(provider)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {providers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No providers configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first AI provider.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </button>
          </div>
        </div>
      )}

      {/* Provider Configuration Modal */}
      {showModal && (
        <ProviderConfigModal
          provider={editingProvider}
          onClose={handleCloseModal}
          onSave={handleProviderSaved}
        />
      )}
    </div>
  );
}
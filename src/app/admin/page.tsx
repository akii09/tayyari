"use client";

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/base/GlassCard';
import { Button } from '@/components/base/Button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { ProviderManagement } from '@/components/admin/ProviderManagement';
import { LearningAnalytics } from '@/components/admin/LearningAnalytics';
import { CostMonitoring } from '@/components/admin/CostMonitoring';
import { useToast } from '@/components/ui/Toast';

type AdminTab = 'overview' | 'providers' | 'analytics' | 'costs' | 'health';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalConcepts: number;
  totalProviders: number;
  healthyProviders: number;
  totalCost: number;
  requestsToday: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalConversations: 0,
    totalConcepts: 0,
    totalProviders: 0,
    healthyProviders: 0,
    totalCost: 0,
    requestsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch system health
      const healthResponse = await fetch('/api/system/health');
      const healthData = await healthResponse.json();
      
      // Fetch provider stats
      const providersResponse = await fetch('/api/ai/providers');
      const providersData = await providersResponse.json();
      
      // Fetch analytics
      const analyticsResponse = await fetch('/api/learning/analytics');
      const analyticsData = await analyticsResponse.json();
      
      if (healthData.success && providersData.success) {
        const providers = providersData.providers || [];
        const healthyProviders = providers.filter((p: any) => p.healthStatus === 'healthy').length;
        
        setStats({
          totalUsers: analyticsData.totalUsers || 0,
          activeUsers: analyticsData.activeUsers || 0,
          totalConversations: analyticsData.totalConversations || 0,
          totalConcepts: analyticsData.totalConcepts || 0,
          totalProviders: providers.length,
          healthyProviders,
          totalCost: analyticsData.totalCost || 0,
          requestsToday: analyticsData.requestsToday || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      toast.error('Failed to load system statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'providers' as const, label: 'AI Providers', icon: '🤖' },
    { id: 'analytics' as const, label: 'Analytics', icon: '📈' },
    { id: 'costs' as const, label: 'Costs', icon: '💰' },
    { id: 'health' as const, label: 'System Health', icon: '🏥' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Users</p>
              <p className="text-2xl font-bold text-text-primary">{stats.totalUsers}</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Active Users</p>
              <p className="text-2xl font-bold text-green-400">{stats.activeUsers}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Conversations</p>
              <p className="text-2xl font-bold text-text-primary">{stats.totalConversations}</p>
            </div>
            <div className="text-3xl">💬</div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">AI Providers</p>
              <p className="text-2xl font-bold text-electric-blue">
                {stats.healthyProviders}/{stats.totalProviders}
              </p>
            </div>
            <div className="text-3xl">🤖</div>
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setActiveTab('providers')}
            className="flex items-center justify-center space-x-2 h-12"
          >
            <span>🤖</span>
            <span>Manage Providers</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveTab('health')}
            className="flex items-center justify-center space-x-2 h-12"
          >
            <span>🏥</span>
            <span>System Health</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setActiveTab('costs')}
            className="flex items-center justify-center space-x-2 h-12"
          >
            <span>💰</span>
            <span>Cost Analysis</span>
          </Button>
        </div>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-text-primary">All systems operational</span>
            </div>
            <span className="text-xs text-text-secondary">Just now</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-text-primary">{stats.requestsToday} AI requests processed today</span>
            </div>
            <span className="text-xs text-text-secondary">Today</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm text-text-primary">Total cost: ${stats.totalCost.toFixed(2)}</span>
            </div>
            <span className="text-xs text-text-secondary">This month</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'providers':
        return <ProviderManagement />;
      case 'analytics':
        return <LearningAnalytics />;
      case 'costs':
        return <CostMonitoring />;
      case 'health':
        return <SystemHealth />;
      default:
        return renderOverview();
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Admin Dashboard
          </h1>
          <p className="text-text-secondary">
            Monitor and manage your AI learning platform
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-electric-blue text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-text-secondary">Loading dashboard...</span>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </AdminLayout>
  );
}
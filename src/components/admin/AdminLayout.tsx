/**
 * Admin Layout Component
 * Provides navigation and layout structure for admin dashboard
 */

'use client';

import { ReactNode } from 'react';
import { 
  Settings, 
  BarChart3, 
  DollarSign, 
  GraduationCap, 
  Activity,
  Shield,
  Users,
  Database
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const adminTabs = [
  {
    id: 'providers',
    label: 'AI Providers',
    icon: Settings,
    description: 'Manage AI provider configurations'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'View usage and performance metrics'
  },
  {
    id: 'costs',
    label: 'Cost Monitoring',
    icon: DollarSign,
    description: 'Track costs and budget alerts'
  },
  {
    id: 'learning',
    label: 'Learning Analytics',
    icon: GraduationCap,
    description: 'Monitor learning progress across concepts'
  },
  {
    id: 'health',
    label: 'System Health',
    icon: Activity,
    description: 'Monitor system performance and health'
  }
];

export function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">System management and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Admin Access</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Database className="h-4 w-4" />
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-2">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
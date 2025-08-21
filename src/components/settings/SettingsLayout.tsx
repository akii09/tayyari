"use client";

import { useState } from 'react';
import { GlassCard } from '@/components/base/GlassCard';
import { Button } from '@/components/base/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowRightIcon, 
  UserIcon, 
  SettingsIcon, 
  BellIcon, 
  ShieldIcon, 
  ChartIcon, 
  LogOutIcon,
  HomeIcon
} from '@/components/icons/Icons';
import { AccountSettings } from './AccountSettings';
import { PreferencesSettings } from './PreferencesSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import { ProgressSettings } from './ProgressSettings';

type SettingsSection = 'account' | 'preferences' | 'notifications' | 'privacy' | 'progress';

interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function SettingsLayout() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  const menuItems: SettingsMenuItem[] = [
    {
      id: 'account',
      label: 'Account',
      description: 'Personal information and onboarding data',
      icon: <UserIcon size={20} />,
      color: 'text-blue-400'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      description: 'Interview goals and study preferences',
      icon: <SettingsIcon size={20} />,
      color: 'text-green-400'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Email and app notification settings',
      icon: <BellIcon size={20} />,
      color: 'text-yellow-400'
    },
    {
      id: 'privacy',
      label: 'Privacy & Data',
      description: 'Data sharing and privacy controls',
      icon: <ShieldIcon size={20} />,
      color: 'text-purple-400'
    },
    {
      id: 'progress',
      label: 'Progress & Analytics',
      description: 'Study tracking and performance data',
      icon: <ChartIcon size={20} />,
      color: 'text-neon-green'
    }
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleBackToChat = () => {
    router.push('/chat');
  };

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'progress':
        return <ProgressSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="min-h-screen pl-20 sm:pl-24 bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
            <p className="text-text-secondary">
              Manage your account, preferences, and privacy settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleBackToChat}
              className="flex items-center gap-2"
            >
              <HomeIcon size={16} />
              Back to Chat
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <LogOutIcon size={16} />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Menu */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <GlassCard className="p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        activeSection === item.id
                          ? 'bg-electric-blue/20 border border-electric-blue/30'
                          : 'hover:bg-bg-secondary/50 border border-transparent'
                      }`}
                    >
                      <span className={item.color}>{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary">{item.label}</div>
                        <div className="text-xs text-text-muted mt-1 truncate">{item.description}</div>
                      </div>
                      <ArrowRightIcon size={16} className="text-text-muted" />
                    </button>
                  ))}
                </div>

                {/* User Info Card */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary/50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue to-deep-purple flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{user?.name}</div>
                      <div className="text-xs text-text-muted truncate">{user?.email || 'No email'}</div>
                      <div className="text-xs text-text-muted mt-1">
                        {user?.experienceLevel} • {user?.role}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <GlassCard className="p-6">
              {renderSettingsContent()}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

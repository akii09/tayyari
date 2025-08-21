"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { SettingsActionBar } from './SettingsActionBar';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  reminderTime: string;
  studyReminders: boolean;
  progressUpdates: boolean;
  newFeatures: boolean;
  marketingEmails: boolean;
}

export function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    reminderTime: '18:00',
    studyReminders: true,
    progressUpdates: true,
    newFeatures: false,
    marketingEmails: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/notifications');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notification settings');
      }

      setSuccess('Notification settings updated successfully!');
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handleInputChange = (key: keyof NotificationSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleCancel = () => {
    loadSettings();
    setHasChanges(false);
    setError('');
    setSuccess('');
  };

  const ToggleSwitch = ({ 
    enabled, 
    onChange, 
    label, 
    description 
  }: { 
    enabled: boolean; 
    onChange: () => void; 
    label: string; 
    description: string;
  }) => (
    <div className="flex items-center justify-between p-4 bg-bg-secondary/30 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-text-primary">{label}</div>
        <div className="text-sm text-text-muted mt-1">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-electric-blue' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Notification Settings</h2>
        <p className="text-text-secondary">
          Manage how and when you receive notifications from TayyariAI.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* General Notifications */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">General Notifications</h3>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
            label="Email Notifications"
            description="Receive notifications via email"
          />
          <ToggleSwitch
            enabled={settings.pushNotifications}
            onChange={() => handleToggle('pushNotifications')}
            label="Push Notifications"
            description="Receive notifications in your browser"
          />
          <ToggleSwitch
            enabled={settings.weeklyReports}
            onChange={() => handleToggle('weeklyReports')}
            label="Weekly Progress Reports"
            description="Get a summary of your weekly progress"
          />
        </div>
      </div>

      {/* Study Reminders */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Study Reminders</h3>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.studyReminders}
            onChange={() => handleToggle('studyReminders')}
            label="Daily Study Reminders"
            description="Get reminded to maintain your study streak"
          />
          
          {settings.studyReminders && (
            <div className="pl-4 border-l-2 border-electric-blue/30">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleInputChange('reminderTime', e.target.value)}
                className="px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">
                Choose when you'd like to receive study reminders
              </p>
            </div>
          )}

          <ToggleSwitch
            enabled={settings.progressUpdates}
            onChange={() => handleToggle('progressUpdates')}
            label="Progress Updates"
            description="Get notified about milestones and achievements"
          />
        </div>
      </div>

      {/* Product Updates */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Product Updates</h3>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.newFeatures}
            onChange={() => handleToggle('newFeatures')}
            label="New Features"
            description="Be the first to know about new features and improvements"
          />
          <ToggleSwitch
            enabled={settings.marketingEmails}
            onChange={() => handleToggle('marketingEmails')}
            label="Tips & Resources"
            description="Receive study tips and interview preparation resources"
          />
        </div>
      </div>

      {/* Notification Preview */}
      <div className="bg-bg-secondary/30 p-4 rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">Notification Preview</h4>
        <div className="text-sm text-text-muted">
          Based on your settings, you will receive:
          <ul className="mt-2 space-y-1">
            {settings.emailNotifications && (
              <li>• Email notifications for important updates</li>
            )}
            {settings.studyReminders && (
              <li>• Daily study reminders at {settings.reminderTime}</li>
            )}
            {settings.weeklyReports && (
              <li>• Weekly progress reports every Sunday</li>
            )}
            {settings.progressUpdates && (
              <li>• Notifications for achievements and milestones</li>
            )}
          </ul>
        </div>
      </div>

      {/* Settings Action Bar */}
      <SettingsActionBar
        isLoading={isLoading}
        onSave={handleSave}
        onDiscard={handleCancel}
        saveLabel="Save notification settings"
        hasChanges={hasChanges}
        isDirty={hasChanges}
      />
    </div>
  );
}

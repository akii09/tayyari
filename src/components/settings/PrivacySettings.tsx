"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { SettingsActionBar } from './SettingsActionBar';

interface PrivacySettings {
  shareProgress: boolean;
  publicProfile: boolean;
  analyticsOptIn: boolean;
  dataRetention: string;
  anonymizeData: boolean;
  thirdPartySharing: boolean;
}

export function PrivacySettings() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    shareProgress: false,
    publicProfile: false,
    analyticsOptIn: true,
    dataRetention: '2years',
    anonymizeData: true,
    thirdPartySharing: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/privacy');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update privacy settings');
      }

      setSuccess('Privacy settings updated successfully!');
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete account');
      }

      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDataExport = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/data/export', {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tayyari-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Data exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof PrivacySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
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
    description,
    warning = false
  }: { 
    enabled: boolean; 
    onChange: () => void; 
    label: string; 
    description: string;
    warning?: boolean;
  }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg ${
      warning ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-bg-secondary/30'
    }`}>
      <div className="flex-1">
        <div className={`font-medium ${warning ? 'text-yellow-400' : 'text-text-primary'}`}>
          {label}
        </div>
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
        <h2 className="text-xl font-semibold text-text-primary mb-2">Privacy & Data</h2>
        <p className="text-text-secondary">
          Control how your data is used and shared.
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

      {/* Data Sharing */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Data Sharing</h3>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.shareProgress}
            onChange={() => handleToggle('shareProgress')}
            label="Share Progress Publicly"
            description="Allow others to see your study progress and achievements"
          />
          <ToggleSwitch
            enabled={settings.publicProfile}
            onChange={() => handleToggle('publicProfile')}
            label="Public Profile"
            description="Make your profile visible to other users"
          />
          <ToggleSwitch
            enabled={settings.thirdPartySharing}
            onChange={() => handleToggle('thirdPartySharing')}
            label="Third-party Integrations"
            description="Allow approved third-party services to access your data"
            warning={settings.thirdPartySharing}
          />
        </div>
      </div>

      {/* Analytics & Usage */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Analytics & Usage</h3>
        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.analyticsOptIn}
            onChange={() => handleToggle('analyticsOptIn')}
            label="Usage Analytics"
            description="Help improve TayyariAI by sharing anonymous usage data"
          />
          <ToggleSwitch
            enabled={settings.anonymizeData}
            onChange={() => handleToggle('anonymizeData')}
            label="Anonymize Data"
            description="Remove personally identifiable information from analytics"
          />
        </div>
      </div>

      {/* Data Retention */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Data Retention</h3>
        <div className="space-y-3">
          <div className="p-4 bg-bg-secondary/30 rounded-lg">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Keep my data for
            </label>
            <select
              value={settings.dataRetention}
              onChange={(e) => setSettings(prev => ({ ...prev, dataRetention: e.target.value }))}
              className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
            >
              <option value="1year">1 Year</option>
              <option value="2years">2 Years</option>
              <option value="5years">5 Years</option>
              <option value="forever">Until I delete my account</option>
            </select>
            <p className="text-xs text-text-muted mt-1">
              How long should we keep your study data and progress?
            </p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Data Management</h3>
        <div className="space-y-3">
          <div className="p-4 bg-bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">Export Your Data</div>
                <div className="text-sm text-text-muted mt-1">
                  Download a copy of all your data in JSON format
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleDataExport}
                disabled={isLoading}
                className="ml-4"
              >
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Summary */}
      <div className="bg-bg-secondary/30 p-4 rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">Privacy Summary</h4>
        <div className="text-sm text-text-muted">
          <p className="mb-2">
            <strong>TayyariAI is committed to protecting your privacy.</strong> We only collect data necessary to provide you with a personalized learning experience.
          </p>
          <ul className="space-y-1">
            <li>• Your study progress and chat history are stored locally in our database</li>
            <li>• We do not sell your personal information to third parties</li>
            <li>• You can export or delete your data at any time</li>
            <li>• All data transmission is encrypted with industry-standard protocols</li>
          </ul>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="pt-6 border-t border-white/10 mb-20">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="text-red-400 hover:text-red-300"
          >
            {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
          </Button>

          {showDeleteConfirm && (
            <Button
              onClick={handleDeleteAccount}
              isLoading={isLoading && showDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading && showDeleteConfirm ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          )}
        </div>
      </div>

      {/* Settings Action Bar */}
      <SettingsActionBar
        isLoading={isLoading && !showDeleteConfirm}
        onSave={handleSave}
        onDiscard={handleCancel}
        saveLabel="Save privacy settings"
        hasChanges={hasChanges}
        isDirty={hasChanges}
      />
    </div>
  );
}

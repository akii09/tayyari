"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { roles, experienceLevels } from '@/data/onboarding';
import { DropdownSelect } from '@/components/base/DropdownSelect';
import { SettingsActionBar } from './SettingsActionBar';

export function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || roles[0].value,
    experienceLevel: user?.experienceLevel || experienceLevels[0].value,
  });
  const [originalData, setOriginalData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || roles[0].value,
    experienceLevel: user?.experienceLevel || experienceLevels[0].value,
  });

  useEffect(() => {
    if (user) {
      const userData = {
        name: user.name,
        email: user.email || '',
        role: user.role,
        experienceLevel: user.experienceLevel,
      };
      setFormData(userData);
      setOriginalData(userData);
      setHasChanges(false);
    }
  }, [user]);

  // Check for changes whenever formData updates
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      updateUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        experienceLevel: formData.experienceLevel,
      });

      setSuccess('Profile updated successfully!');
      setOriginalData(formData);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setHasChanges(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Account Information</h2>
        <p className="text-text-secondary">
          Update your personal information and profile details.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
            placeholder="Enter your full name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-text-muted mt-1">
            Used for notifications and account recovery
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Current Role
          </label>
          <DropdownSelect
            value={formData.role}
            onChange={(value) => handleInputChange('role', value)}
            options={roles}
          />
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Experience Level
          </label>
          <DropdownSelect
            value={formData.experienceLevel}
            onChange={(value) => handleInputChange('experienceLevel', value)}
            options={experienceLevels}
          />
        </div>
      </div>

      {/* Account Stats */}
      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Account Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary/50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-electric-blue">
              {user?.onboardingCompleted ? 'Complete' : 'Incomplete'}
            </div>
            <div className="text-sm text-text-muted">Onboarding Status</div>
          </div>
          <div className="bg-bg-secondary/50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-neon-green">Member</div>
            <div className="text-sm text-text-muted">Account Type</div>
          </div>
          <div className="bg-bg-secondary/50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-deep-purple">Free</div>
            <div className="text-sm text-text-muted">Plan</div>
          </div>
        </div>
      </div>

      {/* Settings Action Bar */}
      <SettingsActionBar
        isLoading={isLoading}
        onSave={handleSave}
        onDiscard={handleCancel}
        saveLabel="Save changes"
        disabled={!formData.name.trim()}
        hasChanges={hasChanges}
        isDirty={hasChanges}
      />
    </div>
  );
}

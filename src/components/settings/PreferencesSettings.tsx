"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { interviewTypes, type InterviewTypeKey } from '@/data/onboarding';
import { GlassCard } from '@/components/base/GlassCard';
import { DsaIcon, SystemDesignIcon, BehavioralIcon } from '@/components/icons/Icons';
import { DateSelect } from '@/components/onboarding/DateSelect';
import { HoursPerWeek } from '@/components/onboarding/HoursPerWeek';
import { SettingsActionBar } from './SettingsActionBar';

export function PreferencesSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    interviewTypes: [] as InterviewTypeKey[],
    targetDate: null as Date | null,
    hoursPerWeek: 8,
    targetCompanies: '',
    targetRoles: '',
    difficultyPreference: 'medium',
    learningStyle: 'hands-on',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/onboarding');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          interviewTypes: data.data.interviewTypes || [],
          targetDate: data.data.targetDate ? new Date(data.data.targetDate) : null,
          hoursPerWeek: data.data.hoursPerWeek || 8,
          targetCompanies: (data.data.targetCompanies || []).join(', '),
          targetRoles: (data.data.targetRoles || []).join(', '),
          difficultyPreference: data.data.difficultyPreference || 'medium',
          learningStyle: data.data.learningStyle || 'hands-on',
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          targetCompanies: formData.targetCompanies.split(',').map(s => s.trim()).filter(Boolean),
          targetRoles: formData.targetRoles.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update preferences');
      }

      setSuccess('Preferences updated successfully!');
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    loadPreferences();
    setHasChanges(false);
    setError('');
    setSuccess('');
  };

  const toggleInterviewType = (type: InterviewTypeKey) => {
    setFormData(prev => ({
      ...prev,
      interviewTypes: prev.interviewTypes.includes(type)
        ? prev.interviewTypes.filter(t => t !== type)
        : [...prev.interviewTypes, type]
    }));
    setHasChanges(true);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'dsa': return <DsaIcon />;
      case 'system': return <SystemDesignIcon />;
      case 'behavioral': return <BehavioralIcon />;
      default: return <SystemDesignIcon />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Interview Preferences</h2>
        <p className="text-text-secondary">
          Update your interview goals and study preferences.
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

      {/* Interview Types */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Interview Focus Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviewTypes.filter(t => t.key !== 'full').map((type) => (
            <button
              key={type.key}
              onClick={() => toggleInterviewType(type.key)}
              className="text-left"
            >
              <GlassCard className={`p-4 h-full transition-all ${
                formData.interviewTypes.includes(type.key)
                  ? 'ring-2 ring-electric-blue bg-electric-blue/10'
                  : 'hover:bg-bg-secondary/50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="text-electric-blue">
                    {getIconForType(type.icon)}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{type.label}</div>
                    <div className="text-sm text-text-secondary">{type.desc}</div>
                  </div>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline & Commitment */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Study Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Target Interview Date
            </label>
            <GlassCard className="p-4">
              <DateSelect
                value={formData.targetDate}
                onChange={(date) => {
                  setFormData(prev => ({ ...prev, targetDate: date }));
                  setHasChanges(true);
                }}
              />
            </GlassCard>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Hours per Week
            </label>
            <GlassCard className="p-4">
              <HoursPerWeek
                value={formData.hoursPerWeek}
                onChange={(hours) => {
                  setFormData(prev => ({ ...prev, hoursPerWeek: hours }));
                  setHasChanges(true);
                }}
              />
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Target Companies & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Target Companies
          </label>
          <textarea
            value={formData.targetCompanies}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, targetCompanies: e.target.value }));
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors h-24 resize-none"
            placeholder="Google, Meta, Microsoft, Amazon..."
          />
          <p className="text-xs text-text-muted mt-1">Separate multiple companies with commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Target Roles
          </label>
          <textarea
            value={formData.targetRoles}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, targetRoles: e.target.value }));
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors h-24 resize-none"
            placeholder="Software Engineer, Senior SWE, Staff Engineer..."
          />
          <p className="text-xs text-text-muted mt-1">Separate multiple roles with commas</p>
        </div>
      </div>

      {/* Study Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Difficulty Preference
          </label>
          <select
            value={formData.difficultyPreference}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, difficultyPreference: e.target.value }));
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
          >
            <option value="easy">Start Easy</option>
            <option value="medium">Balanced Mix</option>
            <option value="hard">Challenge Me</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Learning Style
          </label>
          <select
            value={formData.learningStyle}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, learningStyle: e.target.value }));
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg focus:border-electric-blue outline-none transition-colors"
          >
            <option value="visual">Visual Learner</option>
            <option value="hands-on">Hands-on Practice</option>
            <option value="reading">Reading & Theory</option>
            <option value="mixed">Mixed Approach</option>
          </select>
        </div>
      </div>

      {/* Settings Action Bar */}
      <SettingsActionBar
        isLoading={isLoading}
        onSave={handleSave}
        onDiscard={handleCancel}
        saveLabel="Save preferences"
        hasChanges={hasChanges}
        isDirty={hasChanges}
      />
    </div>
  );
}

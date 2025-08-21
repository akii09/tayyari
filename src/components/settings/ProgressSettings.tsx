"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { GlassCard } from '@/components/base/GlassCard';
import { StickySaveSection } from './StickySaveSection';

interface ProgressData {
  totalStudyHours: number;
  currentStreak: number;
  completedQuestions: number;
  averageScore: number;
  categories: Array<{
    category: string;
    completedQuestions: number;
    accuracy: number;
    lastPracticed: string;
  }>;
  weeklyProgress: Array<{
    week: string;
    sessions: number;
    hours: number;
    questions: number;
  }>;
}

export function ProgressSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const response = await fetch('/api/progress');
      if (response.ok) {
        const data = await response.json();
        setProgressData({
          totalStudyHours: data.data.stats.totalStudyHours,
          currentStreak: data.data.stats.currentStreak,
          completedQuestions: data.data.stats.completedQuestions,
          averageScore: data.data.stats.averageScore,
          categories: data.data.categories,
          weeklyProgress: data.data.weeklyProgress,
        });
      }
    } catch (err) {
      setError('Failed to load progress data');
      console.error('Failed to load progress data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/progress/reset', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset progress');
      }

      setSuccess('Progress data has been reset successfully!');
      await loadProgressData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset progress');
    } finally {
      setIsLoading(false);
      setShowResetConfirm(false);
    }
  };

  const handleExportProgress = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/progress/export', {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to export progress');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tayyari-progress-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Progress data exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export progress');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !progressData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading progress data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Progress & Analytics</h2>
        <p className="text-text-secondary">
          View your study progress and manage your learning data.
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

      {progressData && (
        <>
          {/* Overview Stats */}
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-4">Progress Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-electric-blue mb-1">
                  {progressData.totalStudyHours.toFixed(1)}h
                </div>
                <div className="text-sm text-text-muted">Total Study Time</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-neon-green mb-1">
                  {progressData.currentStreak}
                </div>
                <div className="text-sm text-text-muted">Current Streak</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-deep-purple mb-1">
                  {progressData.completedQuestions}
                </div>
                <div className="text-sm text-text-muted">Questions Solved</div>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-bold text-text-accent mb-1">
                  {progressData.averageScore}%
                </div>
                <div className="text-sm text-text-muted">Average Score</div>
              </GlassCard>
            </div>
          </div>

          {/* Category Progress */}
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-4">Progress by Category</h3>
            <div className="space-y-3">
              {progressData.categories.map((category, index) => (
                <GlassCard key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text-primary capitalize">
                        {category.category.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-text-muted">
                        {category.completedQuestions} questions • {category.accuracy}% accuracy
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-electric-blue">
                        {category.accuracy}%
                      </div>
                      <div className="text-xs text-text-muted">
                        {category.lastPracticed ? 
                          `Last: ${new Date(category.lastPracticed).toLocaleDateString()}` : 
                          'Not practiced'
                        }
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
              {progressData.categories.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  No practice data available yet. Start solving problems to see your progress!
                </div>
              )}
            </div>
          </div>

          {/* Weekly Progress */}
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-4">Weekly Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {progressData.weeklyProgress.map((week, index) => (
                <GlassCard key={index} className="p-4">
                  <div className="text-sm text-text-muted mb-2">Week of {week.week}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Sessions:</span>
                      <span className="text-sm font-medium text-text-primary">{week.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Hours:</span>
                      <span className="text-sm font-medium text-text-primary">{week.hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Questions:</span>
                      <span className="text-sm font-medium text-text-primary">{week.questions}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Data Management */}
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-4">Data Management</h3>
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">Export Progress Data</div>
                <div className="text-sm text-text-muted mt-1">
                  Download your complete progress history as JSON
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleExportProgress}
                disabled={isLoading}
                className="ml-4"
              >
                Export Data
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-red-400">Reset All Progress</div>
                <div className="text-sm text-text-muted mt-1">
                  Permanently delete all your study progress and statistics
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {showResetConfirm && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleResetProgress}
                  disabled={isLoading}
                  className={showResetConfirm ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-400 hover:text-red-300 bg-transparent'}
                >
                  {isLoading ? 'Resetting...' : showResetConfirm ? 'Confirm Reset' : 'Reset Progress'}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Progress Insights */}
      <div className="bg-bg-secondary/30 p-4 rounded-lg">
        <h4 className="font-medium text-text-primary mb-2">Progress Insights</h4>
        <div className="text-sm text-text-muted">
          {progressData && (
            <div className="space-y-1">
              {progressData.currentStreak > 7 && (
                <p>🔥 Amazing! You've maintained a {progressData.currentStreak}-day streak!</p>
              )}
              {progressData.totalStudyHours > 50 && (
                <p>📚 You've dedicated over {progressData.totalStudyHours.toFixed(0)} hours to learning!</p>
              )}
              {progressData.averageScore > 80 && (
                <p>🎯 Excellent performance with {progressData.averageScore}% average score!</p>
              )}
              {progressData.completedQuestions > 100 && (
                <p>💪 You've solved over {progressData.completedQuestions} questions!</p>
              )}
              {!progressData.currentStreak && (
                <p>💡 Start solving problems to build your streak and track progress!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

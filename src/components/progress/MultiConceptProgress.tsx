"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { 
  TrendingUpIcon, 
  ClockIcon, 
  TargetIcon, 
  StarIcon,
  CalendarIcon,
  BookIcon,
  AwardIcon,
  ChevronRightIcon,
  FireIcon
} from "@/components/icons/Icons";

interface ConceptProgress {
  id: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completionPercentage: number;
  timeSpent: number;
  lastStudied: Date | null;
  currentModule: string;
  milestones: Milestone[];
  weeklyGoal: number;
  weeklyProgress: number;
  streak: number;
  isActive: boolean;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  achievedAt: Date | null;
  isCompleted: boolean;
  requiredProgress: number;
  celebrationShown?: boolean;
}

interface UserAnalytics {
  totalConcepts: number;
  activeConcepts: number;
  completedConcepts: number;
  averageProgress: number;
  totalTimeSpent: number;
  learningVelocity: number;
  strongestConcepts: string[];
  strugglingConcepts: string[];
  weeklyStreak: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

interface MultiConceptProgressProps {
  concepts: ConceptProgress[];
  analytics: UserAnalytics;
  onConceptClick: (conceptId: string) => void;
  onCelebrateMilestone: (milestone: Milestone, conceptId: string) => void;
  showCelebrations?: boolean;
}

const categoryIcons: Record<string, string> = {
  programming: "💻",
  mathematics: "📊",
  science: "🔬",
  business: "💼",
  design: "🎨",
  language: "🗣️",
  general: "📚",
};

const difficultyColors = {
  beginner: "text-green-400 bg-green-400/10",
  intermediate: "text-yellow-400 bg-yellow-400/10",
  advanced: "text-red-400 bg-red-400/10",
};

export function MultiConceptProgress({
  concepts,
  analytics,
  onConceptClick,
  onCelebrateMilestone,
  showCelebrations = true,
}: MultiConceptProgressProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'progress' | 'time' | 'name'>('progress');
  const [showCompleted, setShowCompleted] = useState(true);
  const [celebratingMilestone, setCelebratingMilestone] = useState<{
    milestone: Milestone;
    conceptId: string;
  } | null>(null);

  // Check for new milestones to celebrate
  useEffect(() => {
    if (!showCelebrations) return;

    const newMilestones = concepts.flatMap(concept =>
      concept.milestones
        .filter(m => m.isCompleted && !m.celebrationShown)
        .map(m => ({ milestone: m, conceptId: concept.id }))
    );

    if (newMilestones.length > 0 && !celebratingMilestone) {
      setCelebratingMilestone(newMilestones[0]);
    }
  }, [concepts, showCelebrations, celebratingMilestone]);

  const sortedConcepts = [...concepts]
    .filter(concept => showCompleted || concept.completionPercentage < 100)
    .sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return b.completionPercentage - a.completionPercentage;
        case 'time':
          return b.timeSpent - a.timeSpent;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const activeConcepts = concepts.filter(c => c.isActive);
  const completedConcepts = concepts.filter(c => c.completionPercentage >= 100);

  const formatTimeSpent = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  const formatLastStudied = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  const handleMilestoneCelebration = () => {
    if (celebratingMilestone) {
      onCelebrateMilestone(celebratingMilestone.milestone, celebratingMilestone.conceptId);
      setCelebratingMilestone(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Milestone Celebration Modal */}
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone.milestone}
          conceptName={concepts.find(c => c.id === celebratingMilestone.conceptId)?.name || ''}
          onClose={handleMilestoneCelebration}
        />
      )}

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-electric-blue mb-1">
            {analytics.activeConcepts}
          </div>
          <div className="text-sm text-text-secondary">Active Concepts</div>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-neon-green mb-1">
            {Math.round(analytics.averageProgress)}%
          </div>
          <div className="text-sm text-text-secondary">Avg Progress</div>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {formatTimeSpent(analytics.totalTimeSpent)}
          </div>
          <div className="text-sm text-text-secondary">Total Time</div>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <FireIcon size={20} className="text-orange-400" />
            <div className="text-2xl font-bold text-orange-400">
              {analytics.weeklyStreak}
            </div>
          </div>
          <div className="text-sm text-text-secondary">Day Streak</div>
        </GlassCard>
      </div>

      {/* Monthly Goal Progress */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TargetIcon size={16} className="text-electric-blue" />
            <span className="font-medium">Monthly Goal</span>
          </div>
          <span className="text-sm text-text-secondary">
            {Math.round(analytics.monthlyProgress)}% of {analytics.monthlyGoal}h
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-electric-blue to-neon-green h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, analytics.monthlyProgress)}%` }}
          />
        </div>
      </GlassCard>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-bg-secondary border border-white/10 rounded-md px-3 py-1 text-sm focus:border-electric-blue transition-colors"
            >
              <option value="progress">Progress</option>
              <option value="time">Time Spent</option>
              <option value="name">Name</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-white/20 bg-transparent"
            />
            Show completed
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-electric-blue text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-electric-blue text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            <div className="w-4 h-4 flex flex-col gap-0.5">
              <div className="bg-current h-0.5 rounded-sm"></div>
              <div className="bg-current h-0.5 rounded-sm"></div>
              <div className="bg-current h-0.5 rounded-sm"></div>
              <div className="bg-current h-0.5 rounded-sm"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Concepts Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedConcepts.map(concept => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              onClick={() => onConceptClick(concept.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedConcepts.map(concept => (
            <ConceptListItem
              key={concept.id}
              concept={concept}
              onClick={() => onConceptClick(concept.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedConcepts.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <BookIcon size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="text-lg font-medium mb-2">No concepts to show</h3>
          <p className="text-text-muted">
            {!showCompleted 
              ? "All your concepts are completed! Toggle 'Show completed' to see them."
              : "Start learning by adding your first concept."
            }
          </p>
        </div>
      )}
    </div>
  );
}

interface ConceptCardProps {
  concept: ConceptProgress;
  onClick: () => void;
}

function ConceptCard({ concept, onClick }: ConceptCardProps) {
  const formatTimeSpent = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  const formatLastStudied = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const completedMilestones = concept.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = concept.milestones.length;

  return (
    <button
      onClick={onClick}
      className="text-left w-full group"
    >
      <GlassCard className="p-4 h-full hover:bg-white/5 transition-all duration-200 group-hover:scale-[1.02]">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {categoryIcons[concept.category] || categoryIcons.general}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-text-primary truncate">{concept.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[concept.difficulty]}`}>
                    {concept.difficulty}
                  </span>
                  {concept.streak > 0 && (
                    <div className="flex items-center gap-1">
                      <FireIcon size={12} className="text-orange-400" />
                      <span className="text-xs text-orange-400">{concept.streak}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ChevronRightIcon size={16} className="text-text-muted group-hover:text-text-secondary transition-colors" />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Progress</span>
              <span className="font-medium text-text-primary">
                {Math.round(concept.completionPercentage)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-electric-blue to-neon-green h-2 rounded-full transition-all duration-500"
                style={{ width: `${concept.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Current Module */}
          {concept.currentModule && (
            <div className="text-sm">
              <span className="text-text-secondary">Current: </span>
              <span className="text-text-primary">{concept.currentModule}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ClockIcon size={14} className="text-text-muted" />
              <span className="text-text-secondary">{formatTimeSpent(concept.timeSpent)}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} className="text-text-muted" />
              <span className="text-text-secondary">{formatLastStudied(concept.lastStudied)}</span>
            </div>
          </div>

          {/* Milestones */}
          {totalMilestones > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AwardIcon size={14} className="text-yellow-400" />
                <span className="text-text-secondary">Milestones</span>
              </div>
              <span className="text-text-primary">
                {completedMilestones}/{totalMilestones}
              </span>
            </div>
          )}

          {/* Weekly Goal */}
          {concept.weeklyGoal > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">This week</span>
                <span className="text-text-muted">
                  {formatTimeSpent(concept.weeklyProgress)} / {formatTimeSpent(concept.weeklyGoal)}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1">
                <div 
                  className="bg-neon-green h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (concept.weeklyProgress / concept.weeklyGoal) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </button>
  );
}

interface ConceptListItemProps {
  concept: ConceptProgress;
  onClick: () => void;
}

function ConceptListItem({ concept, onClick }: ConceptListItemProps) {
  const formatTimeSpent = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  const formatLastStudied = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const completedMilestones = concept.milestones.filter(m => m.isCompleted).length;
  const totalMilestones = concept.milestones.length;

  return (
    <button
      onClick={onClick}
      className="text-left w-full group"
    >
      <GlassCard className="p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="text-2xl">
            {categoryIcons[concept.category] || categoryIcons.general}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-text-primary truncate">{concept.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[concept.difficulty]}`}>
                {concept.difficulty}
              </span>
              {concept.streak > 0 && (
                <div className="flex items-center gap-1">
                  <FireIcon size={12} className="text-orange-400" />
                  <span className="text-xs text-orange-400">{concept.streak}</span>
                </div>
              )}
            </div>
            
            {concept.currentModule && (
              <p className="text-sm text-text-secondary truncate">{concept.currentModule}</p>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-text-primary">{Math.round(concept.completionPercentage)}%</div>
              <div className="text-xs text-text-muted">Progress</div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-text-primary">{formatTimeSpent(concept.timeSpent)}</div>
              <div className="text-xs text-text-muted">Time</div>
            </div>
            
            {totalMilestones > 0 && (
              <div className="text-center">
                <div className="font-medium text-text-primary">{completedMilestones}/{totalMilestones}</div>
                <div className="text-xs text-text-muted">Milestones</div>
              </div>
            )}
            
            <div className="text-center">
              <div className="font-medium text-text-primary">{formatLastStudied(concept.lastStudied)}</div>
              <div className="text-xs text-text-muted">Last studied</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-24">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-electric-blue to-neon-green h-2 rounded-full transition-all duration-500"
                style={{ width: `${concept.completionPercentage}%` }}
              />
            </div>
          </div>

          <ChevronRightIcon size={16} className="text-text-muted group-hover:text-text-secondary transition-colors" />
        </div>
      </GlassCard>
    </button>
  );
}

interface MilestoneCelebrationProps {
  milestone: Milestone;
  conceptName: string;
  onClose: () => void;
}

function MilestoneCelebration({ milestone, conceptName, onClose }: MilestoneCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="p-8 text-center max-w-md w-full animate-bounce-in">
        <div className="space-y-4">
          <div className="text-6xl animate-pulse">🎉</div>
          
          <div>
            <h3 className="text-2xl font-bold text-electric-blue mb-2">Milestone Achieved!</h3>
            <h4 className="text-lg font-medium text-text-primary mb-1">{milestone.name}</h4>
            <p className="text-sm text-text-secondary">{conceptName}</p>
          </div>
          
          <p className="text-text-secondary">{milestone.description}</p>
          
          <Button onClick={onClose} className="mt-6">
            Continue Learning
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
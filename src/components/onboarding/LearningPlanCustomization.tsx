"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { DropdownSelect } from "@/components/base/DropdownSelect";
import { CalendarIcon, ClockIcon, TargetIcon, TrendingUpIcon } from "@/components/icons/Icons";

interface LearningPlan {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  hoursPerWeek: number;
  concepts: PlannedConcept[];
  schedule: StudySchedule;
  milestones: PlanMilestone[];
}

interface PlannedConcept {
  conceptId: string;
  name: string;
  estimatedDuration: number;
  weeklyHours: number;
  priority: 'high' | 'medium' | 'low';
  milestones: string[];
}

interface StudySchedule {
  preferredDays: string[];
  preferredTimes: string[];
  sessionDuration: number;
  breakDuration: number;
  studyPattern: 'intensive' | 'regular' | 'relaxed';
}

interface PlanMilestone {
  id: string;
  name: string;
  description: string;
  targetWeek: number;
  conceptIds: string[];
}

interface PlanCustomizationProps {
  initialPlan: LearningPlan;
  onPlanChange: (plan: LearningPlan) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

const studyPatterns = [
  { value: 'intensive', label: 'Intensive (Fast-paced)' },
  { value: 'regular', label: 'Regular (Balanced)' },
  { value: 'relaxed', label: 'Relaxed (Flexible)' },
];

const weekDays = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const timeSlots = [
  { value: 'morning', label: 'Morning (6-12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12-6 PM)' },
  { value: 'evening', label: 'Evening (6-10 PM)' },
  { value: 'night', label: 'Night (10 PM+)' },
];

export function LearningPlanCustomization({
  initialPlan,
  onPlanChange,
  onGenerate,
  isGenerating = false,
}: PlanCustomizationProps) {
  const [plan, setPlan] = useState<LearningPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'concepts' | 'milestones'>('overview');

  useEffect(() => {
    onPlanChange(plan);
  }, [plan, onPlanChange]);

  const updatePlan = (updates: Partial<LearningPlan>) => {
    setPlan(prev => ({ ...prev, ...updates }));
  };

  const updateSchedule = (updates: Partial<StudySchedule>) => {
    setPlan(prev => ({
      ...prev,
      schedule: { ...prev.schedule, ...updates }
    }));
  };

  const updateConcept = (conceptId: string, updates: Partial<PlannedConcept>) => {
    setPlan(prev => ({
      ...prev,
      concepts: prev.concepts.map(concept =>
        concept.conceptId === conceptId
          ? { ...concept, ...updates }
          : concept
      )
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TargetIcon },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'concepts', label: 'Concepts', icon: ClockIcon },
    { id: 'milestones', label: 'Milestones', icon: TrendingUpIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Customize Your Learning Plan</h2>
        <p className="text-text-secondary">
          Adjust the plan to match your preferences and schedule
        </p>
      </div>

      {/* Plan Summary */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-electric-blue">{plan.totalWeeks}</div>
            <div className="text-sm text-text-secondary">Weeks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neon-green">{plan.hoursPerWeek}</div>
            <div className="text-sm text-text-secondary">Hours/Week</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{plan.concepts.length}</div>
            <div className="text-sm text-text-secondary">Concepts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{plan.milestones.length}</div>
            <div className="text-sm text-text-secondary">Milestones</div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-electric-blue text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <OverviewTab
            plan={plan}
            onPlanChange={updatePlan}
            onGenerate={onGenerate}
            isGenerating={isGenerating}
          />
        )}
        
        {activeTab === 'schedule' && (
          <ScheduleTab
            schedule={plan.schedule}
            onScheduleChange={updateSchedule}
          />
        )}
        
        {activeTab === 'concepts' && (
          <ConceptsTab
            concepts={plan.concepts}
            onConceptChange={updateConcept}
          />
        )}
        
        {activeTab === 'milestones' && (
          <MilestonesTab
            milestones={plan.milestones}
            totalWeeks={plan.totalWeeks}
          />
        )}
      </div>
    </div>
  );
}

interface OverviewTabProps {
  plan: LearningPlan;
  onPlanChange: (updates: Partial<LearningPlan>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

function OverviewTab({ plan, onPlanChange, onGenerate, isGenerating }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Plan Name</label>
            <input
              type="text"
              value={plan.name}
              onChange={(e) => onPlanChange({ name: e.target.value })}
              className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary">Description</label>
            <textarea
              value={plan.description}
              onChange={(e) => onPlanChange({ description: e.target.value })}
              rows={3}
              className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Total Duration (weeks)</label>
              <input
                type="number"
                min="4"
                max="52"
                value={plan.totalWeeks}
                onChange={(e) => onPlanChange({ totalWeeks: parseInt(e.target.value) || 12 })}
                className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary">Hours per Week</label>
              <input
                type="number"
                min="1"
                max="40"
                value={plan.hoursPerWeek}
                onChange={(e) => onPlanChange({ hoursPerWeek: parseInt(e.target.value) || 5 })}
                className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="flex justify-center">
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Regenerating Plan...
            </>
          ) : (
            <>
              <TrendingUpIcon size={16} />
              Regenerate Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface ScheduleTabProps {
  schedule: StudySchedule;
  onScheduleChange: (updates: Partial<StudySchedule>) => void;
}

function ScheduleTab({ schedule, onScheduleChange }: ScheduleTabProps) {
  const toggleDay = (day: string) => {
    const newDays = schedule.preferredDays.includes(day)
      ? schedule.preferredDays.filter(d => d !== day)
      : [...schedule.preferredDays, day];
    onScheduleChange({ preferredDays: newDays });
  };

  const toggleTime = (time: string) => {
    const newTimes = schedule.preferredTimes.includes(time)
      ? schedule.preferredTimes.filter(t => t !== time)
      : [...schedule.preferredTimes, time];
    onScheduleChange({ preferredTimes: newTimes });
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-3 block">Study Pattern</label>
            <DropdownSelect
              value={schedule.studyPattern}
              onChange={(value) => onScheduleChange({ studyPattern: value as any })}
              options={studyPatterns}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-3 block">Preferred Days</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {weekDays.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`
                    p-3 rounded-lg text-sm transition-colors
                    ${schedule.preferredDays.includes(day.value)
                      ? 'bg-electric-blue text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-3 block">Preferred Times</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {timeSlots.map(time => (
                <button
                  key={time.value}
                  onClick={() => toggleTime(time.value)}
                  className={`
                    p-3 rounded-lg text-sm transition-colors
                    ${schedule.preferredTimes.includes(time.value)
                      ? 'bg-neon-green text-black'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                    }
                  `}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Session Duration (minutes)</label>
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                value={schedule.sessionDuration}
                onChange={(e) => onScheduleChange({ sessionDuration: parseInt(e.target.value) || 60 })}
                className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary">Break Duration (minutes)</label>
              <input
                type="number"
                min="5"
                max="30"
                step="5"
                value={schedule.breakDuration}
                onChange={(e) => onScheduleChange({ breakDuration: parseInt(e.target.value) || 10 })}
                className="w-full mt-2 bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

interface ConceptsTabProps {
  concepts: PlannedConcept[];
  onConceptChange: (conceptId: string, updates: Partial<PlannedConcept>) => void;
}

function ConceptsTab({ concepts, onConceptChange }: ConceptsTabProps) {
  const priorityColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="space-y-4">
      {concepts.map(concept => (
        <GlassCard key={concept.conceptId} className="p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-text-primary">{concept.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[concept.priority]}`}>
                    {concept.priority} priority
                  </span>
                  <span className="text-sm text-text-muted">
                    {concept.estimatedDuration} weeks
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-text-secondary">Priority</label>
                <select
                  value={concept.priority}
                  onChange={(e) => onConceptChange(concept.conceptId, { priority: e.target.value as any })}
                  className="w-full mt-1 bg-bg-secondary border border-white/10 rounded-md px-3 py-2 text-sm focus:border-electric-blue transition-colors"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-text-secondary">Duration (weeks)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={concept.estimatedDuration}
                  onChange={(e) => onConceptChange(concept.conceptId, { estimatedDuration: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 bg-transparent border border-white/10 rounded-md px-3 py-2 text-sm focus:border-electric-blue transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary">Hours/Week</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={concept.weeklyHours}
                  onChange={(e) => onConceptChange(concept.conceptId, { weeklyHours: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 bg-transparent border border-white/10 rounded-md px-3 py-2 text-sm focus:border-electric-blue transition-colors"
                />
              </div>
            </div>

            {concept.milestones.length > 0 && (
              <div>
                <label className="text-xs text-text-secondary">Milestones</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {concept.milestones.map((milestone, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-electric-blue/10 text-electric-blue text-xs rounded-full"
                    >
                      {milestone}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

interface MilestonesTabProps {
  milestones: PlanMilestone[];
  totalWeeks: number;
}

function MilestonesTab({ milestones, totalWeeks }: MilestonesTabProps) {
  return (
    <div className="space-y-4">
      <div className="text-center text-text-secondary">
        <p>Your learning plan includes {milestones.length} key milestones</p>
      </div>

      {milestones.map((milestone, index) => (
        <GlassCard key={milestone.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-electric-blue rounded-full flex items-center justify-center text-white text-sm font-medium">
                {index + 1}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-text-primary">{milestone.name}</h4>
                <span className="text-sm text-text-muted">Week {milestone.targetWeek}</span>
              </div>
              
              <p className="text-sm text-text-secondary mb-3">{milestone.description}</p>
              
              {milestone.conceptIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {milestone.conceptIds.map(conceptId => (
                    <span
                      key={conceptId}
                      className="px-2 py-1 bg-neon-green/10 text-neon-green text-xs rounded-full"
                    >
                      {conceptId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
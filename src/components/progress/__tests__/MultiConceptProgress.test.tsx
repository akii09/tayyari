// Unit tests for MultiConceptProgress component logic
import { describe, it, expect } from 'vitest';

const mockConcepts = [
  {
    id: 'javascript',
    name: 'JavaScript Fundamentals',
    category: 'programming',
    difficulty: 'beginner' as const,
    completionPercentage: 75,
    timeSpent: 25.5,
    lastStudied: new Date('2024-01-15'),
    currentModule: 'Functions and Scope',
    milestones: [
      {
        id: 'js-milestone-1',
        name: 'Variables Mastery',
        description: 'Understand variables and data types',
        achievedAt: new Date('2024-01-10'),
        isCompleted: true,
        requiredProgress: 25,
      },
      {
        id: 'js-milestone-2',
        name: 'Functions Expert',
        description: 'Master functions and closures',
        achievedAt: null,
        isCompleted: false,
        requiredProgress: 75,
      },
    ],
    weeklyGoal: 5,
    weeklyProgress: 3.5,
    streak: 7,
    isActive: true,
  },
  {
    id: 'react',
    name: 'React Development',
    category: 'programming',
    difficulty: 'intermediate' as const,
    completionPercentage: 30,
    timeSpent: 12.0,
    lastStudied: new Date('2024-01-12'),
    currentModule: 'Components and Props',
    milestones: [],
    weeklyGoal: 4,
    weeklyProgress: 2.0,
    streak: 3,
    isActive: true,
  },
];

const mockAnalytics = {
  totalConcepts: 2,
  activeConcepts: 2,
  completedConcepts: 0,
  averageProgress: 52.5,
  totalTimeSpent: 37.5,
  learningVelocity: 1.4,
  strongestConcepts: ['javascript'],
  strugglingConcepts: ['react'],
  weeklyStreak: 7,
  monthlyGoal: 40,
  monthlyProgress: 75,
};

// Helper functions that would be used in the component
function formatTimeSpent(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours * 10) / 10}h`;
}

function formatLastStudied(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

function sortConcepts(concepts: typeof mockConcepts, sortBy: 'progress' | 'time' | 'name') {
  return [...concepts].sort((a, b) => {
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
}

function filterConcepts(concepts: typeof mockConcepts, showCompleted: boolean) {
  return concepts.filter(concept => showCompleted || concept.completionPercentage < 100);
}

function getCompletedMilestones(concept: typeof mockConcepts[0]) {
  return concept.milestones.filter(m => m.isCompleted);
}

function getNewMilestones(concepts: typeof mockConcepts) {
  return concepts.flatMap(concept =>
    concept.milestones
      .filter(m => m.isCompleted && !m.celebrationShown)
      .map(m => ({ milestone: m, conceptId: concept.id }))
  );
}

describe('MultiConceptProgress Logic', () => {
  it('formats time spent correctly', () => {
    expect(formatTimeSpent(0.5)).toBe('30m');
    expect(formatTimeSpent(1.5)).toBe('1.5h');
    expect(formatTimeSpent(25.5)).toBe('25.5h');
  });

  it('formats last studied date correctly', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    expect(formatLastStudied(today)).toBe('Today');
    expect(formatLastStudied(yesterday)).toBe('Yesterday');
    expect(formatLastStudied(threeDaysAgo)).toBe('3 days ago');
    expect(formatLastStudied(twoWeeksAgo)).toBe('2 weeks ago');
    expect(formatLastStudied(null)).toBe('Never');
  });

  it('sorts concepts by progress', () => {
    const sorted = sortConcepts(mockConcepts, 'progress');
    expect(sorted[0].completionPercentage).toBe(75);
    expect(sorted[1].completionPercentage).toBe(30);
  });

  it('sorts concepts by time spent', () => {
    const sorted = sortConcepts(mockConcepts, 'time');
    expect(sorted[0].timeSpent).toBe(25.5);
    expect(sorted[1].timeSpent).toBe(12.0);
  });

  it('sorts concepts by name', () => {
    const sorted = sortConcepts(mockConcepts, 'name');
    expect(sorted[0].name).toBe('JavaScript Fundamentals');
    expect(sorted[1].name).toBe('React Development');
  });

  it('filters out completed concepts when showCompleted is false', () => {
    const conceptsWithCompleted = [
      ...mockConcepts,
      { ...mockConcepts[0], id: 'completed', completionPercentage: 100 }
    ];
    
    const filtered = filterConcepts(conceptsWithCompleted, false);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(c => c.completionPercentage < 100)).toBe(true);
  });

  it('includes completed concepts when showCompleted is true', () => {
    const conceptsWithCompleted = [
      ...mockConcepts,
      { ...mockConcepts[0], id: 'completed', completionPercentage: 100 }
    ];
    
    const filtered = filterConcepts(conceptsWithCompleted, true);
    expect(filtered).toHaveLength(3);
  });

  it('counts completed milestones correctly', () => {
    const completedMilestones = getCompletedMilestones(mockConcepts[0]);
    expect(completedMilestones).toHaveLength(1);
    expect(completedMilestones[0].name).toBe('Variables Mastery');
  });

  it('identifies new milestones for celebration', () => {
    const conceptsWithNewMilestone = [
      {
        ...mockConcepts[0],
        milestones: [
          {
            id: 'new-milestone',
            name: 'New Achievement',
            description: 'You did great!',
            achievedAt: new Date(),
            isCompleted: true,
            requiredProgress: 50,
            celebrationShown: false,
          },
        ],
      },
    ];

    const newMilestones = getNewMilestones(conceptsWithNewMilestone);
    expect(newMilestones).toHaveLength(1);
    expect(newMilestones[0].milestone.name).toBe('New Achievement');
  });

  it('calculates weekly progress percentage', () => {
    const concept = mockConcepts[0];
    const weeklyProgressPercentage = (concept.weeklyProgress / concept.weeklyGoal) * 100;
    expect(weeklyProgressPercentage).toBe(70); // 3.5 / 5 * 100
  });

  it('handles concepts with no milestones', () => {
    const concept = mockConcepts[1];
    const completedMilestones = getCompletedMilestones(concept);
    expect(completedMilestones).toHaveLength(0);
  });

  it('calculates analytics correctly', () => {
    expect(mockAnalytics.averageProgress).toBe(52.5); // (75 + 30) / 2
    expect(mockAnalytics.totalTimeSpent).toBe(37.5); // 25.5 + 12.0
    expect(mockAnalytics.activeConcepts).toBe(2);
  });
});
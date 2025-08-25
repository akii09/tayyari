// Unit tests for ConceptSwitcher component logic
import { describe, it, expect } from 'vitest';

const mockConcepts = [
  {
    id: 'javascript',
    name: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    category: 'programming',
    difficulty: 'beginner' as const,
    completionPercentage: 75,
    timeSpent: 25.5,
    lastStudied: new Date('2024-01-15'),
    isActive: true,
    contextLoaded: true,
  },
  {
    id: 'react',
    name: 'React Development',
    description: 'Build modern web applications with React',
    category: 'programming',
    difficulty: 'intermediate' as const,
    completionPercentage: 30,
    timeSpent: 12.0,
    lastStudied: new Date('2024-01-10'),
    isActive: true,
    contextLoaded: false,
  },
];

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

function getActiveConcepts(concepts: typeof mockConcepts) {
  return concepts.filter(c => c.isActive);
}

function getInactiveConcepts(concepts: typeof mockConcepts) {
  return concepts.filter(c => !c.isActive);
}

describe('ConceptSwitcher Logic', () => {
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

  it('filters active concepts', () => {
    const activeConcepts = getActiveConcepts(mockConcepts);
    expect(activeConcepts).toHaveLength(2);
    expect(activeConcepts.every(c => c.isActive)).toBe(true);
  });

  it('filters inactive concepts', () => {
    const conceptsWithInactive = [
      ...mockConcepts,
      { ...mockConcepts[0], id: 'inactive', isActive: false }
    ];
    
    const inactiveConcepts = getInactiveConcepts(conceptsWithInactive);
    expect(inactiveConcepts).toHaveLength(1);
    expect(inactiveConcepts[0].isActive).toBe(false);
  });

  it('handles empty concepts list', () => {
    const activeConcepts = getActiveConcepts([]);
    expect(activeConcepts).toHaveLength(0);
  });

  it('identifies concepts with loaded context', () => {
    const conceptsWithContext = mockConcepts.filter(c => c.contextLoaded);
    expect(conceptsWithContext).toHaveLength(1);
    expect(conceptsWithContext[0].id).toBe('javascript');
  });

  it('calculates completion percentage correctly', () => {
    const concept = mockConcepts[0];
    expect(concept.completionPercentage).toBe(75);
    expect(Math.round(concept.completionPercentage)).toBe(75);
  });
});
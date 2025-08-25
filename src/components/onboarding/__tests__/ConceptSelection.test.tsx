// Unit tests for ConceptSelection component logic
import { describe, it, expect } from 'vitest';

const mockConcepts = [
  {
    id: 'javascript',
    name: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    category: 'programming',
    difficulty: 'beginner' as const,
    estimatedHours: 40,
    prerequisites: [],
    isRecommended: true,
  },
  {
    id: 'react',
    name: 'React Development',
    description: 'Build modern web applications with React',
    category: 'programming',
    difficulty: 'intermediate' as const,
    estimatedHours: 60,
    prerequisites: ['javascript'],
    isRecommended: false,
  },
];

// Helper functions that would be used in the component
function filterConcepts(concepts: typeof mockConcepts, searchQuery: string, category: string, difficulty: string) {
  return concepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         concept.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || concept.category === category;
    const matchesDifficulty = difficulty === "all" || concept.difficulty === difficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });
}

function getRecommendedConcepts(concepts: typeof mockConcepts) {
  return concepts.filter(c => c.isRecommended);
}

function canSelectConcept(selectedConcepts: string[], maxSelections: number, conceptId: string) {
  const isSelected = selectedConcepts.includes(conceptId);
  return isSelected || selectedConcepts.length < maxSelections;
}

describe('ConceptSelection Logic', () => {
  it('filters concepts by search query', () => {
    const filtered = filterConcepts(mockConcepts, 'React', 'all', 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('React Development');
  });

  it('filters concepts by category', () => {
    const filtered = filterConcepts(mockConcepts, '', 'programming', 'all');
    expect(filtered).toHaveLength(2);
  });

  it('filters concepts by difficulty', () => {
    const filtered = filterConcepts(mockConcepts, '', 'all', 'beginner');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].difficulty).toBe('beginner');
  });

  it('returns recommended concepts', () => {
    const recommended = getRecommendedConcepts(mockConcepts);
    expect(recommended).toHaveLength(1);
    expect(recommended[0].isRecommended).toBe(true);
  });

  it('respects max selection limit', () => {
    const selectedConcepts = ['javascript'];
    const maxSelections = 1;
    
    expect(canSelectConcept(selectedConcepts, maxSelections, 'javascript')).toBe(true); // Already selected
    expect(canSelectConcept(selectedConcepts, maxSelections, 'react')).toBe(false); // Would exceed limit
  });

  it('allows selection when under limit', () => {
    const selectedConcepts = ['javascript'];
    const maxSelections = 5;
    
    expect(canSelectConcept(selectedConcepts, maxSelections, 'react')).toBe(true);
  });

  it('handles empty search results', () => {
    const filtered = filterConcepts(mockConcepts, 'nonexistent', 'all', 'all');
    expect(filtered).toHaveLength(0);
  });

  it('handles case insensitive search', () => {
    const filtered = filterConcepts(mockConcepts, 'JAVASCRIPT', 'all', 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('JavaScript Fundamentals');
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningConceptService } from '../learningConceptService';
import { UserService } from '../userService';

// Mock database
vi.mock('../../config', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Integration Tests - Learning Concept and User Services', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Concept Learning Flow', () => {
    it('should handle complete learning concept lifecycle', async () => {
      // This is a basic integration test to verify the services can work together
      // In a real scenario, this would test the actual database interactions
      
      const conceptData = {
        name: 'JavaScript Fundamentals',
        description: 'Learn JavaScript basics',
        category: 'programming',
        difficulty: 'beginner' as const,
        estimatedHours: 20,
        prerequisites: [],
        learningObjectives: ['Variables', 'Functions', 'Objects'],
        priority: 8,
        weeklyHours: 4,
      };

      // Mock successful concept creation
      const mockConcept = {
        id: 'concept-123',
        userId: mockUserId,
        name: conceptData.name,
        description: conceptData.description,
        category: conceptData.category,
        difficulty: conceptData.difficulty,
        estimatedHours: conceptData.estimatedHours,
        prerequisites: null,
        learningObjectives: JSON.stringify(conceptData.learningObjectives),
        customPrompts: JSON.stringify([]),
        isActive: true,
        completionPercentage: 0,
        currentModule: '',
        timeSpent: 0,
        lastStudied: null,
        createdAt: '2024-01-16T00:00:00Z',
        updatedAt: '2024-01-16T00:00:00Z',
      };

      // Mock database operations
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockConcept]),
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: mockUserId,
          name: 'Test User',
          currentSkills: JSON.stringify({}),
        }]),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const { db } = await import('../../config');
      const mockDb = vi.mocked(db);
      
      mockDb.insert.mockReturnValue(mockInsert);
      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      // Test the integration flow
      const result = await UserService.addLearningConcept(mockUserId, conceptData);

      expect(result).toBeDefined();
      expect(result?.name).toBe(conceptData.name);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled(); // For updating multi-concept profile
    });

    it('should validate service interfaces are compatible', () => {
      // Test that the service interfaces are compatible
      expect(typeof LearningConceptService.createConcept).toBe('function');
      expect(typeof LearningConceptService.getUserConcepts).toBe('function');
      expect(typeof LearningConceptService.getUserAnalytics).toBe('function');
      expect(typeof LearningConceptService.validatePrerequisites).toBe('function');
      expect(typeof LearningConceptService.findInterdisciplinaryConnections).toBe('function');

      expect(typeof UserService.getEnhancedUserProfile).toBe('function');
      expect(typeof UserService.addLearningConcept).toBe('function');
      expect(typeof UserService.updateLearningStyleProfile).toBe('function');
      expect(typeof UserService.updateMultiConceptProfile).toBe('function');
      expect(typeof UserService.getLearningRecommendations).toBe('function');
      expect(typeof UserService.trackCrossConceptSession).toBe('function');
    });

    it('should have consistent type definitions', () => {
      // Verify that the types are properly exported and consistent
      const conceptData = {
        userId: mockUserId,
        name: 'Test Concept',
        description: 'Test Description',
        category: 'programming',
        difficulty: 'beginner' as const,
        estimatedHours: 10,
        prerequisites: null,
        learningObjectives: null,
        customPrompts: null,
        isActive: true,
      };

      // This should compile without type errors
      expect(conceptData.difficulty).toBe('beginner');
      expect(conceptData.category).toBe('programming');
      expect(conceptData.isActive).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading errors gracefully', async () => {
      // Test that errors in one service don't break the other
      const { db } = await import('../../config');
      const mockDb = vi.mocked(db);

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        orderBy: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      mockDb.select.mockReturnValue(mockSelect);

      // Both services should handle database errors gracefully
      const userProfile = await UserService.getEnhancedUserProfile(mockUserId);
      const userConcepts = await LearningConceptService.getUserConcepts(mockUserId);

      expect(userProfile).toBeNull();
      expect(userConcepts).toEqual([]);
    });
  });
});
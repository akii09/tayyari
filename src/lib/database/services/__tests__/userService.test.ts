import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService, type LearningStyleProfile, type MultiConceptProfile, type EnhancedUserProfile } from '../userService';
import { LearningConceptService } from '../learningConceptService';
import { db } from '../../config';
import { users, userSettings, learningConcepts } from '../../schema';
import { eq } from 'drizzle-orm';

// Mock database
vi.mock('../../config', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock LearningConceptService
vi.mock('../learningConceptService', () => ({
  LearningConceptService: {
    getUserConcepts: vi.fn(),
    getUserAnalytics: vi.fn(),
    createConcept: vi.fn(),
    validatePrerequisites: vi.fn(),
    updateCrossConceptKnowledge: vi.fn(),
    getLearningRecommendations: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);
const mockLearningConceptService = vi.mocked(LearningConceptService);

describe('UserService - Enhanced Multi-Concept Features', () => {
  const mockUserId = 'user-123';
  
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'Software Engineer',
    experienceLevel: 'junior' as const,
    yearsOfExperience: 2,
    currentCompany: 'Test Corp',
    currentTitle: 'Junior Developer',
    targetCompanies: JSON.stringify(['Google', 'Microsoft']),
    targetRoles: JSON.stringify(['Software Engineer']),
    interviewTypes: JSON.stringify(['dsa', 'system_design']),
    targetDate: '2024-06-01',
    hoursPerWeek: 10,
    preferredStudyTime: 'evening',
    currentSkills: JSON.stringify({}),
    weakAreas: JSON.stringify(['algorithms']),
    strongAreas: JSON.stringify(['frontend']),
    difficultyPreference: 'medium',
    learningStyle: 'mixed',
    notificationPreferences: JSON.stringify({}),
    onboardingCompleted: true,
    currentStreak: 5,
    totalStudyHours: 25.5,
    lastActiveDate: '2024-01-15',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    settings: {
      theme: 'dark',
      emailNotifications: true,
    },
  };

  const mockConcepts = [
    {
      id: 'concept-1',
      userId: mockUserId,
      name: 'JavaScript Fundamentals',
      description: 'Learn JavaScript basics',
      category: 'programming',
      difficulty: 'beginner' as const,
      estimatedHours: 20,
      prerequisites: null,
      learningObjectives: JSON.stringify(['Variables', 'Functions']),
      customPrompts: JSON.stringify([]),
      isActive: true,
      completionPercentage: 75,
      currentModule: 'Functions',
      timeSpent: 15,
      lastStudied: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'concept-2',
      userId: mockUserId,
      name: 'React Development',
      description: 'Learn React framework',
      category: 'programming',
      difficulty: 'intermediate' as const,
      estimatedHours: 30,
      prerequisites: JSON.stringify(['concept-1']),
      learningObjectives: JSON.stringify(['Components', 'State']),
      customPrompts: JSON.stringify([]),
      isActive: true,
      completionPercentage: 45,
      currentModule: 'Components',
      timeSpent: 12,
      lastStudied: '2024-01-14T10:00:00Z',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-14T10:00:00Z',
    },
  ];

  const mockAnalytics = {
    userId: mockUserId,
    totalConcepts: 2,
    activeConcepts: 2,
    completedConcepts: 0,
    averageProgress: 60,
    totalTimeSpent: 27,
    conceptsWithMilestones: 1,
    learningVelocity: 2.22,
    strongestConcepts: ['concept-1'],
    strugglingConcepts: ['concept-2'],
    interdisciplinaryConnections: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEnhancedUserProfile', () => {
    it('should return enhanced user profile with concepts and analytics', async () => {
      // Mock getUserById
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      mockDb.select.mockReturnValue(mockSelect);

      // Mock LearningConceptService calls
      mockLearningConceptService.getUserConcepts.mockResolvedValue(mockConcepts);
      mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      const result = await UserService.getEnhancedUserProfile(mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUserId);
      expect(result?.activeConcepts).toEqual(mockConcepts);
      expect(result?.analytics).toEqual(mockAnalytics);
      expect(result?.learningStyleProfile).toBeDefined();
      expect(result?.multiConceptProfile).toBeDefined();
    });

    it('should return null if user not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelect);

      const result = await UserService.getEnhancedUserProfile('non-existent');

      expect(result).toBeNull();
    });

    it('should parse existing learning style profile from user data', async () => {
      const userWithLearningStyle = {
        ...mockUser,
        learningStyle: 'visual',
        currentSkills: JSON.stringify({
          learningStyleProfile: {
            primaryStyle: 'visual',
            preferences: {
              visualLearning: 8,
              auditoryLearning: 3,
              kinestheticLearning: 5,
              readingLearning: 6,
            },
          },
        }),
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([userWithLearningStyle]),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockLearningConceptService.getUserConcepts.mockResolvedValue([]);
      mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      const result = await UserService.getEnhancedUserProfile(mockUserId);

      expect(result?.learningStyleProfile?.primaryStyle).toBe('visual');
      expect(result?.learningStyleProfile?.preferences.visualLearning).toBe(8);
    });
  });

  describe('updateLearningStyleProfile', () => {
    it('should update learning style profile successfully', async () => {
      const styleProfile: LearningStyleProfile = {
        primaryStyle: 'kinesthetic',
        preferences: {
          visualLearning: 4,
          auditoryLearning: 6,
          kinestheticLearning: 9,
          readingLearning: 5,
        },
        adaptiveSettings: {
          difficultyAdjustment: 'aggressive',
          pacePreference: 'fast',
          feedbackFrequency: 'frequent',
        },
      };

      // Mock getUserById
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      // Mock update
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.updateLearningStyleProfile(mockUserId, styleProfile);

      expect(result).toBe(true);
      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          learningStyle: 'kinesthetic',
          currentSkills: expect.stringContaining('learningStyleProfile'),
        })
      );
    });

    it('should return false if user not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelect);

      const result = await UserService.updateLearningStyleProfile(mockUserId, {
        primaryStyle: 'visual',
        preferences: {
          visualLearning: 8,
          auditoryLearning: 3,
          kinestheticLearning: 5,
          readingLearning: 6,
        },
        adaptiveSettings: {
          difficultyAdjustment: 'moderate',
          pacePreference: 'medium',
          feedbackFrequency: 'regular',
        },
      });

      expect(result).toBe(false);
    });
  });

  describe('addLearningConcept', () => {
    it('should add learning concept successfully', async () => {
      const conceptData = {
        name: 'Node.js Backend',
        description: 'Learn server-side JavaScript',
        category: 'programming',
        difficulty: 'intermediate' as const,
        estimatedHours: 25,
        prerequisites: ['JavaScript Fundamentals'],
        learningObjectives: ['Express.js', 'APIs', 'Databases'],
        priority: 8,
        weeklyHours: 4,
      };

      const newConcept = {
        id: 'new-concept-123',
        userId: mockUserId,
        ...conceptData,
        prerequisites: JSON.stringify(conceptData.prerequisites),
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

      // Mock prerequisite validation
      mockLearningConceptService.getUserConcepts.mockResolvedValue([
        { ...mockConcepts[0], name: 'JavaScript Fundamentals' },
      ]);

      // Mock concept creation
      mockLearningConceptService.createConcept.mockResolvedValue(newConcept);

      // Mock user retrieval and update for multi-concept profile
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.addLearningConcept(mockUserId, conceptData);

      expect(result).toEqual(newConcept);
      expect(mockLearningConceptService.createConcept).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          name: conceptData.name,
          category: conceptData.category,
          difficulty: conceptData.difficulty,
        })
      );
    });

    it('should handle missing prerequisites gracefully', async () => {
      const conceptData = {
        name: 'Advanced React',
        description: 'Advanced React patterns',
        category: 'programming',
        difficulty: 'advanced' as const,
        prerequisites: ['React Basics', 'JavaScript Advanced'],
      };

      // Mock user concepts - missing one prerequisite
      mockLearningConceptService.getUserConcepts.mockResolvedValue([
        { ...mockConcepts[0], name: 'React Basics' },
        // Missing 'JavaScript Advanced'
      ]);

      // Mock concept creation (should still proceed with warning)
      const newConcept = { id: 'new-concept-456', userId: mockUserId };
      mockLearningConceptService.createConcept.mockResolvedValue(newConcept as any);

      // Mock user update
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.addLearningConcept(mockUserId, conceptData);

      expect(result).toBeDefined();
      // Should still create concept despite missing prerequisites
      expect(mockLearningConceptService.createConcept).toHaveBeenCalled();
    });
  });

  describe('updateMultiConceptProfile', () => {
    it('should update multi-concept profile settings', async () => {
      const conceptSettings = {
        conceptId: 'concept-1',
        priority: 9,
        weeklyHours: 5,
        learningGoal: 'Master JavaScript fundamentals for React',
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.updateMultiConceptProfile(mockUserId, conceptSettings);

      expect(result).toBe(true);
      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          currentSkills: expect.stringContaining('multiConceptProfile'),
        })
      );
    });

    it('should create new multi-concept profile if none exists', async () => {
      const conceptSettings = {
        conceptId: 'concept-1',
        priority: 7,
        weeklyHours: 3,
      };

      const userWithoutProfile = {
        ...mockUser,
        currentSkills: JSON.stringify({}),
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([userWithoutProfile]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.updateMultiConceptProfile(mockUserId, conceptSettings);

      expect(result).toBe(true);
      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          currentSkills: expect.stringContaining('concept-1'),
        })
      );
    });
  });

  describe('getLearningRecommendations', () => {
    it('should generate comprehensive learning recommendations', async () => {
      const mockProfile: EnhancedUserProfile = {
        ...mockUser,
        activeConcepts: mockConcepts,
        analytics: mockAnalytics,
        multiConceptProfile: {
          activeConcepts: ['concept-1', 'concept-2'],
          conceptPriorities: { 'concept-1': 8, 'concept-2': 6 },
          learningGoals: { 'concept-1': 'Master JS', 'concept-2': 'Learn React' },
          timeAllocation: { 'concept-1': 3, 'concept-2': 2 },
          crossConceptPreferences: {
            enableInterdisciplinary: true,
            preferredConnections: [],
          },
        },
      };

      // Mock getEnhancedUserProfile
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockLearningConceptService.getUserConcepts.mockResolvedValue(mockConcepts);
      mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      // Mock concept recommendations
      mockLearningConceptService.getLearningRecommendations.mockResolvedValue({
        nextConcepts: ['advanced-js', 'node-js'],
        reviewConcepts: ['concept-2'],
        interdisciplinaryOpportunities: ['js-math-connection'],
      });

      const result = await UserService.getLearningRecommendations(mockUserId);

      expect(result).toEqual({
        nextConcepts: ['advanced-js', 'node-js'],
        reviewConcepts: ['concept-2'],
        interdisciplinaryOpportunities: ['js-math-connection'],
        timeOptimization: expect.any(Array),
      });

      // Check time optimization recommendations
      expect(result.timeOptimization).toBeInstanceOf(Array);
    });

    it('should provide time optimization recommendations', async () => {
      const conceptsWithDifferentProgress = [
        { ...mockConcepts[0], completionPercentage: 15, timeSpent: 5 }, // Low progress, needs more time
        { ...mockConcepts[1], completionPercentage: 85, timeSpent: 25 }, // High progress, can reduce time
      ];

      const profileWithTimeAllocation = {
        ...mockUser,
        activeConcepts: conceptsWithDifferentProgress,
        analytics: mockAnalytics,
        multiConceptProfile: {
          activeConcepts: ['concept-1', 'concept-2'],
          conceptPriorities: {},
          learningGoals: {},
          timeAllocation: { 'concept-1': 2, 'concept-2': 4 },
          crossConceptPreferences: { enableInterdisciplinary: true, preferredConnections: [] },
        },
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockLearningConceptService.getUserConcepts.mockResolvedValue(conceptsWithDifferentProgress);
      mockLearningConceptService.getUserAnalytics.mockResolvedValue({
        ...mockAnalytics,
        strugglingConcepts: ['concept-1'],
      });
      mockLearningConceptService.getLearningRecommendations.mockResolvedValue({
        nextConcepts: [],
        reviewConcepts: [],
        interdisciplinaryOpportunities: [],
      });

      const result = await UserService.getLearningRecommendations(mockUserId);

      expect(result.timeOptimization).toHaveLength(2);
      
      // Should recommend increasing time for low progress concept
      const concept1Optimization = result.timeOptimization.find(opt => opt.conceptId === 'concept-1');
      expect(concept1Optimization?.recommendedHours).toBeGreaterThan(concept1Optimization?.currentHours);
      
      // Should recommend reducing time for high progress concept
      const concept2Optimization = result.timeOptimization.find(opt => opt.conceptId === 'concept-2');
      expect(concept2Optimization?.recommendedHours).toBeLessThan(concept2Optimization?.currentHours);
    });
  });

  describe('trackCrossConceptSession', () => {
    it('should track cross-concept learning session', async () => {
      const sessionData = {
        primaryConceptId: 'concept-1',
        relatedConceptIds: ['concept-2'],
        duration: 90, // 1.5 hours in minutes
        insights: ['JavaScript closures apply to React hooks', 'Event handling patterns are similar'],
        connections: ['functional-programming', 'event-driven-architecture'],
      };

      // Mock LearningConceptService calls
      mockLearningConceptService.updateProgress = vi.fn().mockResolvedValue(true);
      mockLearningConceptService.updateCrossConceptKnowledge = vi.fn().mockResolvedValue(undefined);

      // Mock user retrieval and update
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelect);
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await UserService.trackCrossConceptSession(mockUserId, sessionData);

      expect(result).toBe(true);

      // Should update progress for primary concept
      expect(mockLearningConceptService.updateProgress).toHaveBeenCalledWith(
        'concept-1',
        { timeSpent: 90 }
      );

      // Should update cross-concept knowledge for related concepts
      expect(mockLearningConceptService.updateCrossConceptKnowledge).toHaveBeenCalledTimes(2); // 2 insights

      // Should update user's total study hours
      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStudyHours: 27, // 25.5 + 1.5
        })
      );
    });
  });

  describe('Helper Methods', () => {
    describe('parseLearningStyleProfile', () => {
      it('should parse learning style from user data', async () => {
        const userWithStyle = {
          ...mockUser,
          learningStyle: 'visual',
          currentSkills: JSON.stringify({
            learningStyleProfile: {
              primaryStyle: 'visual',
              preferences: { visualLearning: 9 },
            },
          }),
        };

        // Access private method through enhanced profile
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([userWithStyle]),
        };

        mockDb.select.mockReturnValue(mockSelect);
        mockLearningConceptService.getUserConcepts.mockResolvedValue([]);
        mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

        const result = await UserService.getEnhancedUserProfile(mockUserId);

        expect(result?.learningStyleProfile?.primaryStyle).toBe('visual');
      });

      it('should return default profile for invalid data', async () => {
        const userWithInvalidData = {
          ...mockUser,
          currentSkills: 'invalid-json',
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([userWithInvalidData]),
        };

        mockDb.select.mockReturnValue(mockSelect);
        mockLearningConceptService.getUserConcepts.mockResolvedValue([]);
        mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

        const result = await UserService.getEnhancedUserProfile(mockUserId);

        expect(result?.learningStyleProfile?.primaryStyle).toBe('mixed');
        expect(result?.learningStyleProfile?.preferences.visualLearning).toBe(5);
      });
    });

    describe('buildMultiConceptProfile', () => {
      it('should build profile from active concepts', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockUser]),
        };

        mockDb.select.mockReturnValue(mockSelect);
        mockLearningConceptService.getUserConcepts.mockResolvedValue(mockConcepts);
        mockLearningConceptService.getUserAnalytics.mockResolvedValue(mockAnalytics);

        const result = await UserService.getEnhancedUserProfile(mockUserId);

        expect(result?.multiConceptProfile?.activeConcepts).toEqual(['concept-1', 'concept-2']);
        expect(result?.multiConceptProfile?.conceptPriorities['concept-1']).toBe(5);
        expect(result?.multiConceptProfile?.timeAllocation['concept-1']).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in getEnhancedUserProfile', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.select.mockReturnValue(mockSelect);

      const result = await UserService.getEnhancedUserProfile(mockUserId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully in addLearningConcept', async () => {
      mockLearningConceptService.createConcept.mockRejectedValue(new Error('Creation failed'));

      const result = await UserService.addLearningConcept(mockUserId, {
        name: 'Test Concept',
        category: 'test',
        difficulty: 'beginner',
      });

      expect(result).toBeNull();
    });

    it('should handle errors gracefully in trackCrossConceptSession', async () => {
      mockLearningConceptService.updateProgress.mockRejectedValue(new Error('Update failed'));

      const result = await UserService.trackCrossConceptSession(mockUserId, {
        primaryConceptId: 'concept-1',
        relatedConceptIds: ['concept-2'],
        duration: 60,
        insights: ['test insight'],
        connections: ['test connection'],
      });

      expect(result).toBe(false);
    });
  });
});
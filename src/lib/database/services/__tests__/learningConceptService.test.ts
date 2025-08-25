import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningConceptService, type ConceptProgress, type UserAnalytics, type CrossConceptInsight } from '../learningConceptService';
import { db } from '../../config';
import { learningConcepts, users } from '../../schema';
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

const mockDb = vi.mocked(db);

describe('LearningConceptService', () => {
  const mockUserId = 'user-123';
  const mockConceptId = 'concept-123';
  
  const mockConcept = {
    id: mockConceptId,
    userId: mockUserId,
    name: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    category: 'programming',
    difficulty: 'beginner' as const,
    estimatedHours: 20,
    prerequisites: null,
    learningObjectives: JSON.stringify(['Variables', 'Functions', 'Objects']),
    customPrompts: JSON.stringify([]),
    isActive: true,
    completionPercentage: 45,
    currentModule: 'Functions',
    timeSpent: 8.5,
    lastStudied: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createConcept', () => {
      it('should create a new learning concept successfully', async () => {
        const newConceptData = {
          userId: mockUserId,
          name: 'React Basics',
          description: 'Learn React fundamentals',
          category: 'programming',
          difficulty: 'intermediate' as const,
          estimatedHours: 15,
          prerequisites: null,
          learningObjectives: JSON.stringify(['Components', 'State', 'Props']),
          customPrompts: JSON.stringify([]),
          isActive: true,
        };

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ ...newConceptData, id: 'new-concept-123' }]),
        };

        mockDb.insert.mockReturnValue(mockInsert);

        const result = await LearningConceptService.createConcept(newConceptData);

        expect(mockDb.insert).toHaveBeenCalledWith(learningConcepts);
        expect(mockInsert.values).toHaveBeenCalledWith(expect.objectContaining(newConceptData));
        expect(result).toEqual(expect.objectContaining(newConceptData));
      });

      it('should validate prerequisites before creating concept', async () => {
        const conceptWithPrereqs = {
          userId: mockUserId,
          name: 'Advanced React',
          description: 'Advanced React concepts',
          category: 'programming',
          difficulty: 'advanced' as const,
          estimatedHours: 25,
          prerequisites: JSON.stringify(['react-basics-123']),
          learningObjectives: JSON.stringify(['Hooks', 'Context']),
          customPrompts: JSON.stringify([]),
          isActive: true,
        };

        // Mock prerequisite validation - concept doesn't exist
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]), // No prerequisites found
        };

        mockDb.select.mockReturnValue(mockSelect);

        await expect(LearningConceptService.createConcept(conceptWithPrereqs))
          .rejects.toThrow('Failed to create learning concept');
      });
    });

    describe('getUserConcepts', () => {
      it('should return all concepts for a user', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([mockConcept]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getUserConcepts(mockUserId);

        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.where).toHaveBeenCalledWith(eq(learningConcepts.userId, mockUserId));
        expect(result).toEqual([mockConcept]);
      });

      it('should return only active concepts when activeOnly is true', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([mockConcept]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getUserConcepts(mockUserId, true);

        expect(mockSelect.where).toHaveBeenCalledWith(
          expect.objectContaining({
            // Should include both userId and isActive conditions
          })
        );
        expect(result).toEqual([mockConcept]);
      });
    });

    describe('getConceptById', () => {
      it('should return concept by ID', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockConcept]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getConceptById(mockConceptId);

        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.where).toHaveBeenCalledWith(eq(learningConcepts.id, mockConceptId));
        expect(result).toEqual(mockConcept);
      });

      it('should return null if concept not found', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getConceptById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('updateConcept', () => {
      it('should update concept successfully', async () => {
        const updates = {
          completionPercentage: 75,
          currentModule: 'Advanced Topics',
        };

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockDb.update.mockReturnValue(mockUpdate);

        const result = await LearningConceptService.updateConcept(mockConceptId, updates);

        expect(mockDb.update).toHaveBeenCalledWith(learningConcepts);
        expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining(updates));
        expect(mockUpdate.where).toHaveBeenCalledWith(eq(learningConcepts.id, mockConceptId));
        expect(result).toBe(true);
      });
    });

    describe('deleteConcept', () => {
      it('should delete concept successfully', async () => {
        const mockDelete = {
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockDb.delete.mockReturnValue(mockDelete);

        const result = await LearningConceptService.deleteConcept(mockConceptId);

        expect(mockDb.delete).toHaveBeenCalledWith(learningConcepts);
        expect(mockDelete.where).toHaveBeenCalledWith(eq(learningConcepts.id, mockConceptId));
        expect(result).toBe(true);
      });
    });
  });

  describe('Progress Tracking', () => {
    describe('updateProgress', () => {
      it('should update concept progress successfully', async () => {
        const progressData = {
          completionPercentage: 60,
          currentModule: 'Objects and Arrays',
          timeSpent: 2.5,
        };

        // Mock getConceptById
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockConcept]),
        };

        // Mock update
        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockDb.select.mockReturnValue(mockSelect);
        mockDb.update.mockReturnValue(mockUpdate);

        const result = await LearningConceptService.updateProgress(mockConceptId, progressData);

        expect(result).toBe(true);
        expect(mockUpdate.set).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 60,
            currentModule: 'Objects and Arrays',
            timeSpent: 11, // 8.5 + 2.5
            lastStudied: expect.any(String),
          })
        );
      });

      it('should handle concept not found', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.updateProgress(mockConceptId, {
          completionPercentage: 60,
        });

        expect(result).toBe(false);
      });
    });

    describe('getConceptProgress', () => {
      it('should return concept progress', async () => {
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockConcept]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getConceptProgress(mockConceptId);

        expect(result).toEqual({
          completionPercentage: 45,
          currentModule: 'Functions',
          timeSpent: 8.5,
          lastStudied: new Date('2024-01-15T10:00:00Z'),
          milestones: [],
        });
      });
    });
  });

  describe('Prerequisite Validation', () => {
    describe('validatePrerequisites', () => {
      it('should validate prerequisites successfully', async () => {
        const conceptWithPrereqs = {
          ...mockConcept,
          prerequisites: JSON.stringify(['prereq-1', 'prereq-2']),
        };

        const userConcepts = [
          { ...mockConcept, id: 'prereq-1', completionPercentage: 90 },
          { ...mockConcept, id: 'prereq-2', completionPercentage: 85 },
        ];

        // Mock getConceptById
        const mockSelectConcept = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([conceptWithPrereqs]),
        };

        // Mock getUserConcepts
        const mockSelectUserConcepts = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
        };

        mockDb.select
          .mockReturnValueOnce(mockSelectConcept)
          .mockReturnValueOnce(mockSelectUserConcepts);

        const result = await LearningConceptService.validatePrerequisites(mockUserId, mockConceptId);

        expect(result).toEqual({
          isValid: true,
          missingPrerequisites: [],
          completedPrerequisites: ['prereq-1', 'prereq-2'],
        });
      });

      it('should identify missing prerequisites', async () => {
        const conceptWithPrereqs = {
          ...mockConcept,
          prerequisites: JSON.stringify(['prereq-1', 'prereq-2']),
        };

        const userConcepts = [
          { ...mockConcept, id: 'prereq-1', completionPercentage: 90 },
          // prereq-2 is missing or incomplete
        ];

        const mockSelectConcept = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([conceptWithPrereqs]),
        };

        const mockSelectUserConcepts = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
        };

        mockDb.select
          .mockReturnValueOnce(mockSelectConcept)
          .mockReturnValueOnce(mockSelectUserConcepts);

        const result = await LearningConceptService.validatePrerequisites(mockUserId, mockConceptId);

        expect(result).toEqual({
          isValid: false,
          missingPrerequisites: ['prereq-2'],
          completedPrerequisites: ['prereq-1'],
        });
      });
    });
  });

  describe('Cross-Concept Learning Integration', () => {
    describe('findInterdisciplinaryConnections', () => {
      it('should find connections between concepts', async () => {
        const userConcepts = [
          {
            ...mockConcept,
            id: 'concept-1',
            name: 'JavaScript Programming',
            description: 'Learn JavaScript programming fundamentals',
            category: 'programming',
          },
          {
            ...mockConcept,
            id: 'concept-2',
            name: 'Web Development',
            description: 'Build web applications with JavaScript',
            category: 'programming',
          },
          {
            ...mockConcept,
            id: 'concept-3',
            name: 'Data Structures',
            description: 'Learn algorithms and data structures',
            category: 'computer-science',
          },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.findInterdisciplinaryConnections(mockUserId);

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        
        // Should find same category connection
        const sameCategoryConnection = result.find(
          insight => insight.connectionType === 'same_category'
        );
        expect(sameCategoryConnection).toBeDefined();
      });
    });

    describe('updateCrossConceptKnowledge', () => {
      it('should update related concepts with cross-reference knowledge', async () => {
        const insights = [
          {
            primaryConceptId: mockConceptId,
            relatedConceptId: 'related-concept-123',
            connectionType: 'same_category',
            relevanceScore: 0.8,
            suggestedIntegration: 'Consider combining exercises',
          },
        ];

        const relatedConcept = {
          ...mockConcept,
          id: 'related-concept-123',
          customPrompts: JSON.stringify([]),
        };

        // Mock findInterdisciplinaryConnections
        const mockSelectConnections = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([mockConcept, relatedConcept]),
        };

        // Mock getConceptById for related concept
        const mockSelectConcept = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([relatedConcept]),
        };

        // Mock update
        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockDb.select
          .mockReturnValueOnce(mockSelectConnections)
          .mockReturnValueOnce(mockSelectConcept);
        mockDb.update.mockReturnValue(mockUpdate);

        await LearningConceptService.updateCrossConceptKnowledge(
          mockUserId,
          mockConceptId,
          'New JavaScript pattern learned'
        );

        expect(mockUpdate.set).toHaveBeenCalledWith(
          expect.objectContaining({
            customPrompts: expect.stringContaining('Cross-reference'),
          })
        );
      });
    });
  });

  describe('User Analytics', () => {
    describe('getUserAnalytics', () => {
      it('should generate comprehensive user analytics', async () => {
        const userConcepts = [
          { ...mockConcept, id: 'concept-1', completionPercentage: 90, timeSpent: 10, isActive: true },
          { ...mockConcept, id: 'concept-2', completionPercentage: 60, timeSpent: 8, isActive: true },
          { ...mockConcept, id: 'concept-3', completionPercentage: 100, timeSpent: 15, isActive: false },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getUserAnalytics(mockUserId);

        expect(result).toEqual({
          userId: mockUserId,
          totalConcepts: 3,
          activeConcepts: 2,
          completedConcepts: 1,
          averageProgress: 83.33,
          totalTimeSpent: 33,
          conceptsWithMilestones: 0,
          learningVelocity: 2.53,
          strongestConcepts: expect.arrayContaining(['concept-1', 'concept-2']),
          strugglingConcepts: expect.arrayContaining(['concept-1', 'concept-2']),
          interdisciplinaryConnections: expect.any(Number),
        });
      });
    });

    describe('detectMilestoneAchievements', () => {
      it('should detect milestone achievements based on progress', async () => {
        const userConcepts = [
          { ...mockConcept, id: 'concept-1', completionPercentage: 30 },
          { ...mockConcept, id: 'concept-2', completionPercentage: 75 },
          { ...mockConcept, id: 'concept-3', completionPercentage: 100 },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.detectMilestoneAchievements(mockUserId);

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(3);

        // Check concept-1 (30% progress) - should have 1 milestone
        const concept1Achievements = result.find(a => a.conceptId === 'concept-1');
        expect(concept1Achievements?.milestones).toHaveLength(1);
        expect(concept1Achievements?.milestones[0].name).toBe('Getting Started');

        // Check concept-2 (75% progress) - should have 3 milestones
        const concept2Achievements = result.find(a => a.conceptId === 'concept-2');
        expect(concept2Achievements?.milestones).toHaveLength(3);

        // Check concept-3 (100% progress) - should have 4 milestones
        const concept3Achievements = result.find(a => a.conceptId === 'concept-3');
        expect(concept3Achievements?.milestones).toHaveLength(4);
        expect(concept3Achievements?.milestones[3].name).toBe('Mastery Achieved');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getConceptsByCategory', () => {
      it('should return concepts filtered by category', async () => {
        const programmingConcepts = [
          { ...mockConcept, id: 'concept-1', category: 'programming' },
          { ...mockConcept, id: 'concept-2', category: 'programming' },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(programmingConcepts),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getConceptsByCategory(mockUserId, 'programming');

        expect(result).toEqual(programmingConcepts);
        expect(mockSelect.where).toHaveBeenCalledWith(
          expect.objectContaining({
            // Should include both userId and category conditions
          })
        );
      });
    });

    describe('getLearningRecommendations', () => {
      it('should generate learning recommendations', async () => {
        const userConcepts = [
          { ...mockConcept, id: 'concept-1', completionPercentage: 85 },
          { ...mockConcept, id: 'concept-2', completionPercentage: 40 },
        ];

        // Mock multiple database calls
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(userConcepts),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await LearningConceptService.getLearningRecommendations(mockUserId);

        expect(result).toEqual({
          nextConcepts: expect.any(Array),
          reviewConcepts: expect.any(Array),
          interdisciplinaryOpportunities: expect.any(Array),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in createConcept', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.insert.mockReturnValue(mockInsert);

      await expect(LearningConceptService.createConcept({
        userId: mockUserId,
        name: 'Test Concept',
        description: 'Test',
        category: 'test',
        difficulty: 'beginner',
        estimatedHours: 10,
        prerequisites: null,
        learningObjectives: null,
        customPrompts: null,
        isActive: true,
      })).rejects.toThrow('Failed to create learning concept');
    });

    it('should handle database errors gracefully in getUserConcepts', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.select.mockReturnValue(mockSelect);

      const result = await LearningConceptService.getUserConcepts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully in getUserAnalytics', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.select.mockReturnValue(mockSelect);

      const result = await LearningConceptService.getUserAnalytics(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        totalConcepts: 0,
        activeConcepts: 0,
        completedConcepts: 0,
        averageProgress: 0,
        totalTimeSpent: 0,
        conceptsWithMilestones: 0,
        learningVelocity: 0,
        strongestConcepts: [],
        strugglingConcepts: [],
        interdisciplinaryConnections: 0,
      });
    });
  });
});
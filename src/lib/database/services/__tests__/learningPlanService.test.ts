/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LearningPlanService } from '../learningPlanService';
import { db } from '../../config';
import { users, learningConcepts, learningPlans, userProgress } from '../../schema';
import { eq } from 'drizzle-orm';

// Mock AI provider router
vi.mock('../../../ai/services/AIProviderRouter', () => ({
  aiProviderRouter: {
    route: vi.fn().mockImplementation((request) => {
      // Check if this is an adaptation request
      if (request.messages[0].content.includes('adaptive learning plan optimizer')) {
        return Promise.resolve({
          response: {
            content: JSON.stringify({
              concepts: [
                {
                  conceptId: 'test-concept-id',
                  name: 'JavaScript Fundamentals',
                  estimatedDuration: 5, // Adapted duration
                  weeklyHours: 6, // Adapted hours
                  milestones: [
                    {
                      id: 'milestone-1',
                      title: 'Variables and Data Types',
                      description: 'Learn basic JavaScript syntax',
                      targetWeek: 1,
                      estimatedHours: 6,
                      prerequisites: [],
                      assessmentCriteria: ['Understanding variables', 'Data type knowledge']
                    }
                  ],
                  dependencies: [],
                  customization: {
                    difficultyLevel: 'intermediate',
                    focusAreas: ['syntax', 'fundamentals'],
                    learningStyle: 'hands-on',
                    pacePreference: 'normal'
                  }
                }
              ],
              schedule: {
                totalWeeks: 12,
                hoursPerWeek: 15, // Updated hours per week
                preferredDays: ['monday', 'wednesday', 'friday'],
                preferredTimes: ['evening'],
                breakWeeks: [],
                intensiveWeeks: []
              },
              adaptiveSettings: {
                difficultyAdjustment: true,
                scheduleFlexibility: true,
                progressBasedPacing: true,
                crossConceptIntegration: true,
                milestoneTracking: true,
                performanceThresholds: {
                  strugglingThreshold: 70,
                  excellingThreshold: 85
                }
              }
            })
          }
        });
      }
      
      // Default plan generation response
      return Promise.resolve({
        response: {
          content: JSON.stringify({
            name: 'Test Learning Plan',
            description: 'AI-generated test plan',
            concepts: [
              {
                conceptId: 'test-concept-id',
                name: 'JavaScript Fundamentals',
                estimatedDuration: 4,
                weeklyHours: 5,
                milestones: [
                  {
                    id: 'milestone-1',
                    title: 'Variables and Data Types',
                    description: 'Learn basic JavaScript syntax',
                    targetWeek: 1,
                    estimatedHours: 5,
                    prerequisites: [],
                    assessmentCriteria: ['Understanding variables', 'Data type knowledge']
                  }
                ],
                dependencies: [],
                customization: {
                  difficultyLevel: 'intermediate',
                  focusAreas: ['syntax', 'fundamentals'],
                  learningStyle: 'hands-on',
                  pacePreference: 'normal'
                }
              }
            ],
            schedule: {
              totalWeeks: 12,
              hoursPerWeek: 5,
              preferredDays: ['monday', 'wednesday', 'friday'],
              preferredTimes: ['evening'],
              breakWeeks: [],
              intensiveWeeks: []
            },
            adaptiveSettings: {
              difficultyAdjustment: true,
              scheduleFlexibility: true,
              progressBasedPacing: true,
              crossConceptIntegration: true,
              milestoneTracking: true,
              performanceThresholds: {
                strugglingThreshold: 70,
                excellingThreshold: 85
              }
            }
          })
        }
      });
    })
  }
}));

describe('LearningPlanService', () => {
  const testUserId = 'test-user-id';
  const testConceptId = 'test-concept-id';
  let testPlanId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'Test User',
      role: 'Software Engineer',
      experienceLevel: 'intermediate',
      hoursPerWeek: 10,
      learningStyle: 'hands-on',
      onboardingCompleted: true,
    });

    // Create test concept
    await db.insert(learningConcepts).values({
      id: testConceptId,
      userId: testUserId,
      name: 'JavaScript Fundamentals',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 40,
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('generateLearningPlan', () => {
    it('should generate a learning plan successfully', async () => {
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
          totalWeeks: 12,
          difficultyLevel: 'intermediate' as const,
          learningStyle: 'hands-on' as const,
          focusAreas: ['fundamentals'],
          availableDays: ['monday', 'wednesday', 'friday'],
          preferredTimes: ['evening'],
        },
      };

      const result = await LearningPlanService.generateLearningPlan(request);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.name).toBe('Test Learning Plan');
      expect(result.isActive).toBe(true);
      
      const concepts = JSON.parse(result.concepts);
      expect(concepts).toHaveLength(1);
      expect(concepts[0].conceptId).toBe(testConceptId);
      expect(concepts[0].name).toBe('JavaScript Fundamentals');

      testPlanId = result.id;
    });

    it('should handle missing user', async () => {
      const request = {
        userId: 'non-existent-user',
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      await expect(LearningPlanService.generateLearningPlan(request))
        .rejects.toThrow('User not found');
    });

    it('should handle empty concept list', async () => {
      const request = {
        userId: testUserId,
        conceptIds: [],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      await expect(LearningPlanService.generateLearningPlan(request))
        .rejects.toThrow('No valid concepts selected');
    });

    it('should use fallback when AI generation fails', async () => {
      // Mock AI failure
      const { aiProviderRouter } = await import('../../../ai/services/AIProviderRouter');
      vi.mocked(aiProviderRouter.route).mockRejectedValueOnce(new Error('AI service unavailable'));

      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
          totalWeeks: 8,
        },
      };

      const result = await LearningPlanService.generateLearningPlan(request);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      
      // Should use template-based plan
      const concepts = JSON.parse(result.concepts);
      expect(concepts).toHaveLength(1);
      expect(concepts[0].conceptId).toBe(testConceptId);
    });
  });

  describe('getUserLearningPlans', () => {
    it('should return user learning plans', async () => {
      // Create a test plan first
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      await LearningPlanService.generateLearningPlan(request);

      const plans = await LearningPlanService.getUserLearningPlans(testUserId);

      expect(plans).toHaveLength(1);
      expect(plans[0].userId).toBe(testUserId);
      expect(plans[0].isActive).toBe(true);
    });

    it('should return empty array for user with no plans', async () => {
      const plans = await LearningPlanService.getUserLearningPlans('non-existent-user');
      expect(plans).toHaveLength(0);
    });
  });

  describe('getLearningPlanById', () => {
    beforeEach(async () => {
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      const plan = await LearningPlanService.generateLearningPlan(request);
      testPlanId = plan.id;
    });

    it('should return learning plan with parsed data', async () => {
      const result = await LearningPlanService.getLearningPlanById(testPlanId, testUserId);

      expect(result).toBeDefined();
      expect(result!.plan.id).toBe(testPlanId);
      expect(result!.concepts).toHaveLength(1);
      expect(result!.schedule).toBeDefined();
      expect(result!.adaptiveSettings).toBeDefined();
    });

    it('should return null for non-existent plan', async () => {
      const result = await LearningPlanService.getLearningPlanById('non-existent', testUserId);
      expect(result).toBeNull();
    });

    it('should return null for plan belonging to different user', async () => {
      const result = await LearningPlanService.getLearningPlanById(testPlanId, 'different-user');
      expect(result).toBeNull();
    });
  });

  describe('updatePlanSchedule', () => {
    beforeEach(async () => {
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      const plan = await LearningPlanService.generateLearningPlan(request);
      testPlanId = plan.id;
    });

    it('should update plan schedule successfully', async () => {
      const scheduleUpdates = {
        hoursPerWeek: 15,
        totalWeeks: 10,
        preferredDays: ['tuesday', 'thursday'],
      };

      const success = await LearningPlanService.updatePlanSchedule(
        testPlanId,
        testUserId,
        scheduleUpdates
      );

      expect(success).toBe(true);

      // Verify the update
      const result = await LearningPlanService.getLearningPlanById(testPlanId, testUserId);
      expect(result!.schedule.hoursPerWeek).toBe(15);
      expect(result!.schedule.totalWeeks).toBe(10);
      expect(result!.schedule.preferredDays).toEqual(['tuesday', 'thursday']);
    });

    it('should return false for non-existent plan', async () => {
      const success = await LearningPlanService.updatePlanSchedule(
        'non-existent',
        testUserId,
        { hoursPerWeek: 15 }
      );

      expect(success).toBe(false);
    });
  });

  describe('completeMilestone', () => {
    beforeEach(async () => {
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      const plan = await LearningPlanService.generateLearningPlan(request);
      testPlanId = plan.id;
    });

    it('should complete milestone successfully', async () => {
      const completionData = {
        score: 85,
        timeSpent: 5,
        notes: 'Completed successfully',
      };

      const success = await LearningPlanService.completeMilestone(
        testPlanId,
        testUserId,
        testConceptId,
        'milestone-1',
        completionData
      );

      expect(success).toBe(true);

      // Verify the completion
      const result = await LearningPlanService.getLearningPlanById(testPlanId, testUserId);
      const concept = result!.concepts.find(c => c.conceptId === testConceptId);
      const milestone = concept!.milestones.find(m => m.id === 'milestone-1');
      
      expect(milestone).toBeDefined();
      expect((milestone as any).completed).toBe(true);
      expect((milestone as any).score).toBe(85);
      expect((milestone as any).actualHours).toBe(5);
    });

    it('should return false for non-existent plan', async () => {
      const success = await LearningPlanService.completeMilestone(
        'non-existent',
        testUserId,
        testConceptId,
        'milestone-1',
        { timeSpent: 5 }
      );

      expect(success).toBe(false);
    });
  });

  describe('adaptLearningPlan', () => {
    beforeEach(async () => {
      const request = {
        userId: testUserId,
        conceptIds: [testConceptId],
        preferences: {
          hoursPerWeek: 10,
        },
      };

      const plan = await LearningPlanService.generateLearningPlan(request);
      testPlanId = plan.id;
    });

    it('should adapt learning plan based on performance', async () => {
      const context = {
        userId: testUserId,
        planId: testPlanId,
        progressData: [],
        performanceMetrics: {
          averageScore: 60, // Below struggling threshold
          timeSpentRatio: 1.5, // Taking longer than expected
          strugglingAreas: ['JavaScript Fundamentals'],
          excellingAreas: [],
        },
      };

      const adaptedPlan = await LearningPlanService.adaptLearningPlan(context);

      expect(adaptedPlan).toBeDefined();
      expect(adaptedPlan.id).toBe(testPlanId);
      
      // Should have adapted the plan (exact changes depend on AI response or fallback logic)
      const concepts = JSON.parse(adaptedPlan.concepts);
      expect(concepts).toHaveLength(1);
    });

    it('should handle schedule changes in adaptation', async () => {
      const context = {
        userId: testUserId,
        planId: testPlanId,
        progressData: [],
        performanceMetrics: {
          averageScore: 90, // Excelling
          timeSpentRatio: 0.8, // Faster than expected
          strugglingAreas: [],
          excellingAreas: ['JavaScript Fundamentals'],
        },
        scheduleChanges: {
          newHoursPerWeek: 15,
        },
      };

      const adaptedPlan = await LearningPlanService.adaptLearningPlan(context);

      expect(adaptedPlan).toBeDefined();
      
      const schedule = JSON.parse(adaptedPlan.schedule || '{}');
      expect(schedule.hoursPerWeek).toBe(15);
    });

    it('should handle non-existent plan', async () => {
      const context = {
        userId: testUserId,
        planId: 'non-existent',
        progressData: [],
        performanceMetrics: {
          averageScore: 75,
          timeSpentRatio: 1.0,
          strugglingAreas: [],
          excellingAreas: [],
        },
      };

      await expect(LearningPlanService.adaptLearningPlan(context))
        .rejects.toThrow('Learning plan not found');
    });
  });
});
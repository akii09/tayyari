/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OnboardingManager } from '../onboardingManager';
import { LearningConceptService } from '../learningConceptService';
import { db } from '../../config';
import { users, learningConcepts, learningPlans } from '../../schema';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('../learningConceptService');
vi.mock('../learningPlanService');
vi.mock('../../../ai/services/AIProviderRouter', () => ({
  aiProviderRouter: {
    route: vi.fn().mockResolvedValue({
      response: {
        content: JSON.stringify({
          recommendedConcepts: [
            {
              concept: { name: 'JavaScript Fundamentals', category: 'programming', difficulty: 'intermediate' },
              reason: 'Perfect for your experience level',
              priority: 1
            }
          ],
          suggestedSchedule: {
            totalWeeks: 12,
            hoursPerWeek: 10,
            studyPattern: 'Regular weekly sessions'
          },
          learningPathSuggestions: [
            'Start with fundamentals',
            'Practice with projects',
            'Build portfolio'
          ]
        })
      }
    })
  }
}));

describe('OnboardingManager', () => {
  const testUserId = 'test-user-id';
  let sessionId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    // Mock LearningConceptService methods
    vi.mocked(LearningConceptService.getAvailableConcepts).mockResolvedValue([
      {
        id: 'concept-1',
        userId: 'system',
        name: 'JavaScript Fundamentals',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
        isActive: true,
        completionPercentage: 0,
        timeSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: null,
        prerequisites: null,
        learningObjectives: null,
        customPrompts: null,
        currentModule: null,
        lastStudied: null,
      }
    ]);

    vi.mocked(LearningConceptService.createUserConcept).mockResolvedValue({
      id: 'user-concept-1',
      userId: testUserId,
      name: 'JavaScript Fundamentals',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 40,
      isActive: true,
      completionPercentage: 0,
      timeSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: null,
      prerequisites: null,
      learningObjectives: null,
      customPrompts: null,
      currentModule: null,
      lastStudied: null,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('startOnboarding', () => {
    it('should create a new onboarding session', async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);

      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.currentStep).toBe('profile');
      expect(session.canSkipConcepts).toBe(true);
      expect(session.id).toBeDefined();

      sessionId = session.id;
    });

    it('should include existing user data if user exists', async () => {
      // Create existing user
      await db.insert(users).values({
        id: testUserId,
        name: 'Existing User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 8,
        onboardingCompleted: false,
      });

      const session = await OnboardingManager.startOnboarding(testUserId);

      expect(session.data.name).toBe('Existing User');
      expect(session.data.role).toBe('Developer');
      expect(session.data.experienceLevel).toBe('intermediate');
      expect(session.data.hoursPerWeek).toBe(8);
    });
  });

  describe('updateOnboardingStep', () => {
    beforeEach(async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      sessionId = session.id;
    });

    it('should update onboarding step and data', async () => {
      const stepData = {
        name: 'John Doe',
        role: 'Software Engineer',
        experienceLevel: 'intermediate' as const,
      };

      const updatedSession = await OnboardingManager.updateOnboardingStep(
        sessionId,
        'goals',
        stepData
      );

      expect(updatedSession.currentStep).toBe('goals');
      expect(updatedSession.data.name).toBe('John Doe');
      expect(updatedSession.data.role).toBe('Software Engineer');
      expect(updatedSession.data.experienceLevel).toBe('intermediate');
    });

    it('should reject invalid step progression', async () => {
      await expect(
        OnboardingManager.updateOnboardingStep(sessionId, 'completed', {})
      ).rejects.toThrow('Invalid step progression');
    });

    it('should handle non-existent session', async () => {
      await expect(
        OnboardingManager.updateOnboardingStep('non-existent', 'goals', {})
      ).rejects.toThrow('Onboarding session not found');
    });
  });

  describe('getOnboardingRecommendations', () => {
    beforeEach(async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      sessionId = session.id;

      // Add some profile data
      await OnboardingManager.updateOnboardingStep(sessionId, 'goals', {
        name: 'John Doe',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
      });
    });

    it('should return AI-powered recommendations', async () => {
      const recommendations = await OnboardingManager.getOnboardingRecommendations(sessionId);

      expect(recommendations).toBeDefined();
      expect(recommendations.recommendedConcepts).toHaveLength(1);
      expect(recommendations.recommendedConcepts[0].concept.name).toBe('JavaScript Fundamentals');
      expect(recommendations.suggestedSchedule).toBeDefined();
      expect(recommendations.learningPathSuggestions).toHaveLength(3);
    });

    it('should handle non-existent session', async () => {
      await expect(
        OnboardingManager.getOnboardingRecommendations('non-existent')
      ).rejects.toThrow('Onboarding session not found');
    });

    it('should use fallback when AI fails', async () => {
      // Mock AI failure
      const { aiProviderRouter } = await import('../../../ai/services/AIProviderRouter');
      vi.mocked(aiProviderRouter.route).mockRejectedValueOnce(new Error('AI service unavailable'));

      const recommendations = await OnboardingManager.getOnboardingRecommendations(sessionId);

      expect(recommendations).toBeDefined();
      expect(recommendations.recommendedConcepts).toBeDefined();
      expect(recommendations.suggestedSchedule).toBeDefined();
      expect(recommendations.learningPathSuggestions).toBeDefined();
    });
  });

  describe('completeOnboarding', () => {
    beforeEach(async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      sessionId = session.id;

      // Set up session with required data
      await OnboardingManager.updateOnboardingStep(sessionId, 'preferences', {
        name: 'John Doe',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
      });
    });

    it('should complete onboarding without concepts', async () => {
      const finalData = {
        skipConceptSelection: true,
      };

      const result = await OnboardingManager.completeOnboarding(sessionId, finalData);

      expect(result.user).toBeDefined();
      expect(result.user.name).toBe('John Doe');
      expect(result.user.onboardingCompleted).toBe(true);
      expect(result.concepts).toHaveLength(0);
      expect(result.learningPlan).toBeNull();
    });

    it('should complete onboarding with concepts', async () => {
      const finalData = {
        selectedConcepts: ['JavaScript Fundamentals'],
        skipConceptSelection: false,
      };

      const result = await OnboardingManager.completeOnboarding(sessionId, finalData);

      expect(result.user).toBeDefined();
      expect(result.user.onboardingCompleted).toBe(true);
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts![0].name).toBe('JavaScript Fundamentals');
    });

    it('should handle missing required data', async () => {
      const session = await OnboardingManager.startOnboarding('new-user');
      
      await expect(
        OnboardingManager.completeOnboarding(session.id, {})
      ).rejects.toThrow('Missing required onboarding data');
    });

    it('should handle non-existent session', async () => {
      await expect(
        OnboardingManager.completeOnboarding('non-existent', {})
      ).rejects.toThrow('Onboarding session not found');
    });
  });

  describe('skipConceptSelection', () => {
    beforeEach(async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      sessionId = session.id;

      // Set up session with required data
      await OnboardingManager.updateOnboardingStep(sessionId, 'concepts', {
        name: 'John Doe',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
      });
    });

    it('should skip concept selection and complete onboarding', async () => {
      const user = await OnboardingManager.skipConceptSelection(sessionId);

      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.onboardingCompleted).toBe(true);
    });

    it('should handle non-existent session', async () => {
      await expect(
        OnboardingManager.skipConceptSelection('non-existent')
      ).rejects.toThrow('Onboarding session not found');
    });
  });

  describe('addConceptsPostOnboarding', () => {
    beforeEach(async () => {
      // Create completed user
      await db.insert(users).values({
        id: testUserId,
        name: 'John Doe',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
        onboardingCompleted: true,
      });
    });

    it('should add concepts after onboarding', async () => {
      const result = await OnboardingManager.addConceptsPostOnboarding(testUserId, {
        conceptIds: ['JavaScript Fundamentals'],
        generateNewPlan: false,
      });

      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].name).toBe('JavaScript Fundamentals');
      expect(result.learningPlan).toBeNull();
    });

    it('should generate learning plan when requested', async () => {
      // Mock learning plan service
      const { LearningPlanService } = await import('../learningPlanService');
      vi.mocked(LearningPlanService.generateLearningPlan).mockResolvedValue({
        id: 'plan-1',
        userId: testUserId,
        name: 'Generated Plan',
        description: 'Test plan',
        concepts: '[]',
        schedule: '{}',
        adaptiveSettings: '{}',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await OnboardingManager.addConceptsPostOnboarding(testUserId, {
        conceptIds: ['JavaScript Fundamentals'],
        generateNewPlan: true,
      });

      expect(result.concepts).toHaveLength(1);
      expect(result.learningPlan).toBeDefined();
      expect(result.learningPlan!.name).toBe('Generated Plan');
    });

    it('should handle non-existent user', async () => {
      await expect(
        OnboardingManager.addConceptsPostOnboarding('non-existent', {
          conceptIds: ['JavaScript Fundamentals'],
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('getOnboardingSession', () => {
    it('should return existing session', async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      
      const retrieved = OnboardingManager.getOnboardingSession(session.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(session.id);
      expect(retrieved!.userId).toBe(testUserId);
    });

    it('should return null for non-existent session', () => {
      const retrieved = OnboardingManager.getOnboardingSession('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired session', async () => {
      const session = await OnboardingManager.startOnboarding(testUserId);
      
      // Manually expire the session
      const expiredSession = OnboardingManager.getOnboardingSession(session.id);
      if (expiredSession) {
        expiredSession.expiresAt = new Date(Date.now() - 1000).toISOString();
      }
      
      const retrieved = OnboardingManager.getOnboardingSession(session.id);
      expect(retrieved).toBeNull();
    });
  });
});
/**
 * Enhanced Onboarding Manager
 * Handles flexible onboarding flow with concept selection and AI-powered plan generation
 */

import { db } from '../config';
import { users, learningConcepts, learningPlans } from '../schema';
import { eq, and } from 'drizzle-orm';
import { LearningPlanService, type PlanGenerationRequest } from './learningPlanService';
import { LearningConceptService } from './learningConceptService';
import { aiProviderRouter } from '../../ai/services/AIProviderRouter';
import type { User, NewUser, LearningConcept } from '../schema';

export interface OnboardingSession {
  id: string;
  userId: string;
  currentStep: OnboardingStep;
  data: Partial<OnboardingData>;
  canSkipConcepts: boolean;
  createdAt: string;
  expiresAt: string;
}

export type OnboardingStep = 
  | 'profile'
  | 'goals'
  | 'concepts'
  | 'preferences'
  | 'plan_generation'
  | 'completed';

export interface OnboardingData {
  // Profile Information
  name: string;
  role: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  currentCompany?: string;
  currentTitle?: string;
  yearsOfExperience?: number;

  // Learning Goals
  targetDate?: string;
  hoursPerWeek: number;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  targetCompanies?: string[];
  targetRoles?: string[];

  // Concept Selection (Optional)
  selectedConcepts?: string[];
  conceptCustomizations?: Record<string, ConceptCustomization>;
  skipConceptSelection?: boolean;

  // Learning Preferences
  difficultyPreference?: 'easy' | 'medium' | 'hard';
  learningStyle?: 'visual' | 'hands-on' | 'reading' | 'mixed';
  focusAreas?: string[];
  availableDays?: string[];
  preferredTimes?: string[];

  // Notifications and Settings
  notificationPreferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weeklyReports?: boolean;
    studyReminders?: boolean;
  };

  // Assessment Data
  currentSkills?: Record<string, number>;
  weakAreas?: string[];
  strongAreas?: string[];
}

export interface ConceptCustomization {
  priority: 'high' | 'medium' | 'low';
  difficultyOverride?: 'beginner' | 'intermediate' | 'advanced';
  focusAreas?: string[];
  timeAllocation?: number; // percentage of total time
}

export interface OnboardingRecommendations {
  recommendedConcepts: Array<{
    concept: LearningConcept;
    reason: string;
    priority: number;
  }>;
  suggestedSchedule: {
    totalWeeks: number;
    hoursPerWeek: number;
    studyPattern: string;
  };
  learningPathSuggestions: string[];
}

export class OnboardingManager {
  private static sessions = new Map<string, OnboardingSession>();

  /**
   * Start a new onboarding session
   */
  static async startOnboarding(userId: string): Promise<OnboardingSession> {
    // Check if user already exists and has completed onboarding
    const existingUser = await db.select().from(users)
      .where(eq(users.id, userId))
      .get();

    const session: OnboardingSession = {
      id: crypto.randomUUID(),
      userId,
      currentStep: 'profile',
      data: existingUser ? {
        name: existingUser.name,
        role: existingUser.role,
        experienceLevel: existingUser.experienceLevel as any,
        hoursPerWeek: existingUser.hoursPerWeek,
      } : {},
      canSkipConcepts: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Update onboarding session data
   */
  static async updateOnboardingStep(
    sessionId: string,
    step: OnboardingStep,
    data: Partial<OnboardingData>
  ): Promise<OnboardingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    // Validate step progression
    if (!this.isValidStepProgression(session.currentStep, step)) {
      throw new Error(`Invalid step progression from ${session.currentStep} to ${step}`);
    }

    // Update session
    session.currentStep = step;
    session.data = { ...session.data, ...data };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get AI-powered recommendations for concepts and learning path
   */
  static async getOnboardingRecommendations(
    sessionId: string
  ): Promise<OnboardingRecommendations> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    const { data } = session;
    
    // Get available concepts
    const availableConcepts = await LearningConceptService.getAvailableConcepts();

    // Generate AI recommendations
    const recommendations = await this.generateAIRecommendations(data, availableConcepts);

    return recommendations;
  }

  /**
   * Complete onboarding with or without concept selection
   */
  static async completeOnboarding(
    sessionId: string,
    finalData?: Partial<OnboardingData>
  ): Promise<{
    user: User;
    concepts?: LearningConcept[];
    learningPlan?: any;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    const completeData = { ...session.data, ...finalData };

    // Validate required data
    if (!completeData.name || !completeData.role || !completeData.experienceLevel || !completeData.hoursPerWeek) {
      throw new Error('Missing required onboarding data');
    }

    try {
      // Create or update user
      const user = await this.createOrUpdateUser(session.userId, completeData);

      let concepts: LearningConcept[] = [];
      let learningPlan: any = null;

      // Handle concept selection if not skipped
      if (!completeData.skipConceptSelection && completeData.selectedConcepts?.length) {
        // Create selected concepts for user
        concepts = await this.createUserConcepts(session.userId, completeData);

        // Generate learning plan if concepts were selected
        if (concepts.length > 0) {
          const planRequest: PlanGenerationRequest = {
            userId: session.userId,
            conceptIds: concepts.map(c => c.id),
            preferences: {
              totalWeeks: this.calculateTotalWeeks(completeData.targetDate),
              hoursPerWeek: completeData.hoursPerWeek,
              difficultyLevel: completeData.difficultyPreference as any,
              learningStyle: completeData.learningStyle,
              focusAreas: completeData.focusAreas,
              availableDays: completeData.availableDays,
              preferredTimes: completeData.preferredTimes,
            },
          };

          learningPlan = await LearningPlanService.generateLearningPlan(planRequest);
        }
      }

      // Clean up session
      this.sessions.delete(sessionId);

      return { user, concepts, learningPlan };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Allow users to add concepts after onboarding
   */
  static async addConceptsPostOnboarding(
    userId: string,
    conceptData: {
      conceptIds: string[];
      customizations?: Record<string, ConceptCustomization>;
      generateNewPlan?: boolean;
    }
  ): Promise<{
    concepts: LearningConcept[];
    learningPlan?: any;
  }> {
    try {
      // Verify user exists
      const user = await db.select().from(users)
        .where(eq(users.id, userId))
        .get();

      if (!user) {
        throw new Error('User not found');
      }

      // Create concepts for user
      const concepts: LearningConcept[] = [];
      
      for (const conceptId of conceptData.conceptIds) {
        const concept = await LearningConceptService.createUserConcept(userId, {
          name: conceptId, // This would be resolved from a concept template
          category: 'general',
          difficulty: 'intermediate',
          isActive: true,
        });
        
        if (concept) {
          concepts.push(concept);
        }
      }

      let learningPlan = null;

      // Generate new learning plan if requested
      if (conceptData.generateNewPlan && concepts.length > 0) {
        const planRequest: PlanGenerationRequest = {
          userId,
          conceptIds: concepts.map(c => c.id),
          preferences: {
            hoursPerWeek: user.hoursPerWeek,
            difficultyLevel: user.experienceLevel as any,
            learningStyle: user.learningStyle as any,
          },
        };

        learningPlan = await LearningPlanService.generateLearningPlan(planRequest);
      }

      return { concepts, learningPlan };
    } catch (error) {
      console.error('Error adding concepts post-onboarding:', error);
      throw error;
    }
  }

  /**
   * Get onboarding session by ID
   */
  static getOnboardingSession(sessionId: string): OnboardingSession | null {
    const session = this.sessions.get(sessionId);
    
    // Check if session has expired
    if (session && new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session || null;
  }

  /**
   * Skip concept selection and complete basic onboarding
   */
  static async skipConceptSelection(sessionId: string): Promise<User> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    // Mark concept selection as skipped
    session.data.skipConceptSelection = true;
    session.currentStep = 'completed';

    // Complete onboarding without concepts
    const result = await this.completeOnboarding(sessionId);
    return result.user;
  }

  /**
   * Generate AI-powered recommendations
   */
  private static async generateAIRecommendations(
    userData: Partial<OnboardingData>,
    availableConcepts: LearningConcept[]
  ): Promise<OnboardingRecommendations> {
    const systemPrompt = `You are an expert learning advisor. Based on the user's profile, recommend the most suitable learning concepts and create a personalized learning strategy.

User Profile:
- Role: ${userData.role || 'Not specified'}
- Experience Level: ${userData.experienceLevel || 'Not specified'}
- Available Hours per Week: ${userData.hoursPerWeek || 'Not specified'}
- Target Date: ${userData.targetDate || 'Not specified'}
- Learning Style: ${userData.learningStyle || 'Not specified'}
- Focus Areas: ${userData.focusAreas?.join(', ') || 'Not specified'}

Available Concepts: ${availableConcepts.map(c => `${c.name} (${c.category}, ${c.difficulty})`).join(', ')}

Provide recommendations for:
1. Top 3-5 most relevant concepts with reasons
2. Suggested study schedule and pattern
3. Learning path recommendations

Return as JSON matching the OnboardingRecommendations interface.`;

    const aiRequest = {
      userId: 'onboarding-system',
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: `Please analyze my profile and recommend the best learning concepts and strategy for my goals.`,
        },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    };

    try {
      const result = await aiProviderRouter.route(aiRequest);
      const recommendations = JSON.parse(result.response.content);
      
      // Validate and enhance recommendations
      return this.validateRecommendations(recommendations, availableConcepts);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      // Fallback to rule-based recommendations
      return this.generateRuleBasedRecommendations(userData, availableConcepts);
    }
  }

  /**
   * Create or update user with onboarding data
   */
  private static async createOrUpdateUser(
    userId: string,
    data: OnboardingData
  ): Promise<User> {
    const userData = {
      id: userId,
      name: data.name,
      role: data.role,
      experienceLevel: data.experienceLevel,
      yearsOfExperience: data.yearsOfExperience,
      currentCompany: data.currentCompany,
      currentTitle: data.currentTitle,
      targetDate: data.targetDate,
      hoursPerWeek: data.hoursPerWeek,
      preferredStudyTime: data.preferredStudyTime,
      targetCompanies: JSON.stringify(data.targetCompanies || []),
      targetRoles: JSON.stringify(data.targetRoles || []),
      currentSkills: JSON.stringify(data.currentSkills || {}),
      weakAreas: JSON.stringify(data.weakAreas || []),
      strongAreas: JSON.stringify(data.strongAreas || []),
      difficultyPreference: data.difficultyPreference,
      learningStyle: data.learningStyle,
      notificationPreferences: JSON.stringify(data.notificationPreferences || {}),
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    // Try to update existing user first
    const existingUser = await db.select().from(users)
      .where(eq(users.id, userId))
      .get();

    if (existingUser) {
      const [updatedUser] = await db.update(users)
        .set(userData)
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const newUser: NewUser = {
        ...userData,
        createdAt: new Date().toISOString(),
      };
      
      const [createdUser] = await db.insert(users)
        .values(newUser)
        .returning();
      return createdUser;
    }
  }

  /**
   * Create user concepts based on selections
   */
  private static async createUserConcepts(
    userId: string,
    data: OnboardingData
  ): Promise<LearningConcept[]> {
    if (!data.selectedConcepts?.length) {
      return [];
    }

    const concepts: LearningConcept[] = [];

    for (const conceptId of data.selectedConcepts) {
      const customization = data.conceptCustomizations?.[conceptId];
      
      // This would typically resolve concept templates from a predefined list
      const concept = await LearningConceptService.createUserConcept(userId, {
        name: conceptId,
        category: 'general', // Would be resolved from concept template
        difficulty: customization?.difficultyOverride || data.difficultyPreference || 'intermediate',
        isActive: true,
        customPrompts: JSON.stringify([]),
      });

      if (concept) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  /**
   * Calculate total weeks based on target date
   */
  private static calculateTotalWeeks(targetDate?: string): number {
    if (!targetDate) return 12; // Default 12 weeks

    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

    return Math.max(4, Math.min(52, diffWeeks)); // Between 4 and 52 weeks
  }

  /**
   * Validate step progression
   */
  private static isValidStepProgression(current: OnboardingStep, next: OnboardingStep): boolean {
    const stepOrder: OnboardingStep[] = [
      'profile',
      'goals',
      'concepts',
      'preferences',
      'plan_generation',
      'completed'
    ];

    const currentIndex = stepOrder.indexOf(current);
    const nextIndex = stepOrder.indexOf(next);

    // Allow moving forward or backward within reasonable bounds
    return nextIndex >= currentIndex - 1 && nextIndex <= currentIndex + 2;
  }

  /**
   * Validate AI recommendations
   */
  private static validateRecommendations(
    recommendations: any,
    availableConcepts: LearningConcept[]
  ): OnboardingRecommendations {
    return {
      recommendedConcepts: (recommendations.recommendedConcepts || [])
        .filter((rec: any) => 
          availableConcepts.some(c => c.name === rec.concept?.name)
        )
        .slice(0, 5),
      suggestedSchedule: recommendations.suggestedSchedule || {
        totalWeeks: 12,
        hoursPerWeek: 5,
        studyPattern: 'Regular weekly sessions',
      },
      learningPathSuggestions: recommendations.learningPathSuggestions || [
        'Start with fundamentals',
        'Practice regularly',
        'Build projects',
      ],
    };
  }

  /**
   * Generate rule-based recommendations as fallback
   */
  private static generateRuleBasedRecommendations(
    userData: Partial<OnboardingData>,
    availableConcepts: LearningConcept[]
  ): OnboardingRecommendations {
    // Simple rule-based logic
    const experienceLevel = userData.experienceLevel || 'intermediate';
    const hoursPerWeek = userData.hoursPerWeek || 5;

    const recommendedConcepts = availableConcepts
      .filter(c => c.difficulty === experienceLevel)
      .slice(0, 3)
      .map((concept, index) => ({
        concept,
        reason: `Matches your ${experienceLevel} experience level`,
        priority: index + 1,
      }));

    return {
      recommendedConcepts,
      suggestedSchedule: {
        totalWeeks: hoursPerWeek >= 10 ? 8 : 12,
        hoursPerWeek,
        studyPattern: hoursPerWeek >= 10 ? 'Intensive' : 'Regular',
      },
      learningPathSuggestions: [
        'Start with core concepts',
        'Practice with real examples',
        'Build practical projects',
        'Review and reinforce learning',
      ],
    };
  }
}
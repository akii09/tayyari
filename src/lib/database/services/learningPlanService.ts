/**
 * Learning Plan Service
 * Handles AI-powered learning plan generation, adaptation, and management
 */

import { db } from '../config';
import { learningPlans, learningConcepts, users, userProgress } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { aiProviderRouter } from '../../ai/services/AIProviderRouter';
import type { 
  LearningPlan, 
  NewLearningPlan, 
  LearningConcept, 
  User,
  UserProgress 
} from '../schema';

export interface PlannedConcept {
  conceptId: string;
  name: string;
  estimatedDuration: number; // in weeks
  weeklyHours: number;
  milestones: PlanMilestone[];
  dependencies: string[];
  customization: ConceptCustomization;
}

export interface PlanMilestone {
  id: string;
  title: string;
  description: string;
  targetWeek: number;
  estimatedHours: number;
  prerequisites: string[];
  assessmentCriteria: string[];
}

export interface ConceptCustomization {
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  focusAreas: string[];
  learningStyle: 'visual' | 'hands-on' | 'reading' | 'mixed';
  pacePreference: 'slow' | 'normal' | 'fast';
}

export interface StudySchedule {
  totalWeeks: number;
  hoursPerWeek: number;
  preferredDays: string[];
  preferredTimes: string[];
  breakWeeks: number[];
  intensiveWeeks: number[];
}

export interface AdaptiveSettings {
  difficultyAdjustment: boolean;
  scheduleFlexibility: boolean;
  progressBasedPacing: boolean;
  crossConceptIntegration: boolean;
  milestoneTracking: boolean;
  performanceThresholds: {
    strugglingThreshold: number; // percentage below which to provide extra help
    excellingThreshold: number; // percentage above which to accelerate
  };
}

export interface LearningPlanData {
  name: string;
  description: string;
  concepts: PlannedConcept[];
  schedule: StudySchedule;
  adaptiveSettings: AdaptiveSettings;
}

export interface PlanGenerationRequest {
  userId: string;
  conceptIds: string[];
  preferences: {
    totalWeeks?: number;
    hoursPerWeek: number;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    learningStyle?: 'visual' | 'hands-on' | 'reading' | 'mixed';
    focusAreas?: string[];
    availableDays?: string[];
    preferredTimes?: string[];
  };
  customization?: {
    skipBasics?: boolean;
    emphasizeAreas?: string[];
    deemphasizeAreas?: string[];
  };
}

export interface PlanAdaptationContext {
  userId: string;
  planId: string;
  progressData: UserProgress[];
  performanceMetrics: {
    averageScore: number;
    timeSpentRatio: number; // actual vs planned
    strugglingAreas: string[];
    excellingAreas: string[];
  };
  scheduleChanges?: {
    newHoursPerWeek?: number;
    unavailableDates?: string[];
    intensivePeriods?: { start: string; end: string }[];
  };
}

export class LearningPlanService {
  /**
   * Generate an AI-powered learning plan
   */
  static async generateLearningPlan(request: PlanGenerationRequest): Promise<LearningPlan> {
    try {
      // Get user profile and selected concepts
      const [user, concepts] = await Promise.all([
        db.select().from(users).where(eq(users.id, request.userId)).get(),
        db.select().from(learningConcepts)
          .where(and(
            eq(learningConcepts.userId, request.userId),
            eq(learningConcepts.isActive, true)
          ))
          .all()
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Filter concepts based on request
      const selectedConcepts = concepts.filter(c => 
        request.conceptIds.includes(c.id)
      );

      if (selectedConcepts.length === 0) {
        throw new Error('No valid concepts selected');
      }

      // Generate AI-powered plan
      const planData = await this.generateAIPlan(user, selectedConcepts, request);

      // Create learning plan record
      const newPlan: NewLearningPlan = {
        userId: request.userId,
        name: planData.name,
        description: planData.description,
        concepts: JSON.stringify(planData.concepts),
        schedule: JSON.stringify(planData.schedule),
        adaptiveSettings: JSON.stringify(planData.adaptiveSettings),
        isActive: true,
      };

      const [createdPlan] = await db.insert(learningPlans)
        .values(newPlan)
        .returning();

      return createdPlan;
    } catch (error) {
      console.error('Error generating learning plan:', error);
      throw error;
    }
  }

  /**
   * Adapt an existing learning plan based on progress and performance
   */
  static async adaptLearningPlan(context: PlanAdaptationContext): Promise<LearningPlan> {
    try {
      // Get current plan
      const currentPlan = await db.select().from(learningPlans)
        .where(and(
          eq(learningPlans.id, context.planId),
          eq(learningPlans.userId, context.userId)
        ))
        .get();

      if (!currentPlan) {
        throw new Error('Learning plan not found');
      }

      // Parse current plan data
      const concepts: PlannedConcept[] = JSON.parse(currentPlan.concepts);
      const schedule: StudySchedule = JSON.parse(currentPlan.schedule || '{}');
      const adaptiveSettings: AdaptiveSettings = JSON.parse(currentPlan.adaptiveSettings || '{}');

      // Generate adaptation recommendations using AI
      const adaptedPlan = await this.generatePlanAdaptation(
        currentPlan,
        concepts,
        schedule,
        adaptiveSettings,
        context
      );

      // Update the plan
      const [updatedPlan] = await db.update(learningPlans)
        .set({
          concepts: JSON.stringify(adaptedPlan.concepts),
          schedule: JSON.stringify(adaptedPlan.schedule),
          adaptiveSettings: JSON.stringify(adaptedPlan.adaptiveSettings),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(learningPlans.id, context.planId))
        .returning();

      return updatedPlan;
    } catch (error) {
      console.error('Error adapting learning plan:', error);
      throw error;
    }
  }

  /**
   * Get user's active learning plans
   */
  static async getUserLearningPlans(userId: string): Promise<LearningPlan[]> {
    return db.select().from(learningPlans)
      .where(and(
        eq(learningPlans.userId, userId),
        eq(learningPlans.isActive, true)
      ))
      .orderBy(desc(learningPlans.createdAt))
      .all();
  }

  /**
   * Get a specific learning plan with parsed data
   */
  static async getLearningPlanById(planId: string, userId: string): Promise<{
    plan: LearningPlan;
    concepts: PlannedConcept[];
    schedule: StudySchedule;
    adaptiveSettings: AdaptiveSettings;
  } | null> {
    const plan = await db.select().from(learningPlans)
      .where(and(
        eq(learningPlans.id, planId),
        eq(learningPlans.userId, userId)
      ))
      .get();

    if (!plan) return null;

    return {
      plan,
      concepts: JSON.parse(plan.concepts),
      schedule: JSON.parse(plan.schedule || '{}'),
      adaptiveSettings: JSON.parse(plan.adaptiveSettings || '{}'),
    };
  }

  /**
   * Update learning plan schedule
   */
  static async updatePlanSchedule(
    planId: string, 
    userId: string, 
    scheduleUpdates: Partial<StudySchedule>
  ): Promise<boolean> {
    try {
      const plan = await this.getLearningPlanById(planId, userId);
      if (!plan) return false;

      const updatedSchedule = { ...plan.schedule, ...scheduleUpdates };

      await db.update(learningPlans)
        .set({
          schedule: JSON.stringify(updatedSchedule),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(learningPlans.id, planId));

      return true;
    } catch (error) {
      console.error('Error updating plan schedule:', error);
      return false;
    }
  }

  /**
   * Track milestone completion
   */
  static async completeMilestone(
    planId: string,
    userId: string,
    conceptId: string,
    milestoneId: string,
    completionData: {
      score?: number;
      timeSpent: number;
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      const planData = await this.getLearningPlanById(planId, userId);
      if (!planData) return false;

      // Update milestone completion in concepts
      const updatedConcepts = planData.concepts.map(concept => {
        if (concept.conceptId === conceptId) {
          const updatedMilestones = concept.milestones.map(milestone => {
            if (milestone.id === milestoneId) {
              return {
                ...milestone,
                completed: true,
                completionDate: new Date().toISOString(),
                score: completionData.score,
                actualHours: completionData.timeSpent,
                notes: completionData.notes,
              };
            }
            return milestone;
          });
          return { ...concept, milestones: updatedMilestones };
        }
        return concept;
      });

      await db.update(learningPlans)
        .set({
          concepts: JSON.stringify(updatedConcepts),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(learningPlans.id, planId));

      return true;
    } catch (error) {
      console.error('Error completing milestone:', error);
      return false;
    }
  }

  /**
   * Generate AI-powered learning plan
   */
  private static async generateAIPlan(
    user: User,
    concepts: LearningConcept[],
    request: PlanGenerationRequest
  ): Promise<LearningPlanData> {
    const systemPrompt = `You are an expert learning plan generator. Create a comprehensive, personalized learning plan based on the user's profile and selected concepts.

User Profile:
- Experience Level: ${user.experienceLevel}
- Learning Style: ${user.learningStyle || 'mixed'}
- Available Hours per Week: ${request.preferences.hoursPerWeek}
- Target Duration: ${request.preferences.totalWeeks || 12} weeks

Selected Concepts: ${concepts.map(c => `${c.name} (${c.category}, ${c.difficulty})`).join(', ')}

Generate a detailed learning plan with:
1. Optimized concept sequencing considering prerequisites
2. Weekly milestones with specific learning objectives
3. Adaptive difficulty progression
4. Cross-concept integration opportunities
5. Realistic time allocation based on user availability

Return a JSON object with the structure matching the LearningPlanData interface.`;

    const aiRequest = {
      userId: request.userId,
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: `Please generate a learning plan for the concepts: ${concepts.map(c => c.name).join(', ')}. 
          
          User preferences:
          - Difficulty Level: ${request.preferences.difficultyLevel || user.experienceLevel}
          - Learning Style: ${request.preferences.learningStyle || user.learningStyle}
          - Focus Areas: ${request.preferences.focusAreas?.join(', ') || 'General'}
          - Available Days: ${request.preferences.availableDays?.join(', ') || 'Flexible'}
          
          ${request.customization ? `
          Customization:
          - Skip Basics: ${request.customization.skipBasics}
          - Emphasize: ${request.customization.emphasizeAreas?.join(', ')}
          - De-emphasize: ${request.customization.deemphasizeAreas?.join(', ')}
          ` : ''}`,
        },
      ],
      maxTokens: 2000,
      temperature: 0.7,
    };

    try {
      const result = await aiProviderRouter.route(aiRequest);
      const planData = JSON.parse(result.response.content);
      
      // Validate and enhance the generated plan
      return this.validateAndEnhancePlan(planData, concepts, request);
    } catch (error) {
      console.error('Error generating AI plan:', error);
      // Fallback to template-based plan
      return this.generateTemplatePlan(concepts, request);
    }
  }

  /**
   * Generate plan adaptation using AI
   */
  private static async generatePlanAdaptation(
    currentPlan: LearningPlan,
    concepts: PlannedConcept[],
    schedule: StudySchedule,
    adaptiveSettings: AdaptiveSettings,
    context: PlanAdaptationContext
  ): Promise<{
    concepts: PlannedConcept[];
    schedule: StudySchedule;
    adaptiveSettings: AdaptiveSettings;
  }> {
    const systemPrompt = `You are an adaptive learning plan optimizer. Analyze the user's progress and performance to recommend plan adjustments.

Current Performance:
- Average Score: ${context.performanceMetrics.averageScore}%
- Time Efficiency: ${context.performanceMetrics.timeSpentRatio}x planned time
- Struggling Areas: ${context.performanceMetrics.strugglingAreas.join(', ')}
- Excelling Areas: ${context.performanceMetrics.excellingAreas.join(', ')}

Adaptation Guidelines:
- If struggling (score < ${adaptiveSettings.performanceThresholds?.strugglingThreshold || 70}%): Add reinforcement, slow pace
- If excelling (score > ${adaptiveSettings.performanceThresholds?.excellingThreshold || 85}%): Accelerate, add advanced topics
- Adjust time allocation based on actual vs planned time spent
- Maintain motivation through achievable milestones

Return adapted plan structure with explanations for changes.`;

    const aiRequest = {
      userId: context.userId,
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: `Current plan: ${JSON.stringify({ concepts, schedule }, null, 2)}
          
          Progress data: ${JSON.stringify(context.progressData, null, 2)}
          
          ${context.scheduleChanges ? `Schedule changes needed: ${JSON.stringify(context.scheduleChanges, null, 2)}` : ''}
          
          Please provide an adapted plan that addresses the performance patterns and any schedule constraints.`,
        },
      ],
      maxTokens: 2000,
      temperature: 0.3,
    };

    try {
      const result = await aiProviderRouter.route(aiRequest);
      const adaptedPlan = JSON.parse(result.response.content);
      
      return {
        concepts: adaptedPlan.concepts || concepts,
        schedule: adaptedPlan.schedule || schedule,
        adaptiveSettings: adaptedPlan.adaptiveSettings || adaptiveSettings,
      };
    } catch (error) {
      console.error('Error generating plan adaptation:', error);
      // Fallback to rule-based adaptation
      return this.generateRuleBasedAdaptation(concepts, schedule, adaptiveSettings, context);
    }
  }

  /**
   * Validate and enhance AI-generated plan
   */
  private static validateAndEnhancePlan(
    planData: any,
    concepts: LearningConcept[],
    request: PlanGenerationRequest
  ): LearningPlanData {
    // Ensure all required fields are present
    const enhancedPlan: LearningPlanData = {
      name: planData.name || `Learning Plan for ${concepts.map(c => c.name).join(', ')}`,
      description: planData.description || 'AI-generated personalized learning plan',
      concepts: planData.concepts || this.generateDefaultConcepts(concepts, request),
      schedule: planData.schedule || this.generateDefaultSchedule(request),
      adaptiveSettings: planData.adaptiveSettings || this.generateDefaultAdaptiveSettings(),
    };

    // Validate concept structure
    enhancedPlan.concepts = enhancedPlan.concepts.map(concept => ({
      ...concept,
      milestones: concept.milestones || this.generateDefaultMilestones(concept),
    }));

    return enhancedPlan;
  }

  /**
   * Generate template-based plan as fallback
   */
  private static generateTemplatePlan(
    concepts: LearningConcept[],
    request: PlanGenerationRequest
  ): LearningPlanData {
    const totalWeeks = request.preferences.totalWeeks || 12;
    const hoursPerWeek = request.preferences.hoursPerWeek;

    return {
      name: `Learning Plan for ${concepts.map(c => c.name).join(', ')}`,
      description: 'Template-based learning plan with adaptive features',
      concepts: this.generateDefaultConcepts(concepts, request),
      schedule: this.generateDefaultSchedule(request),
      adaptiveSettings: this.generateDefaultAdaptiveSettings(),
    };
  }

  /**
   * Generate default concept structure
   */
  private static generateDefaultConcepts(
    concepts: LearningConcept[],
    request: PlanGenerationRequest
  ): PlannedConcept[] {
    const totalWeeks = request.preferences.totalWeeks || 12;
    const weeksPerConcept = Math.ceil(totalWeeks / concepts.length);

    return concepts.map((concept, index) => ({
      conceptId: concept.id,
      name: concept.name,
      estimatedDuration: weeksPerConcept,
      weeklyHours: Math.ceil(request.preferences.hoursPerWeek / concepts.length),
      milestones: this.generateDefaultMilestones({
        conceptId: concept.id,
        name: concept.name,
        estimatedDuration: weeksPerConcept,
      }),
      dependencies: JSON.parse(concept.prerequisites || '[]'),
      customization: {
        difficultyLevel: request.preferences.difficultyLevel || concept.difficulty as any,
        focusAreas: request.preferences.focusAreas || [],
        learningStyle: request.preferences.learningStyle || 'mixed',
        pacePreference: 'normal',
      },
    }));
  }

  /**
   * Generate default milestones for a concept
   */
  private static generateDefaultMilestones(concept: { conceptId?: string; name: string; estimatedDuration: number }): PlanMilestone[] {
    const milestones: PlanMilestone[] = [];
    const weeksPerMilestone = Math.max(1, Math.floor(concept.estimatedDuration / 4));

    for (let i = 0; i < Math.min(4, concept.estimatedDuration); i++) {
      milestones.push({
        id: `${concept.conceptId || 'concept'}-milestone-${i + 1}`,
        title: `${concept.name} - Milestone ${i + 1}`,
        description: `Complete milestone ${i + 1} for ${concept.name}`,
        targetWeek: (i + 1) * weeksPerMilestone,
        estimatedHours: Math.ceil(concept.estimatedDuration * 2 / 4), // Rough estimate
        prerequisites: i > 0 ? [`${concept.conceptId || 'concept'}-milestone-${i}`] : [],
        assessmentCriteria: [
          'Understanding of core concepts',
          'Practical application ability',
          'Problem-solving proficiency',
        ],
      });
    }

    return milestones;
  }

  /**
   * Generate default schedule
   */
  private static generateDefaultSchedule(request: PlanGenerationRequest): StudySchedule {
    return {
      totalWeeks: request.preferences.totalWeeks || 12,
      hoursPerWeek: request.preferences.hoursPerWeek,
      preferredDays: request.preferences.availableDays || ['monday', 'wednesday', 'friday'],
      preferredTimes: request.preferences.preferredTimes || ['evening'],
      breakWeeks: [],
      intensiveWeeks: [],
    };
  }

  /**
   * Generate default adaptive settings
   */
  private static generateDefaultAdaptiveSettings(): AdaptiveSettings {
    return {
      difficultyAdjustment: true,
      scheduleFlexibility: true,
      progressBasedPacing: true,
      crossConceptIntegration: true,
      milestoneTracking: true,
      performanceThresholds: {
        strugglingThreshold: 70,
        excellingThreshold: 85,
      },
    };
  }

  /**
   * Generate rule-based adaptation as fallback
   */
  private static generateRuleBasedAdaptation(
    concepts: PlannedConcept[],
    schedule: StudySchedule,
    adaptiveSettings: AdaptiveSettings,
    context: PlanAdaptationContext
  ): {
    concepts: PlannedConcept[];
    schedule: StudySchedule;
    adaptiveSettings: AdaptiveSettings;
  } {
    const { performanceMetrics, scheduleChanges } = context;
    
    // Adapt concepts based on performance
    const adaptedConcepts = concepts.map(concept => {
      if (performanceMetrics.strugglingAreas.includes(concept.name)) {
        // Add more time and easier milestones
        return {
          ...concept,
          estimatedDuration: Math.ceil(concept.estimatedDuration * 1.3),
          weeklyHours: Math.ceil(concept.weeklyHours * 1.2),
        };
      } else if (performanceMetrics.excellingAreas.includes(concept.name)) {
        // Accelerate and add advanced topics
        return {
          ...concept,
          estimatedDuration: Math.ceil(concept.estimatedDuration * 0.8),
          customization: {
            ...concept.customization,
            difficultyLevel: 'advanced' as const,
          },
        };
      }
      return concept;
    });

    // Adapt schedule based on changes
    const adaptedSchedule = {
      ...schedule,
      hoursPerWeek: scheduleChanges?.newHoursPerWeek || schedule.hoursPerWeek,
      totalWeeks: Math.ceil(schedule.totalWeeks * performanceMetrics.timeSpentRatio),
    };

    return {
      concepts: adaptedConcepts,
      schedule: adaptedSchedule,
      adaptiveSettings,
    };
  }
}
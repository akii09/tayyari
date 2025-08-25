/**
 * Database Services Index
 * Exports all database services for the multi-AI context system
 */

// Existing services
export { userService } from './userService';
export { LearningConceptService, learningConceptService } from './learningConceptService';
export { chatService } from './chatService';

// New context management services
export { contextEmbeddingService, ContextEmbeddingService } from './contextEmbeddingService';
export { contextManager, ContextManager } from './contextManager';

// Learning plan and onboarding services
export { LearningPlanService } from './learningPlanService';
export { OnboardingManager } from './onboardingManager';

// Types
export type {
  ContextChunk,
  EmbeddingSearchOptions,
} from './contextEmbeddingService';

export type {
  UserProfile,
  ConceptContext,
  LearningSession,
  AIContext,
  ContextBuildOptions,
} from './contextManager';

export type {
  PlannedConcept,
  PlanMilestone,
  ConceptCustomization,
  StudySchedule,
  AdaptiveSettings,
  LearningPlanData,
  PlanGenerationRequest,
  PlanAdaptationContext,
} from './learningPlanService';

export type {
  OnboardingSession,
  OnboardingStep,
  OnboardingData,
  OnboardingRecommendations,
} from './onboardingManager';
/**
 * End-to-End Onboarding and Learning Tests
 * Tests complete user journeys from onboarding through multi-concept learning
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../lib/database/config';
import { users, learningConcepts, conversations, messages, learningPlans, contextEmbeddings } from '../../lib/database/schema';
import { eq } from 'drizzle-orm';
import { OnboardingManager } from '../../lib/database/services/onboardingManager';
import { LearningConceptService } from '../../lib/database/services/learningConceptService';
import { ChatService } from '../../lib/database/services/chatService';
import { LearningPlanService } from '../../lib/database/services/learningPlanService';
import { ContextManager } from '../../lib/database/services/contextManager';
import { aiProviderRouter } from '../../lib/ai/services/AIProviderRouter';
import { aiProviderService } from '../../lib/ai/services/AIProviderService';

// Mock AI services for E2E tests
vi.mock('../../lib/ai/services/AIProviderRouter');
vi.mock('../../lib/ai/services/AIProviderService');

describe('End-to-End Onboarding and Learning Scenarios', () => {
  const testUserId = 'e2e-test-user';
  let contextManager: ContextManager;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(contextEmbeddings).where(eq(contextEmbeddings.userId, testUserId));
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    contextManager = new ContextManager();

    // Setup AI mocks with realistic responses
    vi.mocked(aiProviderRouter.route).mockImplementation(async (request) => {
      const content = generateContextualResponse(request);
      return {
        provider: {
          id: 'test-provider',
          name: 'Test Provider',
          type: 'openai',
          enabled: true,
          priority: 1,
          maxRequestsPerMinute: 60,
          models: ['gpt-4'],
        },
        response: {
          content,
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 150, total: 250 },
          cost: 0.005,
          processingTime: 1500,
          requestId: `req-${Date.now()}`,
        },
        attempts: 1,
        fallbacksUsed: [],
      };
    });

    vi.mocked(aiProviderService.getEnabledProviders).mockResolvedValue([
      {
        id: 'openai-provider',
        name: 'OpenAI',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(contextEmbeddings).where(eq(contextEmbeddings.userId, testUserId));
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  // Helper function to generate contextual AI responses
  function generateContextualResponse(request: any): string {
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const conceptId = request.conceptId;
    
    if (userMessage.toLowerCase().includes('javascript')) {
      return 'JavaScript is a versatile programming language used for web development. Key concepts include variables, functions, objects, and asynchronous programming with promises and async/await.';
    }
    
    if (userMessage.toLowerCase().includes('react')) {
      return 'React is a JavaScript library for building user interfaces. It uses components, JSX syntax, and concepts like state management, props, and hooks for creating interactive applications.';
    }
    
    if (userMessage.toLowerCase().includes('database')) {
      return 'Databases are systems for storing and retrieving data. Key concepts include tables, relationships, SQL queries, indexing, and normalization for efficient data management.';
    }
    
    if (userMessage.toLowerCase().includes('plan') || userMessage.toLowerCase().includes('learn')) {
      return 'Based on your profile and goals, I recommend starting with fundamentals and gradually building complexity. Focus on hands-on practice and real-world projects to reinforce learning.';
    }
    
    return 'I understand your question. Let me provide a comprehensive explanation tailored to your learning level and goals.';
  }

  describe('Complete New User Journey', () => {
    it('should handle full onboarding to first learning session', async () => {
      // Step 1: Start onboarding
      const session = await OnboardingManager.startOnboarding(testUserId);
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.currentStep).toBe('profile');

      // Step 2: Complete profile step
      const profileSession = await OnboardingManager.updateOnboardingStep(
        session.id,
        'goals',
        {
          name: 'Alex Developer',
          role: 'Frontend Developer',
          experienceLevel: 'intermediate',
        }
      );
      expect(profileSession.currentStep).toBe('goals');

      // Step 3: Set learning goals
      const goalsSession = await OnboardingManager.updateOnboardingStep(
        session.id,
        'preferences',
        {
          hoursPerWeek: 12,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          learningStyle: 'hands-on',
        }
      );
      expect(goalsSession.currentStep).toBe('preferences');

      // Step 4: Set preferences and select concepts
      const conceptsSession = await OnboardingManager.updateOnboardingStep(
        session.id,
        'concepts',
        {
          preferredDifficulty: 'intermediate',
          studyReminders: true,
        }
      );
      expect(conceptsSession.currentStep).toBe('concepts');

      // Step 5: Add learning concepts
      const conceptsResult = await OnboardingManager.addConceptsPostOnboarding(testUserId, {
        conceptIds: ['React Development', 'JavaScript Advanced'],
        generateNewPlan: true,
      });

      expect(conceptsResult.user.onboardingCompleted).toBe(true);
      expect(conceptsResult.concepts).toHaveLength(2);
      expect(conceptsResult.learningPlan).toBeDefined();

      const reactConcept = conceptsResult.concepts.find(c => c.name === 'React Development');
      const jsConcept = conceptsResult.concepts.find(c => c.name === 'JavaScript Advanced');
      
      expect(reactConcept).toBeDefined();
      expect(jsConcept).toBeDefined();

      // Step 6: Start first learning session
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Learning React Basics',
        conceptId: reactConcept!.id,
        aiProvider: 'openai',
      });

      expect(conversation.conceptId).toBe(reactConcept!.id);
      expect(conversation.concept?.name).toBe('React Development');

      // Step 7: Have learning conversation
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'What are React components and how do I create them?',
        conceptId: reactConcept!.id,
      });

      const aiResponse = await ChatService.generateAIResponse(
        conversation.id,
        'Explain React components with examples',
        {
          conceptId: reactConcept!.id,
          maxTokens: 2000,
          temperature: 0.7,
        }
      );

      expect(aiResponse.response.content).toContain('React');
      expect(aiResponse.response.content).toContain('component');
      expect(aiResponse.contextInfo).toBeDefined();

      // Step 8: Update learning progress
      await LearningConceptService.updateProgress(reactConcept!.id, {
        completionPercentage: 15,
        timeSpent: 45, // 45 minutes
        currentModule: 'React Components',
      });

      // Verify complete journey
      const updatedUser = await db.select().from(users).where(eq(users.id, testUserId)).then(rows => rows[0]);
      expect(updatedUser.onboardingCompleted).toBe(true);
      expect(updatedUser.name).toBe('Alex Developer');

      const userConcepts = await LearningConceptService.getUserConcepts(testUserId);
      expect(userConcepts).toHaveLength(2);

      const conversationWithMessages = await ChatService.getConversationWithMessages(conversation.id);
      expect(conversationWithMessages?.messages).toHaveLength(2); // User + AI response
    });

    it('should handle skip concept selection flow', async () => {
      // Start onboarding
      const session = await OnboardingManager.startOnboarding(testUserId);

      // Complete profile and preferences quickly
      await OnboardingManager.updateOnboardingStep(session.id, 'goals', {
        name: 'Quick User',
        role: 'Developer',
        experienceLevel: 'beginner',
      });

      await OnboardingManager.updateOnboardingStep(session.id, 'preferences', {
        hoursPerWeek: 8,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Skip concept selection
      const user = await OnboardingManager.skipConceptSelection(session.id);

      expect(user.onboardingCompleted).toBe(true);
      expect(user.name).toBe('Quick User');

      // Verify no concepts were created
      const userConcepts = await LearningConceptService.getUserConcepts(testUserId);
      expect(userConcepts).toHaveLength(0);

      // User can add concepts later
      const laterConcept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Python Basics',
        category: 'programming',
        difficulty: 'beginner',
        estimatedHours: 30,
      });

      expect(laterConcept.userId).toBe(testUserId);
      expect(laterConcept.name).toBe('Python Basics');
    });
  });

  describe('Multi-Concept Learning Scenarios', () => {
    let concepts: any[] = [];

    beforeEach(async () => {
      // Setup user with multiple concepts
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Multi-Concept Learner',
        role: 'Full Stack Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 20,
        onboardingCompleted: true,
      });

      concepts = await Promise.all([
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Frontend Development',
          category: 'programming',
          difficulty: 'intermediate',
          estimatedHours: 50,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Backend APIs',
          category: 'backend',
          difficulty: 'intermediate',
          estimatedHours: 45,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Database Design',
          category: 'data',
          difficulty: 'advanced',
          estimatedHours: 40,
        }),
      ]);
    });

    it('should handle learning session across multiple concepts', async () => {
      // Create conversations for each concept
      const conversations = await Promise.all(
        concepts.map(concept =>
          ChatService.createConversation({
            userId: testUserId,
            title: `Learning ${concept.name}`,
            conceptId: concept.id,
          })
        )
      );

      // Simulate learning sessions
      for (let i = 0; i < concepts.length; i++) {
        const concept = concepts[i];
        const conversation = conversations[i];

        // User asks concept-specific questions
        await ChatService.addMessage({
          conversationId: conversation.id,
          role: 'user',
          content: `What are the key principles of ${concept.name}?`,
          conceptId: concept.id,
        });

        const response = await ChatService.generateAIResponse(
          conversation.id,
          `Explain ${concept.name} fundamentals`,
          { conceptId: concept.id }
        );

        expect(response.response.content).toBeTruthy();

        // Follow-up questions
        await ChatService.addMessage({
          conversationId: conversation.id,
          role: 'user',
          content: `Can you give me practical examples for ${concept.name}?`,
          conceptId: concept.id,
        });

        const exampleResponse = await ChatService.generateAIResponse(
          conversation.id,
          `Provide practical examples`,
          { conceptId: concept.id }
        );

        expect(exampleResponse.response.content).toBeTruthy();

        // Update progress
        await LearningConceptService.updateProgress(concept.id, {
          completionPercentage: 20 + i * 10,
          timeSpent: 90 + i * 30,
          currentModule: `Module ${i + 1}`,
        });
      }

      // Verify all concepts have progress
      const updatedConcepts = await Promise.all(
        concepts.map(c => LearningConceptService.getConceptById(c.id, testUserId))
      );

      updatedConcepts.forEach((concept, index) => {
        expect(concept?.progress.completionPercentage).toBe(20 + index * 10);
        expect(concept?.progress.timeSpent).toBe(90 + index * 30);
      });

      // Verify conversations have messages
      const conversationsWithMessages = await Promise.all(
        conversations.map(c => ChatService.getConversationWithMessages(c.id))
      );

      conversationsWithMessages.forEach(conv => {
        expect(conv?.messages).toHaveLength(4); // 2 user + 2 AI messages
      });
    });

    it('should handle concept switching within conversation', async () => {
      const frontendConcept = concepts[0];
      const backendConcept = concepts[1];

      // Start conversation with frontend concept
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Full Stack Learning',
        conceptId: frontendConcept.id,
      });

      // Learn about frontend
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'How do I create responsive layouts in React?',
        conceptId: frontendConcept.id,
      });

      const frontendResponse = await ChatService.generateAIResponse(
        conversation.id,
        'Explain responsive React layouts',
        { conceptId: frontendConcept.id }
      );

      expect(frontendResponse.response.content).toContain('React');

      // Switch to backend concept
      const switchedConversation = await ChatService.switchConversationConcept(
        conversation.id,
        backendConcept.id,
        testUserId
      );

      expect(switchedConversation.conceptId).toBe(backendConcept.id);
      expect(switchedConversation.concept?.name).toBe('Backend APIs');

      // Continue with backend questions
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'How do I design RESTful APIs?',
        conceptId: backendConcept.id,
      });

      const backendResponse = await ChatService.generateAIResponse(
        conversation.id,
        'Explain RESTful API design',
        { conceptId: backendConcept.id }
      );

      expect(backendResponse.response.content).toBeTruthy();

      // Verify conversation history includes both contexts
      const finalConversation = await ChatService.getConversationWithMessages(conversation.id);
      expect(finalConversation?.messages).toHaveLength(4);

      const messages = finalConversation!.messages;
      expect(messages[0].conceptId).toBe(frontendConcept.id);
      expect(messages[2].conceptId).toBe(backendConcept.id);
    });

    it('should handle cross-concept knowledge integration', async () => {
      const frontendConcept = concepts[0];
      const backendConcept = concepts[1];
      const databaseConcept = concepts[2];

      // Build knowledge in database concept first
      const dbConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Database Learning',
        conceptId: databaseConcept.id,
      });

      await ChatService.generateAIResponse(
        dbConversation.id,
        'Explain database normalization and indexing',
        { conceptId: databaseConcept.id }
      );

      await LearningConceptService.updateProgress(databaseConcept.id, {
        completionPercentage: 30,
        timeSpent: 120,
        currentModule: 'Database Design Principles',
      });

      // Learn backend APIs with database context
      const backendConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Backend with Database',
        conceptId: backendConcept.id,
      });

      const backendResponse = await ChatService.generateAIResponse(
        backendConversation.id,
        'How do I connect my API to a database efficiently?',
        { 
          conceptId: backendConcept.id,
          includeRelatedConcepts: true,
        }
      );

      expect(backendResponse.response.content).toContain('database');
      expect(backendResponse.contextInfo.crossConceptReferences).toBeGreaterThan(0);

      // Learn frontend with full-stack context
      const frontendConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Frontend with Backend',
        conceptId: frontendConcept.id,
      });

      const frontendResponse = await ChatService.generateAIResponse(
        frontendConversation.id,
        'How do I fetch data from my backend API in React?',
        { 
          conceptId: frontendConcept.id,
          includeRelatedConcepts: true,
        }
      );

      expect(frontendResponse.response.content).toBeTruthy();
      expect(frontendResponse.contextInfo.relatedConcepts).toContain(backendConcept.id);
    });
  });

  describe('Learning Plan Adaptation Scenarios', () => {
    it('should adapt plan based on learning progress', async () => {
      // Setup user with learning plan
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Adaptive Learner',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 15,
        onboardingCompleted: true,
      });

      const concepts = await Promise.all([
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'JavaScript Fundamentals',
          category: 'programming',
          difficulty: 'beginner',
          estimatedHours: 30,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Advanced JavaScript',
          category: 'programming',
          difficulty: 'advanced',
          estimatedHours: 50,
          prerequisites: ['JavaScript Fundamentals'],
        }),
      ]);

      // Generate initial learning plan
      const initialPlan = await LearningPlanService.generateLearningPlan({
        userId: testUserId,
        conceptIds: concepts.map(c => c.id),
        preferences: {
          hoursPerWeek: 15,
          totalWeeks: 12,
        },
      });

      expect(initialPlan.concepts).toHaveLength(2);

      // Simulate rapid progress in fundamentals
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'JavaScript Learning',
        conceptId: concepts[0].id,
      });

      // Multiple learning sessions
      for (let i = 0; i < 5; i++) {
        await ChatService.generateAIResponse(
          conversation.id,
          `JavaScript topic ${i + 1}`,
          { conceptId: concepts[0].id }
        );

        await LearningConceptService.updateProgress(concepts[0].id, {
          completionPercentage: (i + 1) * 16, // 16%, 32%, 48%, 64%, 80%
          timeSpent: (i + 1) * 60, // 1 hour increments
          currentModule: `Module ${i + 1}`,
        });
      }

      // Adapt plan based on rapid progress
      const adaptedPlan = await LearningPlanService.adaptPlan(initialPlan.id, testUserId, {
        progressData: {
          [concepts[0].id]: {
            completionPercentage: 80,
            timeSpent: 300, // 5 hours
            performanceScore: 0.9, // High performance
          },
        },
      });

      expect(adaptedPlan.schedule.totalWeeks).toBeLessThan(12);

      // Advanced concept should get more focus
      const advancedConceptPlan = adaptedPlan.concepts.find(c => c.conceptId === concepts[1].id);
      expect(advancedConceptPlan?.weeklyHours).toBeGreaterThan(7);

      // Verify plan adaptation worked
      const planDetails = await LearningPlanService.getLearningPlanById(adaptedPlan.id, testUserId);
      expect(planDetails?.schedule.hoursPerWeek).toBe(15);
      expect(planDetails?.schedule.totalWeeks).toBeLessThan(12);
    });

    it('should handle struggling learner scenario', async () => {
      // Setup user
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Struggling Learner',
        role: 'Junior Developer',
        experienceLevel: 'beginner',
        hoursPerWeek: 10,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Programming Basics',
        category: 'programming',
        difficulty: 'beginner',
        estimatedHours: 40,
      });

      const plan = await LearningPlanService.generateLearningPlan({
        userId: testUserId,
        conceptIds: [concept.id],
        preferences: {
          hoursPerWeek: 10,
          totalWeeks: 8,
        },
      });

      // Simulate slow progress with many questions
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Programming Help',
        conceptId: concept.id,
      });

      // Many questions indicating confusion
      const questions = [
        'I don\'t understand variables, can you explain?',
        'What is a function again?',
        'I\'m confused about loops',
        'Can you re-explain conditionals?',
        'I need help with basic syntax',
      ];

      for (const question of questions) {
        await ChatService.addMessage({
          conversationId: conversation.id,
          role: 'user',
          content: question,
          conceptId: concept.id,
        });

        await ChatService.generateAIResponse(
          conversation.id,
          question,
          { conceptId: concept.id }
        );
      }

      // Update progress showing slow advancement
      await LearningConceptService.updateProgress(concept.id, {
        completionPercentage: 15, // Low progress
        timeSpent: 300, // 5 hours spent
        currentModule: 'Variables and Data Types',
      });

      // Adapt plan for struggling learner
      const adaptedPlan = await LearningPlanService.adaptPlan(plan.id, testUserId, {
        progressData: {
          [concept.id]: {
            completionPercentage: 15,
            timeSpent: 300,
            performanceScore: 0.4, // Low performance score
          },
        },
      });

      // Plan should extend timeline and reduce intensity
      expect(adaptedPlan.schedule.totalWeeks).toBeGreaterThan(8);
      
      const conceptPlan = adaptedPlan.concepts.find(c => c.conceptId === concept.id);
      expect(conceptPlan?.weeklyHours).toBeLessThanOrEqual(10);

      // Should include additional support milestones
      expect(conceptPlan?.milestones.length).toBeGreaterThan(3);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle AI provider failures during learning session', async () => {
      // Setup user and concept
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Error Recovery User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 12,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Error Handling Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 35,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Error Recovery Test',
        conceptId: concept.id,
      });

      // Mock provider failure then recovery
      vi.mocked(aiProviderRouter.route)
        .mockRejectedValueOnce(new Error('Primary provider failed'))
        .mockResolvedValueOnce({
          provider: {
            id: 'fallback-provider',
            name: 'Fallback Provider',
            type: 'anthropic',
            enabled: true,
            priority: 2,
            maxRequestsPerMinute: 60,
            models: ['claude-3-5-sonnet-20241022'],
          },
          response: {
            content: 'I apologize for the delay. Let me help you with error handling concepts...',
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            tokens: { prompt: 80, completion: 120, total: 200 },
            cost: 0.003,
            processingTime: 2000,
            requestId: 'fallback-req',
          },
          attempts: 2,
          fallbacksUsed: ['OpenAI (NETWORK_ERROR)'],
        });

      const response = await ChatService.generateAIResponse(
        conversation.id,
        'Explain error handling best practices',
        { conceptId: concept.id }
      );

      expect(response.response.content).toContain('error handling');
      expect(response.response.providerInfo?.provider).toBe('anthropic');

      // Learning should continue normally
      await LearningConceptService.updateProgress(concept.id, {
        completionPercentage: 25,
        timeSpent: 90,
        currentModule: 'Error Handling Basics',
      });

      const updatedConcept = await LearningConceptService.getConceptById(concept.id, testUserId);
      expect(updatedConcept?.progress.completionPercentage).toBe(25);
    });

    it('should handle context corruption and recovery', async () => {
      // Setup user with existing learning history
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Context Recovery User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 15,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Context Recovery Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Context Recovery Test',
        conceptId: concept.id,
      });

      // Add some learning history
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'What are design patterns?',
        conceptId: concept.id,
      });

      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: 'Design patterns are reusable solutions to common problems...',
        conceptId: concept.id,
        tokens: 100,
        cost: 0.002,
      });

      // Mock context corruption then recovery
      const originalBuildContext = contextManager.buildContext;
      vi.spyOn(contextManager, 'buildContext')
        .mockRejectedValueOnce(new Error('Context corruption detected'))
        .mockResolvedValueOnce({
          userProfile: {
            id: testUserId,
            name: 'Context Recovery User',
            experienceLevel: 'intermediate',
            preferences: { difficultyPreference: 'medium', hoursPerWeek: 15 },
          },
          learningHistory: [],
          conversationHistory: [],
          relevantKnowledge: [],
          systemPrompts: ['Context recovered successfully'],
          totalTokens: 100,
          metadata: {
            contextVersion: '1.0',
            buildTime: new Date(),
            compressionLevel: 0,
            recoveryMode: true,
          },
        });

      const response = await ChatService.generateAIResponse(
        conversation.id,
        'Continue explaining design patterns',
        { conceptId: concept.id }
      );

      expect(response.response.content).toBeTruthy();
      expect(response.contextInfo.recoveryMode).toBe(true);

      // Learning should continue despite context issues
      const conversationWithMessages = await ChatService.getConversationWithMessages(conversation.id);
      expect(conversationWithMessages?.messages.length).toBeGreaterThan(2);
    });
  });

  describe('Long-term Learning Journey', () => {
    it('should handle extended learning journey with milestones', async () => {
      // Setup ambitious learner
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Long-term Learner',
        role: 'Aspiring Full Stack Developer',
        experienceLevel: 'beginner',
        hoursPerWeek: 20,
        onboardingCompleted: true,
      });

      // Create comprehensive learning path
      const concepts = await Promise.all([
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'HTML & CSS Fundamentals',
          category: 'frontend',
          difficulty: 'beginner',
          estimatedHours: 25,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'JavaScript Essentials',
          category: 'programming',
          difficulty: 'beginner',
          estimatedHours: 40,
          prerequisites: ['HTML & CSS Fundamentals'],
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'React Development',
          category: 'frontend',
          difficulty: 'intermediate',
          estimatedHours: 50,
          prerequisites: ['JavaScript Essentials'],
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Node.js & Express',
          category: 'backend',
          difficulty: 'intermediate',
          estimatedHours: 45,
          prerequisites: ['JavaScript Essentials'],
        }),
      ]);

      // Generate comprehensive learning plan
      const learningPlan = await LearningPlanService.generateLearningPlan({
        userId: testUserId,
        conceptIds: concepts.map(c => c.id),
        preferences: {
          hoursPerWeek: 20,
          totalWeeks: 20,
        },
      });

      expect(learningPlan.concepts).toHaveLength(4);

      // Simulate learning journey through first concept
      const htmlCssConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'HTML & CSS Learning',
        conceptId: concepts[0].id,
      });

      // Progress through milestones
      const milestones = [
        { topic: 'HTML structure and semantics', progress: 25 },
        { topic: 'CSS styling and layouts', progress: 50 },
        { topic: 'Responsive design principles', progress: 75 },
        { topic: 'CSS Grid and Flexbox mastery', progress: 100 },
      ];

      for (const milestone of milestones) {
        await ChatService.generateAIResponse(
          htmlCssConversation.id,
          `Teach me about ${milestone.topic}`,
          { conceptId: concepts[0].id }
        );

        await LearningConceptService.updateProgress(concepts[0].id, {
          completionPercentage: milestone.progress,
          timeSpent: milestone.progress * 0.25 * 60, // Proportional time
          currentModule: milestone.topic,
        });

        // Check if milestone triggers plan adaptation
        if (milestone.progress === 100) {
          const adaptedPlan = await LearningPlanService.adaptPlan(learningPlan.id, testUserId, {
            progressData: {
              [concepts[0].id]: {
                completionPercentage: 100,
                timeSpent: 25 * 60, // 25 hours
                performanceScore: 0.85,
              },
            },
          });

          expect(adaptedPlan).toBeDefined();
        }
      }

      // Move to next concept (JavaScript)
      const jsConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'JavaScript Learning',
        conceptId: concepts[1].id,
      });

      // Should reference previous learning
      const jsResponse = await ChatService.generateAIResponse(
        jsConversation.id,
        'How does JavaScript interact with HTML and CSS?',
        { 
          conceptId: concepts[1].id,
          includeRelatedConcepts: true,
        }
      );

      expect(jsResponse.response.content).toContain('HTML');
      expect(jsResponse.contextInfo.crossConceptReferences).toBeGreaterThan(0);

      // Verify learning journey progress
      const finalConcepts = await Promise.all(
        concepts.map(c => LearningConceptService.getConceptById(c.id, testUserId))
      );

      expect(finalConcepts[0]?.progress.completionPercentage).toBe(100);
      expect(finalConcepts[1]?.progress.completionPercentage).toBeGreaterThan(0);

      const userConversations = await ChatService.getUserConversations(testUserId, { limit: 10 });
      expect(userConversations.length).toBeGreaterThanOrEqual(2);
    });
  });
});
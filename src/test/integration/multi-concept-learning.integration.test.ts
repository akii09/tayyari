/**
 * Multi-Concept Learning Integration Tests
 * Tests complete learning flows with multiple concepts, context switching, and AI provider integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../lib/database/config';
import { users, learningConcepts, conversations, messages, learningPlans } from '../../lib/database/schema';
import { eq } from 'drizzle-orm';
import { OnboardingManager } from '../../lib/database/services/onboardingManager';
import { LearningConceptService } from '../../lib/database/services/learningConceptService';
import { ChatService } from '../../lib/database/services/chatService';
import { ContextManager } from '../../lib/database/services/contextManager';
import { LearningPlanService } from '../../lib/database/services/learningPlanService';
import { aiProviderRouter } from '../../lib/ai/services/AIProviderRouter';
import { aiProviderService } from '../../lib/ai/services/AIProviderService';

// Mock AI services for integration tests
vi.mock('../../lib/ai/services/AIProviderRouter');
vi.mock('../../lib/ai/services/AIProviderService');

describe('Multi-Concept Learning Integration', () => {
  const testUserId = 'integration-test-user';
  let conceptIds: string[] = [];
  let conversationIds: string[] = [];

  beforeEach(async () => {
    // Clean up test data
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    // Mock AI provider responses
    vi.mocked(aiProviderRouter.route).mockResolvedValue({
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
        content: 'This is a test AI response.',
        provider: 'openai',
        model: 'gpt-4',
        tokens: { prompt: 50, completion: 30, total: 80 },
        cost: 0.002,
        processingTime: 1200,
        requestId: 'test-request',
      },
      attempts: 1,
      fallbacksUsed: [],
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
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningPlans).where(eq(learningPlans.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    
    conceptIds = [];
    conversationIds = [];
  });

  describe('Complete Multi-Concept Learning Flow', () => {
    it('should handle full onboarding with multiple concepts', async () => {
      // Start onboarding
      const session = await OnboardingManager.startOnboarding(testUserId);
      expect(session).toBeDefined();

      // Update profile
      await OnboardingManager.updateOnboardingStep(session.id, 'goals', {
        name: 'Integration Test User',
        role: 'Full Stack Developer',
        experienceLevel: 'intermediate',
      });

      // Update goals and preferences
      await OnboardingManager.updateOnboardingStep(session.id, 'preferences', {
        hoursPerWeek: 15,
        targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Add multiple concepts
      const conceptsToAdd = [
        { name: 'Data Structures', category: 'programming' },
        { name: 'Machine Learning', category: 'ai' },
        { name: 'System Design', category: 'architecture' },
      ];

      const result = await OnboardingManager.addConceptsPostOnboarding(testUserId, {
        conceptIds: conceptsToAdd.map(c => c.name),
        generateNewPlan: true,
      });

      expect(result.user.onboardingCompleted).toBe(true);
      expect(result.concepts).toHaveLength(3);
      expect(result.learningPlan).toBeDefined();

      conceptIds = result.concepts.map(c => c.id);
    });

    it('should support concurrent learning across multiple concepts', async () => {
      // Create user and concepts
      const user = await OnboardingManager.createUser({
        id: testUserId,
        name: 'Test User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 20,
        onboardingCompleted: true,
      });

      const concepts = await Promise.all([
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'React Development',
          category: 'programming',
          difficulty: 'intermediate',
          estimatedHours: 40,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Database Design',
          category: 'backend',
          difficulty: 'advanced',
          estimatedHours: 50,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'DevOps Practices',
          category: 'operations',
          difficulty: 'intermediate',
          estimatedHours: 35,
        }),
      ]);

      conceptIds = concepts.map(c => c.id);

      // Create conversations for each concept
      const conversations = await Promise.all(
        conceptIds.map(conceptId =>
          ChatService.createConversation({
            userId: testUserId,
            title: `Learning ${concepts.find(c => c.id === conceptId)?.name}`,
            conceptId,
            aiProvider: 'openai',
          })
        )
      );

      conversationIds = conversations.map(c => c.id);

      // Simulate learning sessions across concepts
      for (let i = 0; i < conceptIds.length; i++) {
        const conceptId = conceptIds[i];
        const conversationId = conversationIds[i];
        const conceptName = concepts[i].name;

        // User asks questions
        await ChatService.addMessage({
          conversationId,
          role: 'user',
          content: `What are the key concepts in ${conceptName}?`,
          conceptId,
        });

        // AI responds with context awareness
        const aiResponse = await ChatService.generateAIResponse(
          conversationId,
          `Explain the fundamentals of ${conceptName}`,
          {
            conceptId,
            preferredProvider: 'openai',
            maxTokens: 2000,
          }
        );

        expect(aiResponse.response).toBeDefined();
        expect(aiResponse.response.content).toBeTruthy();
        expect(aiResponse.contextInfo).toBeDefined();

        // Update progress
        await LearningConceptService.updateProgress(conceptId, {
          completionPercentage: 10 + i * 5,
          timeSpent: 60 + i * 30, // minutes
          currentModule: `Module ${i + 1}`,
        });
      }

      // Verify all concepts have progress
      const updatedConcepts = await Promise.all(
        conceptIds.map(id => LearningConceptService.getConceptById(id, testUserId))
      );

      updatedConcepts.forEach((concept, index) => {
        expect(concept).toBeDefined();
        expect(concept!.progress.completionPercentage).toBe(10 + index * 5);
        expect(concept!.progress.timeSpent).toBe(60 + index * 30);
      });
    });

    it('should handle context switching between concepts', async () => {
      // Setup user and concepts
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Context Switch User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 15,
        onboardingCompleted: true,
      });

      const concept1 = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Frontend Development',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const concept2 = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Backend APIs',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 45,
      });

      // Create conversation with first concept
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Learning Session',
        conceptId: concept1.id,
      });

      // Add messages for first concept
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'How do I create a React component?',
        conceptId: concept1.id,
      });

      const response1 = await ChatService.generateAIResponse(
        conversation.id,
        'Explain React components',
        { conceptId: concept1.id }
      );

      expect(response1.response.content).toBeTruthy();

      // Switch to second concept
      const updatedConversation = await ChatService.switchConversationConcept(
        conversation.id,
        concept2.id,
        testUserId
      );

      expect(updatedConversation.conceptId).toBe(concept2.id);
      expect(updatedConversation.concept?.name).toBe('Backend APIs');

      // Continue conversation with new context
      await ChatService.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: 'How do I design REST APIs?',
        conceptId: concept2.id,
      });

      const response2 = await ChatService.generateAIResponse(
        conversation.id,
        'Explain REST API design',
        { conceptId: concept2.id }
      );

      expect(response2.response.content).toBeTruthy();

      // Verify conversation history includes both contexts
      const conversationWithMessages = await ChatService.getConversationWithMessages(conversation.id);
      expect(conversationWithMessages?.messages).toHaveLength(4); // 2 user + 2 assistant
      
      const messages = conversationWithMessages!.messages;
      expect(messages[0].conceptId).toBe(concept1.id);
      expect(messages[2].conceptId).toBe(concept2.id);
    });

    it('should maintain cross-concept knowledge integration', async () => {
      // Setup user with related concepts
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Cross-Concept User',
        role: 'Full Stack Developer',
        experienceLevel: 'advanced',
        hoursPerWeek: 20,
        onboardingCompleted: true,
      });

      const webDevConcept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Web Development',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 50,
        prerequisites: [],
      });

      const databaseConcept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Database Management',
        category: 'backend',
        difficulty: 'intermediate',
        estimatedHours: 40,
        prerequisites: [],
      });

      // Create learning sessions that should reference each other
      const webConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Web Development Learning',
        conceptId: webDevConcept.id,
      });

      const dbConversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Database Learning',
        conceptId: databaseConcept.id,
      });

      // Learn about databases first
      await ChatService.generateAIResponse(
        dbConversation.id,
        'Explain database normalization',
        { conceptId: databaseConcept.id }
      );

      // Update database concept progress
      await LearningConceptService.updateProgress(databaseConcept.id, {
        completionPercentage: 25,
        timeSpent: 120,
        currentModule: 'Database Design',
      });

      // Now learn web development - should reference database knowledge
      const webResponse = await ChatService.generateAIResponse(
        webConversation.id,
        'How do I connect my web app to a database?',
        { 
          conceptId: webDevConcept.id,
          includeRelatedConcepts: true,
        }
      );

      expect(webResponse.response.content).toBeTruthy();
      expect(webResponse.contextInfo.crossConceptReferences).toBeGreaterThan(0);

      // Verify context includes knowledge from database concept
      const contextInfo = webResponse.contextInfo;
      expect(contextInfo.relatedConcepts).toContain(databaseConcept.id);
    });

    it('should handle learning plan adaptation across concepts', async () => {
      // Create user with multiple concepts
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Adaptive Learning User',
        role: 'Software Engineer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 12,
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
          hoursPerWeek: 12,
          totalWeeks: 16,
        },
      });

      expect(initialPlan).toBeDefined();
      expect(initialPlan.concepts).toHaveLength(2);

      // Simulate rapid progress in first concept
      await LearningConceptService.updateProgress(concepts[0].id, {
        completionPercentage: 80,
        timeSpent: 240, // 4 hours
        currentModule: 'Advanced Topics',
      });

      // Adapt the plan based on progress
      const adaptedPlan = await LearningPlanService.adaptPlan(initialPlan.id, testUserId, {
        progressData: {
          [concepts[0].id]: {
            completionPercentage: 80,
            timeSpent: 240,
            performanceScore: 0.9,
          },
        },
      });

      expect(adaptedPlan).toBeDefined();
      
      // Plan should adjust for faster progress
      const updatedSchedule = adaptedPlan.schedule;
      expect(updatedSchedule.totalWeeks).toBeLessThan(16);
      
      // Advanced concept should get more time allocation
      const advancedConceptPlan = adaptedPlan.concepts.find(c => c.conceptId === concepts[1].id);
      expect(advancedConceptPlan?.weeklyHours).toBeGreaterThan(6);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent users with multiple concepts', async () => {
      const userCount = 5;
      const conceptsPerUser = 3;
      const userIds: string[] = [];

      try {
        // Create multiple users concurrently
        const userPromises = Array.from({ length: userCount }, (_, i) => {
          const userId = `concurrent-user-${i}`;
          userIds.push(userId);
          return OnboardingManager.createUser({
            id: userId,
            name: `Concurrent User ${i}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 10,
            onboardingCompleted: true,
          });
        });

        await Promise.all(userPromises);

        // Create concepts for each user
        const conceptPromises = userIds.flatMap(userId =>
          Array.from({ length: conceptsPerUser }, (_, j) =>
            LearningConceptService.createConcept({
              userId,
              name: `Concept ${j + 1}`,
              category: 'programming',
              difficulty: 'intermediate',
              estimatedHours: 40,
            })
          )
        );

        const allConcepts = await Promise.all(conceptPromises);

        // Create conversations and simulate learning
        const conversationPromises = allConcepts.map(concept =>
          ChatService.createConversation({
            userId: concept.userId,
            title: `Learning ${concept.name}`,
            conceptId: concept.id,
          })
        );

        const conversations = await Promise.all(conversationPromises);

        // Simulate concurrent AI interactions
        const aiPromises = conversations.map(conv =>
          ChatService.generateAIResponse(
            conv.id,
            'What should I learn first?',
            { conceptId: conv.conceptId! }
          )
        );

        const responses = await Promise.all(aiPromises);

        // Verify all responses succeeded
        expect(responses).toHaveLength(userCount * conceptsPerUser);
        responses.forEach(response => {
          expect(response.response.content).toBeTruthy();
          expect(response.contextInfo).toBeDefined();
        });

      } finally {
        // Clean up concurrent test data
        for (const userId of userIds) {
          await db.delete(messages).where(eq(messages.userId, userId));
          await db.delete(conversations).where(eq(conversations.userId, userId));
          await db.delete(learningConcepts).where(eq(learningConcepts.userId, userId));
          await db.delete(users).where(eq(users.id, userId));
        }
      }
    });

    it('should maintain performance with large conversation histories', async () => {
      // Create user and concept
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Performance Test User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 15,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Performance Testing Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Long Conversation',
        conceptId: concept.id,
      });

      // Create large conversation history
      const messageCount = 100;
      const messagePromises = [];

      for (let i = 0; i < messageCount; i++) {
        messagePromises.push(
          ChatService.addMessage({
            conversationId: conversation.id,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + 1}: This is test content for performance testing.`,
            conceptId: concept.id,
            tokens: 20,
            cost: 0.001,
          })
        );
      }

      await Promise.all(messagePromises);

      // Measure context retrieval performance
      const startTime = Date.now();
      
      const response = await ChatService.generateAIResponse(
        conversation.id,
        'Summarize our conversation',
        { conceptId: concept.id }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.response.content).toBeTruthy();
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.contextInfo.tokensUsed).toBeLessThan(8000); // Context should be compressed
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle AI provider failures gracefully', async () => {
      // Setup user and concept
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Error Test User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Error Handling Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 30,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Error Test Chat',
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
            content: 'Response from fallback provider',
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            tokens: { prompt: 40, completion: 25, total: 65 },
            cost: 0.0015,
            processingTime: 1800,
            requestId: 'fallback-request',
          },
          attempts: 2,
          fallbacksUsed: ['OpenAI (NETWORK_ERROR)'],
        });

      const response = await ChatService.generateAIResponse(
        conversation.id,
        'Test fallback behavior',
        { conceptId: concept.id }
      );

      expect(response.response.content).toBe('Response from fallback provider');
      expect(response.response.providerInfo?.provider).toBe('anthropic');
    });

    it('should handle context corruption and recovery', async () => {
      // Setup user and concept
      await OnboardingManager.createUser({
        id: testUserId,
        name: 'Context Recovery User',
        role: 'Developer',
        experienceLevel: 'intermediate',
        hoursPerWeek: 10,
        onboardingCompleted: true,
      });

      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Context Recovery Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 30,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Context Recovery Test',
        conceptId: concept.id,
      });

      // Simulate context corruption by mocking context manager failure
      const contextManager = await import('../../lib/database/services/contextManager');
      const originalBuildContext = contextManager.ContextManager.prototype.buildContext;
      
      // Mock context failure then recovery
      vi.spyOn(contextManager.ContextManager.prototype, 'buildContext')
        .mockRejectedValueOnce(new Error('Context corruption detected'))
        .mockResolvedValueOnce({
          userProfile: {
            id: testUserId,
            name: 'Context Recovery User',
            experienceLevel: 'intermediate',
            preferences: { difficultyPreference: 'medium', hoursPerWeek: 10 },
          },
          learningHistory: [],
          conversationHistory: [],
          relevantKnowledge: [],
          systemPrompts: ['Recovered context prompt'],
          totalTokens: 50,
          metadata: {
            contextVersion: '1.0',
            buildTime: new Date(),
            compressionLevel: 0,
            recoveryMode: true,
          },
        });

      const response = await ChatService.generateAIResponse(
        conversation.id,
        'Test context recovery',
        { conceptId: concept.id }
      );

      expect(response.response.content).toBeTruthy();
      expect(response.contextInfo.recoveryMode).toBe(true);
    });
  });
});
/**
 * Load Tests for Concurrent Multi-Concept Usage
 * Tests system performance under concurrent load with multiple users and concepts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { db } from '../../lib/database/config';
import { users, learningConcepts, conversations, messages, contextEmbeddings } from '../../lib/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { OnboardingManager } from '../../lib/database/services/onboardingManager';
import { LearningConceptService } from '../../lib/database/services/learningConceptService';
import { ChatService } from '../../lib/database/services/chatService';
import { ContextManager } from '../../lib/database/services/contextManager';
import { ContextEmbeddingService } from '../../lib/database/services/contextEmbeddingService';
import { aiProviderRouter } from '../../lib/ai/services/AIProviderRouter';
import { aiProviderService } from '../../lib/ai/services/AIProviderService';

// Mock AI services for load tests
vi.mock('../../lib/ai/services/AIProviderRouter');
vi.mock('../../lib/ai/services/AIProviderService');

describe('Concurrent Multi-Concept Usage Load Tests', () => {
  let testUserIds: string[] = [];
  let contextManager: ContextManager;
  let embeddingService: ContextEmbeddingService;

  beforeEach(async () => {
    contextManager = new ContextManager();
    embeddingService = new ContextEmbeddingService();

    // Setup AI mocks with realistic delays
    vi.mocked(aiProviderRouter.route).mockImplementation(async (request) => {
      // Simulate realistic AI response times
      const delay = Math.random() * 1000 + 500; // 500-1500ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return {
        provider: {
          id: 'load-test-provider',
          name: 'Load Test Provider',
          type: 'openai',
          enabled: true,
          priority: 1,
          maxRequestsPerMinute: 60,
          models: ['gpt-4'],
        },
        response: {
          content: `Load test response for user ${request.userId}`,
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 150, total: 250 },
          cost: 0.005,
          processingTime: delay,
          requestId: `load-req-${Date.now()}-${Math.random()}`,
        },
        attempts: 1,
        fallbacksUsed: [],
      };
    });

    vi.mocked(aiProviderService.getEnabledProviders).mockResolvedValue([
      {
        id: 'load-test-provider',
        name: 'Load Test Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 1000, // High limit for load testing
        maxCostPerDay: 100,
        models: ['gpt-4'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up all test data
    if (testUserIds.length > 0) {
      await db.delete(contextEmbeddings).where(inArray(contextEmbeddings.userId, testUserIds));
      await db.delete(messages).where(inArray(messages.userId, testUserIds));
      await db.delete(conversations).where(inArray(conversations.userId, testUserIds));
      await db.delete(learningConcepts).where(inArray(learningConcepts.userId, testUserIds));
      await db.delete(users).where(inArray(users.id, testUserIds));
    }
    testUserIds = [];
  });

  describe('Concurrent User Onboarding', () => {
    it('should handle multiple users onboarding simultaneously', async () => {
      const userCount = 20;
      const userIds = Array.from({ length: userCount }, (_, i) => `load-user-${i}`);
      testUserIds = userIds;

      const startTime = performance.now();

      // Start onboarding for all users concurrently
      const onboardingPromises = userIds.map(async (userId) => {
        const session = await OnboardingManager.startOnboarding(userId);
        
        await OnboardingManager.updateOnboardingStep(session.id, 'goals', {
          name: `Load Test User ${userId}`,
          role: 'Developer',
          experienceLevel: 'intermediate',
        });

        await OnboardingManager.updateOnboardingStep(session.id, 'preferences', {
          hoursPerWeek: 10 + Math.floor(Math.random() * 10),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });

        return OnboardingManager.skipConceptSelection(session.id);
      });

      const results = await Promise.all(onboardingPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTimePerUser = duration / userCount;

      expect(results).toHaveLength(userCount);
      results.forEach(user => {
        expect(user.onboardingCompleted).toBe(true);
      });

      expect(avgTimePerUser).toBeLessThan(1000); // Average under 1 second per user
      expect(duration).toBeLessThan(15000); // Total under 15 seconds

      console.log(`Concurrent onboarding: ${userCount} users in ${duration.toFixed(2)}ms (${avgTimePerUser.toFixed(2)}ms avg)`);
    });

    it('should handle concurrent concept creation', async () => {
      const userCount = 15;
      const conceptsPerUser = 4;
      const userIds = Array.from({ length: userCount }, (_, i) => `concept-user-${i}`);
      testUserIds = userIds;

      // Create users first
      await Promise.all(
        userIds.map(userId =>
          OnboardingManager.createUser({
            id: userId,
            name: `Concept User ${userId}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 12,
            onboardingCompleted: true,
          })
        )
      );

      const startTime = performance.now();

      // Create concepts concurrently for all users
      const conceptPromises = userIds.flatMap(userId =>
        Array.from({ length: conceptsPerUser }, (_, j) =>
          LearningConceptService.createConcept({
            userId,
            name: `Concept ${j + 1} for ${userId}`,
            category: ['programming', 'frontend', 'backend', 'data'][j],
            difficulty: ['beginner', 'intermediate', 'advanced'][j % 3] as any,
            estimatedHours: 30 + j * 10,
          })
        )
      );

      const concepts = await Promise.all(conceptPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalConcepts = userCount * conceptsPerUser;
      const avgTimePerConcept = duration / totalConcepts;

      expect(concepts).toHaveLength(totalConcepts);
      expect(avgTimePerConcept).toBeLessThan(200); // Average under 200ms per concept
      expect(duration).toBeLessThan(20000); // Total under 20 seconds

      console.log(`Concurrent concept creation: ${totalConcepts} concepts in ${duration.toFixed(2)}ms (${avgTimePerConcept.toFixed(2)}ms avg)`);
    });
  });

  describe('Concurrent Learning Sessions', () => {
    beforeEach(async () => {
      // Setup users and concepts for learning tests
      const userCount = 10;
      const userIds = Array.from({ length: userCount }, (_, i) => `learning-user-${i}`);
      testUserIds = userIds;

      // Create users and concepts
      await Promise.all(
        userIds.map(async (userId) => {
          await OnboardingManager.createUser({
            id: userId,
            name: `Learning User ${userId}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 15,
            onboardingCompleted: true,
          });

          // Create 2 concepts per user
          await Promise.all([
            LearningConceptService.createConcept({
              userId,
              name: `JavaScript for ${userId}`,
              category: 'programming',
              difficulty: 'intermediate',
              estimatedHours: 40,
            }),
            LearningConceptService.createConcept({
              userId,
              name: `React for ${userId}`,
              category: 'frontend',
              difficulty: 'intermediate',
              estimatedHours: 50,
            }),
          ]);
        })
      );
    });

    it('should handle concurrent AI conversations', async () => {
      const conversationsPerUser = 3;
      const messagesPerConversation = 5;

      const startTime = performance.now();

      // Get all user concepts
      const allUserConcepts = await Promise.all(
        testUserIds.map(userId => LearningConceptService.getUserConcepts(userId))
      );

      // Create conversations and simulate learning
      const conversationPromises = testUserIds.flatMap((userId, userIndex) => {
        const userConcepts = allUserConcepts[userIndex];
        
        return Array.from({ length: conversationsPerUser }, async (_, convIndex) => {
          const concept = userConcepts[convIndex % userConcepts.length];
          
          const conversation = await ChatService.createConversation({
            userId,
            title: `Learning Session ${convIndex + 1}`,
            conceptId: concept.id,
          });

          // Simulate conversation with multiple messages
          const messagePromises = Array.from({ length: messagesPerConversation }, async (_, msgIndex) => {
            await ChatService.addMessage({
              conversationId: conversation.id,
              role: 'user',
              content: `Question ${msgIndex + 1} about ${concept.name}`,
              conceptId: concept.id,
            });

            return ChatService.generateAIResponse(
              conversation.id,
              `Answer question ${msgIndex + 1}`,
              { conceptId: concept.id }
            );
          });

          return Promise.all(messagePromises);
        });
      });

      const results = await Promise.all(conversationPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalConversations = testUserIds.length * conversationsPerUser;
      const totalMessages = totalConversations * messagesPerConversation;
      const avgTimePerMessage = duration / totalMessages;

      expect(results).toHaveLength(totalConversations);
      expect(avgTimePerMessage).toBeLessThan(2000); // Average under 2 seconds per AI response
      expect(duration).toBeLessThan(60000); // Total under 60 seconds

      console.log(`Concurrent AI conversations: ${totalMessages} AI responses in ${duration.toFixed(2)}ms (${avgTimePerMessage.toFixed(2)}ms avg)`);
    });

    it('should handle concurrent context operations', async () => {
      const operationsPerUser = 10;

      // First, create some context data
      const setupPromises = testUserIds.map(async (userId) => {
        const concepts = await LearningConceptService.getUserConcepts(userId);
        const concept = concepts[0];

        const conversation = await ChatService.createConversation({
          userId,
          title: 'Context Setup',
          conceptId: concept.id,
        });

        // Store some context
        return Promise.all(
          Array.from({ length: 20 }, (_, i) =>
            embeddingService.storeEmbedding({
              userId,
              conceptId: concept.id,
              conversationId: conversation.id,
              content: `Context chunk ${i + 1} for ${userId}`,
              embedding: Array.from({ length: 1536 }, () => Math.random()),
              metadata: {
                type: 'conversation',
                conceptId: concept.id,
                timestamp: new Date(),
                relevanceScore: Math.random(),
              },
            })
          )
        );
      });

      await Promise.all(setupPromises);

      const startTime = performance.now();

      // Perform concurrent context operations
      const contextPromises = testUserIds.flatMap(userId =>
        Array.from({ length: operationsPerUser }, async (_, opIndex) => {
          const concepts = await LearningConceptService.getUserConcepts(userId);
          const concept = concepts[opIndex % concepts.length];

          // Mix of different context operations
          if (opIndex % 3 === 0) {
            // Context retrieval
            return embeddingService.findRelevantContext(
              userId,
              `Query ${opIndex} for ${concept.name}`,
              { conceptId: concept.id, limit: 5 }
            );
          } else if (opIndex % 3 === 1) {
            // Context building
            return contextManager.buildContext(userId, {
              conceptId: concept.id,
              maxTokens: 4000,
            });
          } else {
            // Context storage
            return embeddingService.storeEmbedding({
              userId,
              conceptId: concept.id,
              content: `New context ${opIndex} for ${userId}`,
              embedding: Array.from({ length: 1536 }, () => Math.random()),
              metadata: {
                type: 'conversation',
                conceptId: concept.id,
                timestamp: new Date(),
                relevanceScore: Math.random(),
              },
            });
          }
        })
      );

      const results = await Promise.all(contextPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalOperations = testUserIds.length * operationsPerUser;
      const avgTimePerOperation = duration / totalOperations;

      expect(results).toHaveLength(totalOperations);
      expect(avgTimePerOperation).toBeLessThan(1000); // Average under 1 second per operation
      expect(duration).toBeLessThan(30000); // Total under 30 seconds

      console.log(`Concurrent context operations: ${totalOperations} operations in ${duration.toFixed(2)}ms (${avgTimePerOperation.toFixed(2)}ms avg)`);
    });
  });

  describe('Provider Failover Under Load', () => {
    it('should handle provider failures with concurrent requests', async () => {
      const userCount = 8;
      const requestsPerUser = 5;
      const userIds = Array.from({ length: userCount }, (_, i) => `failover-user-${i}`);
      testUserIds = userIds;

      // Setup users and concepts
      await Promise.all(
        userIds.map(async (userId) => {
          await OnboardingManager.createUser({
            id: userId,
            name: `Failover User ${userId}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 12,
            onboardingCompleted: true,
          });

          return LearningConceptService.createConcept({
            userId,
            name: `Failover Concept for ${userId}`,
            category: 'programming',
            difficulty: 'intermediate',
            estimatedHours: 40,
          });
        })
      );

      // Mock intermittent provider failures
      let requestCount = 0;
      vi.mocked(aiProviderRouter.route).mockImplementation(async (request) => {
        requestCount++;
        
        // Fail every 4th request to simulate provider issues
        if (requestCount % 4 === 0) {
          // First attempt fails
          if (requestCount % 8 === 0) {
            throw new Error('Primary provider failed');
          }
          
          // Fallback succeeds
          await new Promise(resolve => setTimeout(resolve, 800));
          return {
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
              content: `Fallback response for ${request.userId}`,
              provider: 'anthropic',
              model: 'claude-3-5-sonnet-20241022',
              tokens: { prompt: 90, completion: 140, total: 230 },
              cost: 0.004,
              processingTime: 800,
              requestId: `fallback-${requestCount}`,
            },
            attempts: 2,
            fallbacksUsed: ['OpenAI (NETWORK_ERROR)'],
          };
        }

        // Normal success
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
          provider: {
            id: 'primary-provider',
            name: 'Primary Provider',
            type: 'openai',
            enabled: true,
            priority: 1,
            maxRequestsPerMinute: 60,
            models: ['gpt-4'],
          },
          response: {
            content: `Primary response for ${request.userId}`,
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 100, completion: 150, total: 250 },
            cost: 0.005,
            processingTime: 600,
            requestId: `primary-${requestCount}`,
          },
          attempts: 1,
          fallbacksUsed: [],
        };
      });

      const startTime = performance.now();

      // Make concurrent requests with potential failures
      const requestPromises = testUserIds.flatMap(async (userId) => {
        const concepts = await LearningConceptService.getUserConcepts(userId);
        const concept = concepts[0];

        const conversation = await ChatService.createConversation({
          userId,
          title: 'Failover Test',
          conceptId: concept.id,
        });

        return Promise.all(
          Array.from({ length: requestsPerUser }, (_, i) =>
            ChatService.generateAIResponse(
              conversation.id,
              `Failover test question ${i + 1}`,
              { conceptId: concept.id }
            ).catch(error => ({ error: error.message }))
          )
        );
      });

      const results = await Promise.all(requestPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalRequests = userCount * requestsPerUser;
      const avgTimePerRequest = duration / totalRequests;

      const flatResults = results.flat();
      const successfulRequests = flatResults.filter(r => !('error' in r));
      const failedRequests = flatResults.filter(r => 'error' in r);

      expect(successfulRequests.length).toBeGreaterThan(totalRequests * 0.7); // At least 70% success
      expect(avgTimePerRequest).toBeLessThan(3000); // Average under 3 seconds (including retries)
      expect(duration).toBeLessThan(45000); // Total under 45 seconds

      console.log(`Provider failover test: ${successfulRequests.length}/${totalRequests} successful in ${duration.toFixed(2)}ms`);
      console.log(`Failed requests: ${failedRequests.length}, Average time: ${avgTimePerRequest.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const userCount = 12;
      const cycleCount = 5;
      const operationsPerCycle = 10;
      const userIds = Array.from({ length: userCount }, (_, i) => `memory-user-${i}`);
      testUserIds = userIds;

      // Setup users and concepts
      await Promise.all(
        userIds.map(async (userId) => {
          await OnboardingManager.createUser({
            id: userId,
            name: `Memory User ${userId}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 15,
            onboardingCompleted: true,
          });

          return Promise.all([
            LearningConceptService.createConcept({
              userId,
              name: `Memory Concept 1 for ${userId}`,
              category: 'programming',
              difficulty: 'intermediate',
              estimatedHours: 40,
            }),
            LearningConceptService.createConcept({
              userId,
              name: `Memory Concept 2 for ${userId}`,
              category: 'frontend',
              difficulty: 'intermediate',
              estimatedHours: 45,
            }),
          ]);
        })
      );

      const initialMemory = process.memoryUsage();
      const memorySnapshots: number[] = [];

      const startTime = performance.now();

      // Run sustained load in cycles
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        const cyclePromises = testUserIds.flatMap(async (userId) => {
          const concepts = await LearningConceptService.getUserConcepts(userId);
          
          return Promise.all(
            Array.from({ length: operationsPerCycle }, async (_, opIndex) => {
              const concept = concepts[opIndex % concepts.length];
              
              const conversation = await ChatService.createConversation({
                userId,
                title: `Memory Test Cycle ${cycle} Op ${opIndex}`,
                conceptId: concept.id,
              });

              // Mix of operations
              if (opIndex % 3 === 0) {
                // AI conversation
                return ChatService.generateAIResponse(
                  conversation.id,
                  `Memory test question ${cycle}-${opIndex}`,
                  { conceptId: concept.id }
                );
              } else if (opIndex % 3 === 1) {
                // Context storage
                return embeddingService.storeEmbedding({
                  userId,
                  conceptId: concept.id,
                  conversationId: conversation.id,
                  content: `Memory test content ${cycle}-${opIndex}`,
                  embedding: Array.from({ length: 1536 }, () => Math.random()),
                  metadata: {
                    type: 'conversation',
                    conceptId: concept.id,
                    timestamp: new Date(),
                    relevanceScore: Math.random(),
                  },
                });
              } else {
                // Context retrieval
                return embeddingService.findRelevantContext(
                  userId,
                  `Memory test query ${cycle}-${opIndex}`,
                  { conceptId: concept.id, limit: 5 }
                );
              }
            })
          );
        });

        await Promise.all(cyclePromises);

        // Take memory snapshot
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory.heapUsed);

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const finalMemory = process.memoryUsage();

      const totalOperations = userCount * cycleCount * operationsPerCycle;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerOperation = memoryIncrease / totalOperations;

      // Check memory stability (shouldn't grow excessively)
      const maxMemoryIncrease = Math.max(...memorySnapshots) - memorySnapshots[0];
      const avgMemoryPerCycle = memoryIncrease / cycleCount;

      expect(memoryPerOperation).toBeLessThan(1024 * 50); // Less than 50KB per operation
      expect(avgMemoryPerCycle).toBeLessThan(1024 * 1024 * 10); // Less than 10MB per cycle
      expect(duration).toBeLessThan(120000); // Total under 2 minutes

      console.log(`Sustained load test: ${totalOperations} operations in ${duration.toFixed(2)}ms`);
      console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
      console.log(`Memory per operation: ${(memoryPerOperation / 1024).toFixed(2)}KB`);
      console.log(`Max memory increase: ${(maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle database connection pooling under load', async () => {
      const concurrentOperations = 50;
      const operationsPerBatch = 10;

      const userIds = Array.from({ length: concurrentOperations }, (_, i) => `db-user-${i}`);
      testUserIds = userIds;

      const startTime = performance.now();

      // Create users in batches to test connection pooling
      const batches = [];
      for (let i = 0; i < userIds.length; i += operationsPerBatch) {
        const batch = userIds.slice(i, i + operationsPerBatch);
        batches.push(batch);
      }

      for (const batch of batches) {
        const batchPromises = batch.map(userId =>
          OnboardingManager.createUser({
            id: userId,
            name: `DB User ${userId}`,
            role: 'Developer',
            experienceLevel: 'intermediate',
            hoursPerWeek: 10,
            onboardingCompleted: true,
          })
        );

        await Promise.all(batchPromises);
      }

      // Now perform concurrent database operations
      const dbOperationPromises = userIds.map(async (userId) => {
        // Create concept
        const concept = await LearningConceptService.createConcept({
          userId,
          name: `DB Test Concept for ${userId}`,
          category: 'programming',
          difficulty: 'intermediate',
          estimatedHours: 40,
        });

        // Create conversation
        const conversation = await ChatService.createConversation({
          userId,
          title: `DB Test Conversation`,
          conceptId: concept.id,
        });

        // Add messages
        await ChatService.addMessage({
          conversationId: conversation.id,
          role: 'user',
          content: `DB test message from ${userId}`,
          conceptId: concept.id,
        });

        // Update progress
        return LearningConceptService.updateProgress(concept.id, {
          completionPercentage: 10,
          timeSpent: 30,
          currentModule: 'DB Test Module',
        });
      });

      const results = await Promise.all(dbOperationPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTimePerOperation = duration / concurrentOperations;

      expect(results).toHaveLength(concurrentOperations);
      expect(avgTimePerOperation).toBeLessThan(1000); // Average under 1 second
      expect(duration).toBeLessThan(30000); // Total under 30 seconds

      console.log(`Database connection pooling test: ${concurrentOperations} operations in ${duration.toFixed(2)}ms`);
      console.log(`Average time per operation: ${avgTimePerOperation.toFixed(2)}ms`);
    });
  });
});
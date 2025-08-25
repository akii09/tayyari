/**
 * Context Retrieval Performance Tests
 * Tests for context management, embedding operations, and retrieval performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { db } from '../../lib/database/config';
import { users, learningConcepts, contextEmbeddings, conversations, messages } from '../../lib/database/schema';
import { eq } from 'drizzle-orm';
import { ContextManager } from '../../lib/database/services/contextManager';
import { ContextEmbeddingService } from '../../lib/database/services/contextEmbeddingService';
import { ChatService } from '../../lib/database/services/chatService';
import { LearningConceptService } from '../../lib/database/services/learningConceptService';

describe('Context Retrieval Performance', () => {
  const testUserId = 'perf-test-user';
  let conceptIds: string[] = [];
  let conversationIds: string[] = [];
  let contextManager: ContextManager;
  let embeddingService: ContextEmbeddingService;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(contextEmbeddings).where(eq(contextEmbeddings.userId, testUserId));
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    // Initialize services
    contextManager = new ContextManager();
    embeddingService = new ContextEmbeddingService();

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      name: 'Performance Test User',
      role: 'Developer',
      experienceLevel: 'intermediate',
      hoursPerWeek: 15,
      onboardingCompleted: true,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(contextEmbeddings).where(eq(contextEmbeddings.userId, testUserId));
    await db.delete(messages).where(eq(messages.userId, testUserId));
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('Embedding Generation Performance', () => {
    it('should generate embeddings efficiently for large content', async () => {
      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Performance Test Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `This is test content chunk ${i + 1}. It contains information about programming concepts, algorithms, and data structures.`
      ).join(' ');

      const startTime = performance.now();

      const embedding = await embeddingService.generateEmbedding(largeContent);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(embedding).toBeDefined();
      expect(embedding.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Embedding generation took ${duration.toFixed(2)}ms for ${largeContent.length} characters`);
    });

    it('should handle batch embedding generation efficiently', async () => {
      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Batch Test Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const batchSize = 50;
      const contents = Array.from({ length: batchSize }, (_, i) => 
        `Batch content ${i + 1}: This is a test message about programming concepts and learning materials.`
      );

      const startTime = performance.now();

      const embeddings = await Promise.all(
        contents.map(content => embeddingService.generateEmbedding(content))
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(embeddings).toHaveLength(batchSize);
      embeddings.forEach(embedding => {
        expect(embedding).toBeDefined();
        expect(embedding.length).toBeGreaterThan(0);
      });

      const avgTimePerEmbedding = duration / batchSize;
      expect(avgTimePerEmbedding).toBeLessThan(200); // Average should be under 200ms per embedding

      console.log(`Batch embedding generation: ${duration.toFixed(2)}ms total, ${avgTimePerEmbedding.toFixed(2)}ms average per embedding`);
    });
  });

  describe('Context Storage Performance', () => {
    it('should store large amounts of context efficiently', async () => {
      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Storage Test Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Storage Performance Test',
        conceptId: concept.id,
      });

      const contextChunks = Array.from({ length: 100 }, (_, i) => ({
        id: `chunk-${i}`,
        content: `Context chunk ${i + 1}: This contains detailed information about programming concepts, code examples, and learning progress.`,
        embedding: Array.from({ length: 1536 }, () => Math.random()), // Simulate OpenAI embedding
        metadata: {
          type: 'conversation' as const,
          conceptId: concept.id,
          timestamp: new Date(),
          relevanceScore: Math.random(),
        },
      }));

      const startTime = performance.now();

      await Promise.all(
        contextChunks.map(chunk =>
          embeddingService.storeEmbedding({
            userId: testUserId,
            conceptId: concept.id,
            conversationId: conversation.id,
            content: chunk.content,
            embedding: chunk.embedding,
            metadata: chunk.metadata,
          })
        )
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      const avgTimePerChunk = duration / contextChunks.length;
      console.log(`Context storage: ${duration.toFixed(2)}ms total, ${avgTimePerChunk.toFixed(2)}ms average per chunk`);
    });

    it('should handle concurrent context storage', async () => {
      const concepts = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          LearningConceptService.createConcept({
            userId: testUserId,
            name: `Concurrent Concept ${i + 1}`,
            category: 'programming',
            difficulty: 'intermediate',
            estimatedHours: 40,
          })
        )
      );

      const conversations = await Promise.all(
        concepts.map(concept =>
          ChatService.createConversation({
            userId: testUserId,
            title: `Concurrent Test ${concept.name}`,
            conceptId: concept.id,
          })
        )
      );

      const startTime = performance.now();

      // Store context concurrently for all conversations
      const storagePromises = conversations.flatMap((conversation, convIndex) =>
        Array.from({ length: 20 }, (_, chunkIndex) =>
          embeddingService.storeEmbedding({
            userId: testUserId,
            conceptId: conversation.conceptId!,
            conversationId: conversation.id,
            content: `Concurrent context chunk ${convIndex}-${chunkIndex}`,
            embedding: Array.from({ length: 1536 }, () => Math.random()),
            metadata: {
              type: 'conversation',
              conceptId: conversation.conceptId!,
              timestamp: new Date(),
              relevanceScore: Math.random(),
            },
          })
        )
      );

      await Promise.all(storagePromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(`Concurrent context storage: ${duration.toFixed(2)}ms for ${storagePromises.length} chunks`);
    });
  });

  describe('Context Retrieval Performance', () => {
    beforeEach(async () => {
      // Setup test data for retrieval tests
      const concepts = await Promise.all([
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'JavaScript',
          category: 'programming',
          difficulty: 'intermediate',
          estimatedHours: 40,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'React',
          category: 'programming',
          difficulty: 'advanced',
          estimatedHours: 50,
        }),
        LearningConceptService.createConcept({
          userId: testUserId,
          name: 'Node.js',
          category: 'backend',
          difficulty: 'intermediate',
          estimatedHours: 45,
        }),
      ]);

      conceptIds = concepts.map(c => c.id);

      // Create conversations and context for each concept
      for (const concept of concepts) {
        const conversation = await ChatService.createConversation({
          userId: testUserId,
          title: `Learning ${concept.name}`,
          conceptId: concept.id,
        });

        conversationIds.push(conversation.id);

        // Store context chunks for each concept
        const contextPromises = Array.from({ length: 50 }, (_, i) =>
          embeddingService.storeEmbedding({
            userId: testUserId,
            conceptId: concept.id,
            conversationId: conversation.id,
            content: `${concept.name} context chunk ${i + 1}: Detailed information about ${concept.name} concepts, best practices, and examples.`,
            embedding: Array.from({ length: 1536 }, () => Math.random()),
            metadata: {
              type: 'conversation',
              conceptId: concept.id,
              timestamp: new Date(Date.now() - i * 60000), // Spread over time
              relevanceScore: Math.random(),
            },
          })
        );

        await Promise.all(contextPromises);
      }
    });

    it('should retrieve relevant context quickly', async () => {
      const query = 'How do I handle asynchronous operations?';
      const conceptId = conceptIds[0]; // JavaScript concept

      const startTime = performance.now();

      const relevantContext = await embeddingService.findRelevantContext(
        testUserId,
        query,
        {
          conceptId,
          limit: 10,
          minRelevanceScore: 0.1,
        }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(relevantContext).toBeDefined();
      expect(relevantContext.length).toBeGreaterThan(0);
      expect(relevantContext.length).toBeLessThanOrEqual(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Context retrieval took ${duration.toFixed(2)}ms for ${relevantContext.length} results`);
    });

    it('should handle cross-concept context retrieval efficiently', async () => {
      const query = 'How do I build a full-stack application?';

      const startTime = performance.now();

      const crossConceptContext = await embeddingService.findRelevantContext(
        testUserId,
        query,
        {
          limit: 20,
          minRelevanceScore: 0.1,
          includeCrossConcept: true,
        }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(crossConceptContext).toBeDefined();
      expect(crossConceptContext.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      // Should include context from multiple concepts
      const uniqueConceptIds = new Set(
        crossConceptContext.map(chunk => chunk.metadata.conceptId).filter(Boolean)
      );
      expect(uniqueConceptIds.size).toBeGreaterThan(1);

      console.log(`Cross-concept retrieval took ${duration.toFixed(2)}ms for ${crossConceptContext.length} results from ${uniqueConceptIds.size} concepts`);
    });

    it('should build complete context efficiently', async () => {
      const conceptId = conceptIds[1]; // React concept
      const conversationId = conversationIds[1];

      const startTime = performance.now();

      const context = await contextManager.buildContext(testUserId, {
        conceptId,
        conversationId,
        maxTokens: 8000,
        includeHistory: true,
        historyLimit: 50,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(context).toBeDefined();
      expect(context.userProfile).toBeDefined();
      expect(context.relevantKnowledge).toBeDefined();
      expect(context.totalTokens).toBeLessThanOrEqual(8000);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Context building took ${duration.toFixed(2)}ms, total tokens: ${context.totalTokens}`);
    });

    it('should handle context compression efficiently', async () => {
      const conceptId = conceptIds[0];
      const conversationId = conversationIds[0];

      // Build large context first
      const largeContext = await contextManager.buildContext(testUserId, {
        conceptId,
        conversationId,
        maxTokens: 16000, // Large context
        includeHistory: true,
        historyLimit: 100,
      });

      const startTime = performance.now();

      const compressedContext = await contextManager.compressContext(largeContext, {
        targetTokens: 4000,
        preserveRecent: true,
        preserveImportant: true,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(compressedContext).toBeDefined();
      expect(compressedContext.totalTokens).toBeLessThanOrEqual(4000);
      expect(compressedContext.totalTokens).toBeLessThan(largeContext.totalTokens);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Context compression took ${duration.toFixed(2)}ms, reduced from ${largeContext.totalTokens} to ${compressedContext.totalTokens} tokens`);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large-scale context operations', async () => {
      const conceptCount = 10;
      const conversationsPerConcept = 5;
      const chunksPerConversation = 20;

      // Create concepts
      const concepts = await Promise.all(
        Array.from({ length: conceptCount }, (_, i) =>
          LearningConceptService.createConcept({
            userId: testUserId,
            name: `Scale Test Concept ${i + 1}`,
            category: 'programming',
            difficulty: 'intermediate',
            estimatedHours: 40,
          })
        )
      );

      const startTime = performance.now();

      // Create conversations and context
      const allPromises = concepts.flatMap(concept =>
        Array.from({ length: conversationsPerConcept }, async (_, convIndex) => {
          const conversation = await ChatService.createConversation({
            userId: testUserId,
            title: `Scale Test Conv ${convIndex + 1}`,
            conceptId: concept.id,
          });

          // Store context chunks
          return Promise.all(
            Array.from({ length: chunksPerConversation }, (_, chunkIndex) =>
              embeddingService.storeEmbedding({
                userId: testUserId,
                conceptId: concept.id,
                conversationId: conversation.id,
                content: `Scale test chunk ${convIndex}-${chunkIndex}`,
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
        })
      );

      await Promise.all(allPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      const totalChunks = conceptCount * conversationsPerConcept * chunksPerConversation;
      const avgTimePerChunk = duration / totalChunks;

      expect(avgTimePerChunk).toBeLessThan(100); // Should average under 100ms per chunk

      console.log(`Large-scale context operations: ${duration.toFixed(2)}ms for ${totalChunks} chunks, ${avgTimePerChunk.toFixed(2)}ms average`);

      // Test retrieval performance with large dataset
      const retrievalStartTime = performance.now();

      const results = await embeddingService.findRelevantContext(
        testUserId,
        'programming concepts and best practices',
        {
          limit: 50,
          minRelevanceScore: 0.1,
        }
      );

      const retrievalEndTime = performance.now();
      const retrievalDuration = retrievalEndTime - retrievalStartTime;

      expect(results.length).toBeGreaterThan(0);
      expect(retrievalDuration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Large-scale retrieval: ${retrievalDuration.toFixed(2)}ms for ${results.length} results from ${totalChunks} total chunks`);
    });

    it('should maintain performance with concurrent context operations', async () => {
      const concept = await LearningConceptService.createConcept({
        userId: testUserId,
        name: 'Concurrent Operations Concept',
        category: 'programming',
        difficulty: 'intermediate',
        estimatedHours: 40,
      });

      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Concurrent Operations Test',
        conceptId: concept.id,
      });

      // Store initial context
      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          embeddingService.storeEmbedding({
            userId: testUserId,
            conceptId: concept.id,
            conversationId: conversation.id,
            content: `Initial context chunk ${i + 1}`,
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

      const startTime = performance.now();

      // Perform concurrent operations
      const operations = [
        // Context retrieval operations
        ...Array.from({ length: 10 }, () =>
          embeddingService.findRelevantContext(
            testUserId,
            'concurrent test query',
            { conceptId: concept.id, limit: 10 }
          )
        ),
        // Context building operations
        ...Array.from({ length: 5 }, () =>
          contextManager.buildContext(testUserId, {
            conceptId: concept.id,
            conversationId: conversation.id,
            maxTokens: 4000,
          })
        ),
        // Additional storage operations
        ...Array.from({ length: 20 }, (_, i) =>
          embeddingService.storeEmbedding({
            userId: testUserId,
            conceptId: concept.id,
            conversationId: conversation.id,
            content: `Concurrent storage chunk ${i + 1}`,
            embedding: Array.from({ length: 1536 }, () => Math.random()),
            metadata: {
              type: 'conversation',
              conceptId: concept.id,
              timestamp: new Date(),
              relevanceScore: Math.random(),
            },
          })
        ),
      ];

      const results = await Promise.all(operations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(35); // 10 + 5 + 20
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Concurrent operations completed in ${duration.toFixed(2)}ms`);
    });
  });
});
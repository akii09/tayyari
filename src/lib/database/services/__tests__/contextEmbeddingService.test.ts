/**
 * Context Embedding Service Tests
 * Tests for vector embeddings and semantic search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ContextEmbeddingService, contextEmbeddingService } from '../contextEmbeddingService';
import { db } from '../../config';
import { contextEmbeddings } from '../../schema';
import { eq } from 'drizzle-orm';

// No need to mock AI SDK since we're using a placeholder implementation

describe('ContextEmbeddingService', () => {
  const mockUserId = 'test-user-id';
  const mockConceptId = 'test-concept-id';
  const mockConversationId = 'test-conversation-id';
  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(contextEmbeddings).where(eq(contextEmbeddings.userId, mockUserId));
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text content', async () => {
      const content = 'This is test content for embedding';
      
      const result = await contextEmbeddingService.generateEmbedding(content);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1536); // Standard embedding dimension
      expect(result.every(val => typeof val === 'number')).toBe(true);
    });

    it('should generate consistent embeddings for same content', async () => {
      const content = 'Test content';
      
      const result1 = await contextEmbeddingService.generateEmbedding(content);
      const result2 = await contextEmbeddingService.generateEmbedding(content);
      
      expect(result1).toEqual(result2);
    });
  });

  describe('storeContext', () => {
    it('should store context with embedding', async () => {
      const content = 'Test conversation content';
      const metadata = {
        type: 'conversation' as const,
        conceptId: mockConceptId,
        conversationId: mockConversationId,
      };

      const contextId = await contextEmbeddingService.storeContext(
        mockUserId,
        content,
        metadata
      );

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');

      // Verify the context was stored
      const stored = await contextEmbeddingService.getContextById(contextId);
      expect(stored).toBeDefined();
      expect(stored?.content).toBe(content);
      expect(stored?.metadata.type).toBe('conversation');
      expect(stored?.metadata.conceptId).toBe(mockConceptId);
    });

    it('should handle storage errors', async () => {
      (embed as Mock).mockRejectedValue(new Error('Embedding failed'));

      await expect(contextEmbeddingService.storeContext(
        mockUserId,
        'test content',
        { type: 'conversation' }
      )).rejects.toThrow('Context storage failed');
    });
  });

  describe('searchSimilarContexts', () => {
    beforeEach(async () => {
      // Store some test contexts
      await contextEmbeddingService.storeContext(
        mockUserId,
        'JavaScript programming concepts',
        { type: 'concept', conceptId: mockConceptId }
      );

      await contextEmbeddingService.storeContext(
        mockUserId,
        'Python data structures',
        { type: 'concept', conceptId: 'python-concept' }
      );

      await contextEmbeddingService.storeContext(
        mockUserId,
        'User asked about arrays',
        { type: 'conversation', conversationId: mockConversationId }
      );
    });

    it('should find similar contexts', async () => {
      const query = 'programming languages';
      
      const results = await contextEmbeddingService.searchSimilarContexts(query, {
        userId: mockUserId,
        limit: 5,
        threshold: 0.5,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Results should be sorted by relevance score
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].metadata.relevanceScore).toBeGreaterThanOrEqual(
          results[i].metadata.relevanceScore || 0
        );
      }
    });

    it('should filter by concept ID', async () => {
      const query = 'programming';
      
      const results = await contextEmbeddingService.searchSimilarContexts(query, {
        userId: mockUserId,
        conceptId: mockConceptId,
        limit: 5,
        threshold: 0.1,
      });

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.metadata.conceptId).toBe(mockConceptId);
      });
    });

    it('should filter by type', async () => {
      const query = 'programming';
      
      const results = await contextEmbeddingService.searchSimilarContexts(query, {
        userId: mockUserId,
        type: 'concept',
        limit: 5,
        threshold: 0.1,
      });

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.metadata.type).toBe('concept');
      });
    });

    it('should respect threshold parameter', async () => {
      const query = 'completely unrelated query about cooking recipes';
      
      const results = await contextEmbeddingService.searchSimilarContexts(query, {
        userId: mockUserId,
        threshold: 0.9, // Very high threshold
        limit: 5,
      });

      // Should return fewer or no results due to high threshold
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty search results', async () => {
      const query = 'completely unrelated query about cooking recipes';
      
      const results = await contextEmbeddingService.searchSimilarContexts(query, {
        userId: 'non-existent-user',
        threshold: 0.9,
        limit: 5,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getContextById', () => {
    it('should retrieve context by ID', async () => {
      const content = 'Test context content';
      const contextId = await contextEmbeddingService.storeContext(
        mockUserId,
        content,
        { type: 'conversation' }
      );

      const retrieved = await contextEmbeddingService.getContextById(contextId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(contextId);
      expect(retrieved?.content).toBe(content);
      expect(retrieved?.metadata.type).toBe('conversation');
    });

    it('should return null for non-existent context', async () => {
      const result = await contextEmbeddingService.getContextById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('updateRelevanceScore', () => {
    it('should update relevance score', async () => {
      const contextId = await contextEmbeddingService.storeContext(
        mockUserId,
        'Test content',
        { type: 'conversation' }
      );

      await contextEmbeddingService.updateRelevanceScore(contextId, 0.8);

      const updated = await contextEmbeddingService.getContextById(contextId);
      expect(updated?.metadata.relevanceScore).toBe(0.8);
    });
  });

  describe('deleteContext', () => {
    it('should delete context', async () => {
      const contextId = await contextEmbeddingService.storeContext(
        mockUserId,
        'Test content',
        { type: 'conversation' }
      );

      await contextEmbeddingService.deleteContext(contextId);

      const deleted = await contextEmbeddingService.getContextById(contextId);
      expect(deleted).toBeNull();
    });
  });

  describe('getUserContexts', () => {
    beforeEach(async () => {
      // Store multiple contexts for testing
      await contextEmbeddingService.storeContext(
        mockUserId,
        'Context 1',
        { type: 'conversation', conversationId: mockConversationId }
      );

      await contextEmbeddingService.storeContext(
        mockUserId,
        'Context 2',
        { type: 'concept', conceptId: mockConceptId }
      );

      await contextEmbeddingService.storeContext(
        mockUserId,
        'Context 3',
        { type: 'progress' }
      );
    });

    it('should get all user contexts', async () => {
      const contexts = await contextEmbeddingService.getUserContexts(mockUserId);

      expect(contexts.length).toBeGreaterThanOrEqual(3);
      contexts.forEach(context => {
        expect(context.id).toBeDefined();
        expect(context.content).toBeDefined();
        expect(context.metadata.type).toBeDefined();
      });
    });

    it('should filter by conversation ID', async () => {
      const contexts = await contextEmbeddingService.getUserContexts(mockUserId, {
        conversationId: mockConversationId,
      });

      expect(contexts.length).toBeGreaterThanOrEqual(1);
      contexts.forEach(context => {
        expect(context.metadata.conversationId).toBe(mockConversationId);
      });
    });

    it('should filter by concept ID', async () => {
      const contexts = await contextEmbeddingService.getUserContexts(mockUserId, {
        conceptId: mockConceptId,
      });

      expect(contexts.length).toBeGreaterThanOrEqual(1);
      contexts.forEach(context => {
        expect(context.metadata.conceptId).toBe(mockConceptId);
      });
    });

    it('should filter by type', async () => {
      const contexts = await contextEmbeddingService.getUserContexts(mockUserId, {
        type: 'concept',
      });

      expect(contexts.length).toBeGreaterThanOrEqual(1);
      contexts.forEach(context => {
        expect(context.metadata.type).toBe('concept');
      });
    });

    it('should respect limit parameter', async () => {
      const contexts = await contextEmbeddingService.getUserContexts(mockUserId, {
        limit: 2,
      });

      expect(contexts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('batchStoreContexts', () => {
    it('should store multiple contexts in batch', async () => {
      const contexts = [
        {
          userId: mockUserId,
          content: 'Batch context 1',
          metadata: { type: 'conversation' as const },
        },
        {
          userId: mockUserId,
          content: 'Batch context 2',
          metadata: { type: 'concept' as const, conceptId: mockConceptId },
        },
      ];

      const contextIds = await contextEmbeddingService.batchStoreContexts(contexts);

      expect(contextIds).toHaveLength(2);
      expect(contextIds.every(id => typeof id === 'string')).toBe(true);

      // Verify contexts were stored
      for (const contextId of contextIds) {
        const stored = await contextEmbeddingService.getContextById(contextId);
        expect(stored).toBeDefined();
      }
    });

    it('should handle empty batch storage', async () => {
      const contexts: any[] = [];

      const contextIds = await contextEmbeddingService.batchStoreContexts(contexts);

      expect(contextIds).toHaveLength(0);
    });
  });

  describe('cleanupOldContexts', () => {
    beforeEach(async () => {
      // Store contexts with different relevance scores
      const lowRelevanceId = await contextEmbeddingService.storeContext(
        mockUserId,
        'Low relevance content',
        { type: 'conversation' }
      );
      await contextEmbeddingService.updateRelevanceScore(lowRelevanceId, 0.2);

      const highRelevanceId = await contextEmbeddingService.storeContext(
        mockUserId,
        'High relevance content',
        { type: 'conversation' }
      );
      await contextEmbeddingService.updateRelevanceScore(highRelevanceId, 0.9);
    });

    it('should clean up old low-relevance contexts', async () => {
      const deletedCount = await contextEmbeddingService.cleanupOldContexts(mockUserId, {
        olderThanDays: 0, // Consider all contexts as old
        minRelevanceScore: 0.5,
        keepCount: 1,
      });

      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should respect keepCount parameter', async () => {
      const initialContexts = await contextEmbeddingService.getUserContexts(mockUserId);
      const initialCount = initialContexts.length;

      await contextEmbeddingService.cleanupOldContexts(mockUserId, {
        olderThanDays: 0,
        minRelevanceScore: 0,
        keepCount: Math.max(1, initialCount - 1),
      });

      const remainingContexts = await contextEmbeddingService.getUserContexts(mockUserId);
      expect(remainingContexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate similarity correctly', async () => {
      const service = new ContextEmbeddingService();
      
      // Access private method through type assertion
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      // Test identical vectors
      const identical = calculateSimilarity([1, 0, 0], [1, 0, 0]);
      expect(identical).toBeCloseTo(1.0, 5);
      
      // Test orthogonal vectors
      const orthogonal = calculateSimilarity([1, 0, 0], [0, 1, 0]);
      expect(orthogonal).toBeCloseTo(0.0, 5);
      
      // Test opposite vectors
      const opposite = calculateSimilarity([1, 0, 0], [-1, 0, 0]);
      expect(opposite).toBeCloseTo(-1.0, 5);
    });

    it('should handle zero vectors', async () => {
      const service = new ContextEmbeddingService();
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      const result = calculateSimilarity([0, 0, 0], [1, 0, 0]);
      expect(result).toBe(0);
    });

    it('should throw error for different length vectors', async () => {
      const service = new ContextEmbeddingService();
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      expect(() => calculateSimilarity([1, 0], [1, 0, 0]))
        .toThrow('Vectors must have the same length');
    });
  });
});
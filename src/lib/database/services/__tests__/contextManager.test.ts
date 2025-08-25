/**
 * Context Manager Tests
 * Tests for intelligent context building, compression, and management
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ContextManager, contextManager } from '../contextManager';
import { contextEmbeddingService } from '../contextEmbeddingService';
import { userService } from '../userService';
import { LearningConceptService } from '../learningConceptService';
import { db } from '../../config';
import { users, learningConcepts, conversations, messages } from '../../schema';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('../contextEmbeddingService');
vi.mock('../userService');
vi.mock('../learningConceptService');
vi.mock('../chatService');

describe('ContextManager', () => {
  const mockUserId = 'test-user-id';
  const mockConceptId = 'test-concept-id';
  const mockConversationId = 'test-conversation-id';

  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'Software Engineer',
    experienceLevel: 'mid',
    yearsOfExperience: 3,
    currentCompany: 'Test Company',
    currentTitle: 'Developer',
    targetCompanies: '["Google", "Microsoft"]',
    targetRoles: '["Senior Engineer"]',
    interviewTypes: '["dsa", "system_design"]',
    targetDate: '2024-06-01',
    hoursPerWeek: 10,
    preferredStudyTime: 'evening',
    currentSkills: '{"javascript": 8, "python": 6}',
    weakAreas: '["system_design", "algorithms"]',
    strongAreas: '["frontend", "databases"]',
    difficultyPreference: 'medium',
    learningStyle: 'hands-on',
    notificationPreferences: '{}',
    onboardingCompleted: true,
    currentStreak: 5,
    totalStudyHours: 25.5,
    lastActiveDate: '2024-01-15',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  const mockConcept = {
    id: mockConceptId,
    userId: mockUserId,
    name: 'JavaScript Fundamentals',
    description: 'Learn JavaScript basics',
    category: 'programming',
    difficulty: 'intermediate',
    estimatedHours: 40,
    prerequisites: '[]',
    learningObjectives: '["Variables", "Functions", "Objects"]',
    customPrompts: '[{"type": "system", "content": "Focus on practical examples", "priority": 1}]',
    isActive: true,
    completionPercentage: 65.5,
    currentModule: 'Functions',
    timeSpent: 15.5,
    lastStudied: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const mockMessages = [
    {
      id: 'msg-1',
      conversationId: mockConversationId,
      role: 'user' as const,
      content: 'What are JavaScript closures?',
      createdAt: '2024-01-15T10:00:00Z',
      attachments: null,
      tokens: null,
      model: null,
      conceptId: mockConceptId,
      contextUsed: null,
      cost: null,
      processingTime: null,
      feedback: null,
      feedbackNote: null,
    },
    {
      id: 'msg-2',
      conversationId: mockConversationId,
      role: 'assistant' as const,
      content: 'Closures are functions that have access to variables from their outer scope...',
      createdAt: '2024-01-15T10:01:00Z',
      attachments: null,
      tokens: 150,
      model: 'gpt-4',
      conceptId: mockConceptId,
      contextUsed: '{}',
      cost: 0.003,
      processingTime: 1200,
      feedback: null,
      feedbackNote: null,
    },
  ];

  const mockContextChunks = [
    {
      id: 'chunk-1',
      content: 'Previous discussion about JavaScript functions',
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        type: 'conversation' as const,
        conceptId: mockConceptId,
        timestamp: new Date('2024-01-14T10:00:00Z'),
        relevanceScore: 0.85,
      },
    },
    {
      id: 'chunk-2',
      content: 'User completed exercise on arrow functions',
      embedding: [0.2, 0.3, 0.4],
      metadata: {
        type: 'progress' as const,
        conceptId: mockConceptId,
        timestamp: new Date('2024-01-13T15:00:00Z'),
        relevanceScore: 0.75,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock userService
    (userService.getUserById as Mock).mockResolvedValue(mockUser);

    // Mock learningConceptService
    (learningConceptService.getConceptById as Mock).mockResolvedValue(mockConcept);
    (learningConceptService.getUserConcepts as Mock).mockResolvedValue([mockConcept]);

    // Mock contextEmbeddingService
    (contextEmbeddingService.searchSimilarContexts as Mock).mockResolvedValue(mockContextChunks);
    (contextEmbeddingService.storeContext as Mock).mockResolvedValue('stored-context-id');
    (contextEmbeddingService.batchStoreContexts as Mock).mockResolvedValue(['id1', 'id2']);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(messages).where(eq(messages.conversationId, mockConversationId));
    await db.delete(conversations).where(eq(conversations.id, mockConversationId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, mockUserId));
    await db.delete(users).where(eq(users.id, mockUserId));
  });

  describe('buildContext', () => {
    beforeEach(async () => {
      // Set up test data in database
      await db.insert(users).values(mockUser);
      await db.insert(learningConcepts).values(mockConcept);
      await db.insert(conversations).values({
        id: mockConversationId,
        userId: mockUserId,
        title: 'JavaScript Discussion',
        context: 'general',
        conceptId: mockConceptId,
        messageCount: 2,
        lastMessageAt: '2024-01-15T10:01:00Z',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:01:00Z',
      });
      await db.insert(messages).values(mockMessages);
    });

    it('should build comprehensive context', async () => {
      const context = await contextManager.buildContext(mockUserId, {
        conceptId: mockConceptId,
        conversationId: mockConversationId,
        maxTokens: 10000,
      });

      expect(context).toBeDefined();
      expect(context.userProfile).toBeDefined();
      expect(context.userProfile.id).toBe(mockUserId);
      expect(context.userProfile.name).toBe('Test User');
      expect(context.userProfile.experienceLevel).toBe('mid');

      expect(context.conceptContext).toBeDefined();
      expect(context.conceptContext?.concept.id).toBe(mockConceptId);
      expect(context.conceptContext?.progress.completionPercentage).toBe(65.5);

      expect(context.conversationHistory).toBeDefined();
      expect(context.conversationHistory.length).toBe(2);

      expect(context.relevantKnowledge).toBeDefined();
      expect(context.relevantKnowledge.length).toBe(2);

      expect(context.systemPrompts).toBeDefined();
      expect(context.systemPrompts.length).toBeGreaterThan(0);

      expect(context.totalTokens).toBeGreaterThan(0);
      expect(context.metadata).toBeDefined();
      expect(context.metadata.contextVersion).toBe('1.0');
    });

    it('should build context without concept', async () => {
      const context = await contextManager.buildContext(mockUserId, {
        conversationId: mockConversationId,
      });

      expect(context).toBeDefined();
      expect(context.userProfile).toBeDefined();
      expect(context.conceptContext).toBeUndefined();
      expect(context.conversationHistory).toBeDefined();
    });

    it('should handle missing user', async () => {
      (userService.getUserById as Mock).mockResolvedValue(null);

      await expect(contextManager.buildContext('non-existent-user'))
        .rejects.toThrow('User not found');
    });

    it('should apply compression when needed', async () => {
      const context = await contextManager.buildContext(mockUserId, {
        conceptId: mockConceptId,
        conversationId: mockConversationId,
        maxTokens: 100, // Very low limit to force compression
        compressionLevel: 2,
      });

      expect(context).toBeDefined();
      expect(context.totalTokens).toBeLessThanOrEqual(100);
      expect(context.metadata.compressionLevel).toBe(2);
    });
  });

  describe('storeConversationContext', () => {
    beforeEach(async () => {
      await db.insert(users).values(mockUser);
      await db.insert(conversations).values({
        id: mockConversationId,
        userId: mockUserId,
        title: 'Test Conversation',
        context: 'general',
        messageCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });
    });

    it('should store conversation context as embeddings', async () => {
      await contextManager.storeConversationContext(
        mockConversationId,
        mockMessages,
        mockConceptId
      );

      expect(contextEmbeddingService.batchStoreContexts).toHaveBeenCalled();
      const callArgs = (contextEmbeddingService.batchStoreContexts as Mock).mock.calls[0][0];
      expect(callArgs).toBeInstanceOf(Array);
      expect(callArgs.length).toBeGreaterThan(0);
      expect(callArgs[0].userId).toBe(mockUserId);
      expect(callArgs[0].metadata.type).toBe('conversation');
    });

    it('should handle non-existent conversation', async () => {
      await expect(contextManager.storeConversationContext(
        'non-existent-conversation',
        mockMessages
      )).rejects.toThrow('Conversation not found');
    });

    it('should handle conversation without user', async () => {
      await db.insert(conversations).values({
        id: 'no-user-conv',
        userId: null,
        title: 'No User Conversation',
        context: 'general',
        messageCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });

      await expect(contextManager.storeConversationContext(
        'no-user-conv',
        mockMessages
      )).rejects.toThrow('Conversation has no associated user');
    });
  });

  describe('retrieveRelevantContext', () => {
    it('should retrieve relevant context using semantic search', async () => {
      const query = 'JavaScript functions';
      
      const result = await contextManager.retrieveRelevantContext(
        query,
        mockUserId,
        {
          conceptId: mockConceptId,
          limit: 5,
          threshold: 0.7,
        }
      );

      expect(contextEmbeddingService.searchSimilarContexts).toHaveBeenCalledWith(
        query,
        {
          userId: mockUserId,
          conceptId: mockConceptId,
          conversationId: undefined,
          limit: 5,
          threshold: 0.7,
        }
      );

      expect(result).toEqual(mockContextChunks);
    });

    it('should use default options', async () => {
      await contextManager.retrieveRelevantContext('test query', mockUserId);

      expect(contextEmbeddingService.searchSimilarContexts).toHaveBeenCalledWith(
        'test query',
        {
          userId: mockUserId,
          conceptId: undefined,
          conversationId: undefined,
          limit: 10,
          threshold: 0.7,
        }
      );
    });
  });

  describe('compressContext', () => {
    const mockFullContext = {
      userProfile: {
        id: mockUserId,
        name: 'Test User',
        experienceLevel: 'mid',
        preferences: {
          difficultyPreference: 'medium',
          hoursPerWeek: 10,
        },
      },
      learningHistory: Array(10).fill(null).map((_, i) => ({
        id: `session-${i}`,
        startTime: new Date(),
        duration: 30,
        topics: ['topic'],
        achievements: [],
        challenges: [],
      })),
      conceptContext: {
        concept: mockConcept,
        progress: {
          completionPercentage: 65.5,
          timeSpent: 15.5,
        },
        customPrompts: [],
        relatedConcepts: [],
      },
      conversationHistory: Array(20).fill(null).map((_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Message ${i}`,
      })),
      relevantKnowledge: Array(10).fill(null).map((_, i) => ({
        ...mockContextChunks[0],
        id: `chunk-${i}`,
      })),
      systemPrompts: ['System prompt 1', 'System prompt 2'],
    };

    it('should compress context at level 1', async () => {
      const compressed = await contextManager.compressContext(
        mockFullContext,
        5000,
        1
      );

      expect(compressed.conversationHistory.length).toBeLessThanOrEqual(10);
      expect(compressed.learningHistory.length).toBe(10); // Should not be affected at level 1
      expect(compressed.relevantKnowledge.length).toBe(10); // Should not be affected at level 1
    });

    it('should compress context at level 2', async () => {
      const compressed = await contextManager.compressContext(
        mockFullContext,
        5000,
        2
      );

      expect(compressed.conversationHistory.length).toBeLessThanOrEqual(10);
      expect(compressed.relevantKnowledge.length).toBeLessThanOrEqual(5);
      expect(compressed.learningHistory.length).toBe(10); // Should not be affected at level 2
    });

    it('should compress context at level 3', async () => {
      const compressed = await contextManager.compressContext(
        mockFullContext,
        5000,
        3
      );

      expect(compressed.conversationHistory.length).toBeLessThanOrEqual(10);
      expect(compressed.relevantKnowledge.length).toBeLessThanOrEqual(5);
      expect(compressed.learningHistory.length).toBeLessThanOrEqual(5);
    });

    it('should summarize conversation history at level 4', async () => {
      const compressed = await contextManager.compressContext(
        mockFullContext,
        5000,
        4
      );

      expect(compressed.conversationHistory.length).toBeLessThanOrEqual(10);
      // Should contain summary message
      const hasSummary = compressed.conversationHistory.some(msg => 
        msg.content.includes('[Summary of')
      );
      expect(hasSummary).toBe(true);
    });
  });

  describe('generateContextSummary', () => {
    beforeEach(async () => {
      await db.insert(users).values(mockUser);
      await db.insert(conversations).values({
        id: mockConversationId,
        userId: mockUserId,
        title: 'Test Conversation',
        context: 'general',
        messageCount: 2,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });
      await db.insert(messages).values(mockMessages);
    });

    it('should generate conversation summary', async () => {
      const summary = await contextManager.generateContextSummary(mockConversationId);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('questions');
      expect(summary).toContain('responses');
    });

    it('should handle empty conversation', async () => {
      await db.insert(conversations).values({
        id: 'empty-conv',
        userId: mockUserId,
        title: 'Empty Conversation',
        context: 'general',
        messageCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });

      const summary = await contextManager.generateContextSummary('empty-conv');
      expect(summary).toBe('Empty conversation');
    });
  });

  describe('switchConceptContext', () => {
    beforeEach(async () => {
      await db.insert(users).values(mockUser);
      await db.insert(learningConcepts).values(mockConcept);
      await db.insert(conversations).values({
        id: mockConversationId,
        userId: mockUserId,
        title: 'Test Conversation',
        context: 'general',
        conceptId: 'old-concept',
        messageCount: 2,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });
      await db.insert(messages).values(mockMessages);
    });

    it('should switch concept context', async () => {
      const newContext = await contextManager.switchConceptContext(
        mockUserId,
        'old-concept',
        mockConceptId,
        mockConversationId
      );

      expect(newContext).toBeDefined();
      expect(newContext.conceptContext?.concept.id).toBe(mockConceptId);
      expect(contextEmbeddingService.batchStoreContexts).toHaveBeenCalled();
    });

    it('should handle switching without previous concept', async () => {
      const newContext = await contextManager.switchConceptContext(
        mockUserId,
        undefined,
        mockConceptId,
        mockConversationId
      );

      expect(newContext).toBeDefined();
      expect(newContext.conceptContext?.concept.id).toBe(mockConceptId);
      // Should not store previous context if no previous concept
      expect(contextEmbeddingService.batchStoreContexts).not.toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    it('should estimate token count correctly', async () => {
      const manager = new ContextManager();
      const estimateTokens = (manager as any).estimateTokenCount.bind(manager);

      const context = {
        userProfile: { id: 'test', name: 'Test User' },
        conversationHistory: [
          { content: 'Hello world' },
          { content: 'How are you?' },
        ],
        systemPrompts: ['You are a helpful assistant'],
        relevantKnowledge: [
          { content: 'Some relevant information' },
        ],
      };

      const tokens = estimateTokens(context);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should summarize conversation history correctly', async () => {
      const manager = new ContextManager();
      const summarizeHistory = (manager as any).summarizeConversationHistory.bind(manager);

      const longHistory = Array(10).fill(null).map((_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));

      const summarized = await summarizeHistory(longHistory);
      expect(summarized.length).toBeLessThan(longHistory.length);
      expect(summarized.some(msg => msg.content.includes('[Summary of'))).toBe(true);
    });

    it('should not summarize short conversation history', async () => {
      const manager = new ContextManager();
      const summarizeHistory = (manager as any).summarizeConversationHistory.bind(manager);

      const shortHistory = mockMessages.slice(0, 3);
      const result = await summarizeHistory(shortHistory);
      expect(result).toEqual(shortHistory);
    });
  });

  describe('error handling', () => {
    it('should handle context building errors', async () => {
      (userService.getUserById as Mock).mockRejectedValue(new Error('Database error'));

      await expect(contextManager.buildContext(mockUserId))
        .rejects.toThrow('Context building failed');
    });

    it('should handle context storage errors', async () => {
      (contextEmbeddingService.batchStoreContexts as Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await db.insert(users).values(mockUser);
      await db.insert(conversations).values({
        id: mockConversationId,
        userId: mockUserId,
        title: 'Test Conversation',
        context: 'general',
        messageCount: 0,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      });

      await expect(contextManager.storeConversationContext(
        mockConversationId,
        mockMessages
      )).rejects.toThrow('Conversation context storage failed');
    });

    it('should handle context retrieval errors', async () => {
      (contextEmbeddingService.searchSimilarContexts as Mock).mockRejectedValue(
        new Error('Search error')
      );

      await expect(contextManager.retrieveRelevantContext('test', mockUserId))
        .rejects.toThrow('Context retrieval failed');
    });
  });
});
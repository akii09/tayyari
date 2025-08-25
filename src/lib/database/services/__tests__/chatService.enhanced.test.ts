/**
 * Enhanced Chat Service Tests
 * Tests for multi-concept support, AI provider integration, and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatService } from '../chatService';
import { userService } from '../userService';
import { LearningConceptService } from '../learningConceptService';
import { contextManager } from '../contextManager';
import { aiProviderRouter } from '../../../ai/services/AIProviderRouter';
import { aiRequestService } from '../../../ai/services/AIRequestService';
import { db } from '../../config';
import { conversations, messages, learningConcepts } from '../../schema';
import { eq } from 'drizzle-orm';

// Mock external dependencies
vi.mock('../contextManager');
vi.mock('../../../ai/services/AIProviderRouter');
vi.mock('../../../ai/services/AIRequestService');

describe('Enhanced ChatService', () => {
  let testUserId: string;
  let testConceptId: string;
  let testConversationId: string;

  beforeEach(async () => {
    // Create test user
    const user = await userService.createUser({
      name: 'Test User',
      email: 'test@example.com',
      role: 'Software Engineer',
      experienceLevel: 'mid',
      hoursPerWeek: 10,
    });
    testUserId = user.id;

    // Create test concept
    const concept = await learningConceptService.createConcept({
      userId: testUserId,
      name: 'Data Structures',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 40,
    });
    testConceptId = concept.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(conversations).where(eq(conversations.userId, testUserId));
    await db.delete(learningConcepts).where(eq(learningConcepts.userId, testUserId));
    await userService.deleteUser(testUserId);
  });

  describe('createConversation', () => {
    it('should create conversation with concept support', async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Test Concept Chat',
        context: 'dsa',
        conceptId: testConceptId,
        aiProvider: 'openai',
      });

      expect(conversation.id).toBeDefined();
      expect(conversation.title).toBe('Test Concept Chat');
      expect(conversation.conceptId).toBe(testConceptId);
      expect(conversation.aiProvider).toBe('openai');
      expect(conversation.concept).toBeDefined();
      expect(conversation.concept?.name).toBe('Data Structures');
    });

    it('should create conversation without concept', async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'General Chat',
        context: 'general',
      });

      expect(conversation.id).toBeDefined();
      expect(conversation.conceptId).toBeNull();
      expect(conversation.concept).toBeUndefined();
    });
  });

  describe('getConversationWithMessages', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Add some test messages
      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: 'What is a binary tree?',
        conceptId: testConceptId,
      });

      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'A binary tree is a hierarchical data structure...',
        tokens: 50,
        model: 'gpt-4',
        conceptId: testConceptId,
        cost: 0.001,
        processingTime: 1500,
      });
    });

    it('should return conversation with enhanced message information', async () => {
      const result = await ChatService.getConversationWithMessages(testConversationId);

      expect(result).toBeDefined();
      expect(result!.conversation.concept).toBeDefined();
      expect(result!.conversation.concept!.name).toBe('Data Structures');
      expect(result!.conversation.providerStats).toBeDefined();
      
      expect(result!.messages).toHaveLength(2);
      expect(result!.messages[1].providerInfo).toBeDefined();
      expect(result!.messages[1].providerInfo!.model).toBe('gpt-4');
      expect(result!.messages[1].providerInfo!.cost).toBe(0.001);
    });
  });

  describe('getUserConversations', () => {
    beforeEach(async () => {
      // Create conversations with and without concepts
      await ChatService.createConversation({
        userId: testUserId,
        title: 'Concept Chat 1',
        conceptId: testConceptId,
      });

      await ChatService.createConversation({
        userId: testUserId,
        title: 'General Chat',
        context: 'general',
      });

      await ChatService.createConversation({
        userId: testUserId,
        title: 'Concept Chat 2',
        conceptId: testConceptId,
      });
    });

    it('should return all conversations with concept information', async () => {
      const conversations = await ChatService.getUserConversations(testUserId, {
        limit: 10,
        includeStats: true,
      });

      expect(conversations).toHaveLength(3);
      
      const conceptChats = conversations.filter(c => c.conceptId === testConceptId);
      expect(conceptChats).toHaveLength(2);
      
      conceptChats.forEach(chat => {
        expect(chat.concept).toBeDefined();
        expect(chat.concept!.name).toBe('Data Structures');
        expect(chat.providerStats).toBeDefined();
      });
    });

    it('should filter conversations by concept', async () => {
      const conversations = await ChatService.getUserConversations(testUserId, {
        conceptId: testConceptId,
        limit: 10,
      });

      expect(conversations).toHaveLength(2);
      conversations.forEach(chat => {
        expect(chat.conceptId).toBe(testConceptId);
        expect(chat.concept!.name).toBe('Data Structures');
      });
    });
  });

  describe('generateAIResponse', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'AI Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Mock context manager
      vi.mocked(contextManager.buildContext).mockResolvedValue({
        userProfile: {
          id: testUserId,
          name: 'Test User',
          experienceLevel: 'mid',
          preferences: {
            difficultyPreference: 'medium',
            hoursPerWeek: 10,
          },
        },
        learningHistory: [],
        conversationHistory: [],
        relevantKnowledge: [],
        systemPrompts: ['You are an AI tutor.'],
        totalTokens: 100,
        metadata: {
          contextVersion: '1.0',
          buildTime: new Date(),
          compressionLevel: 0,
        },
      });

      // Mock AI provider router
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
          content: 'This is a test AI response about binary trees.',
          provider: 'openai',
          model: 'gpt-4',
          tokens: {
            prompt: 50,
            completion: 30,
            total: 80,
          },
          cost: 0.002,
          processingTime: 1200,
        },
        attempts: 1,
        fallbacksUsed: [],
      });

      // Mock context storage
      vi.mocked(contextManager.storeConversationContext).mockResolvedValue();
    });

    it('should generate AI response with context awareness', async () => {
      const result = await ChatService.generateAIResponse(
        testConversationId,
        'What is a binary tree?',
        {
          conceptId: testConceptId,
          preferredProvider: 'openai',
          maxTokens: 2000,
          temperature: 0.7,
        }
      );

      expect(result.response).toBeDefined();
      expect(result.response.content).toBe('This is a test AI response about binary trees.');
      expect(result.response.providerInfo).toBeDefined();
      expect(result.response.providerInfo!.provider).toBe('openai');
      expect(result.response.providerInfo!.model).toBe('gpt-4');
      expect(result.response.providerInfo!.cost).toBe(0.002);

      expect(result.contextInfo).toBeDefined();
      expect(result.contextInfo.tokensUsed).toBe(100);
      expect(result.contextInfo.relevantChunks).toBe(0);

      // Verify context manager was called
      expect(contextManager.buildContext).toHaveBeenCalledWith(testUserId, {
        conceptId: testConceptId,
        conversationId: testConversationId,
        maxTokens: 8000,
        includeHistory: true,
        historyLimit: 20,
      });

      // Verify AI router was called
      expect(aiProviderRouter.route).toHaveBeenCalled();

      // Verify context storage was called
      expect(contextManager.storeConversationContext).toHaveBeenCalled();
    });
  });

  describe('switchConversationConcept', () => {
    let secondConceptId: string;

    beforeEach(async () => {
      // Create second concept
      const concept2 = await learningConceptService.createConcept({
        userId: testUserId,
        name: 'Algorithms',
        category: 'programming',
        difficulty: 'advanced',
        estimatedHours: 60,
      });
      secondConceptId = concept2.id;

      // Create conversation with first concept
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Switch Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Mock context manager switch
      vi.mocked(contextManager.switchConceptContext).mockResolvedValue({
        userProfile: {
          id: testUserId,
          name: 'Test User',
          experienceLevel: 'mid',
          preferences: {
            difficultyPreference: 'medium',
            hoursPerWeek: 10,
          },
        },
        learningHistory: [],
        conversationHistory: [],
        relevantKnowledge: [],
        systemPrompts: ['You are an AI tutor for algorithms.'],
        totalTokens: 120,
        metadata: {
          contextVersion: '1.0',
          buildTime: new Date(),
          compressionLevel: 0,
        },
      });
    });

    it('should switch conversation concept successfully', async () => {
      const updatedConversation = await ChatService.switchConversationConcept(
        testConversationId,
        secondConceptId,
        testUserId
      );

      expect(updatedConversation.conceptId).toBe(secondConceptId);
      expect(updatedConversation.concept).toBeDefined();
      expect(updatedConversation.concept!.name).toBe('Algorithms');

      // Verify context manager was called
      expect(contextManager.switchConceptContext).toHaveBeenCalledWith(
        testUserId,
        testConceptId,
        secondConceptId,
        testConversationId
      );
    });
  });

  describe('getConversationAnalytics', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Analytics Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Add messages for analytics
      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: 'Question 1',
      });

      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Answer 1',
        tokens: 50,
        model: 'gpt-4',
        cost: 0.001,
        processingTime: 1000,
        feedback: 'positive',
      });

      // Mock AI request service
      vi.mocked(aiRequestService.getRequestLogs).mockResolvedValue([
        {
          id: 'log1',
          userId: testUserId,
          conversationId: testConversationId,
          conceptId: testConceptId,
          provider: 'openai',
          model: 'gpt-4',
          promptTokens: 30,
          completionTokens: 20,
          totalTokens: 50,
          cost: 0.001,
          responseTime: 1000,
          success: true,
          errorMessage: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    it('should return comprehensive conversation analytics', async () => {
      const analytics = await ChatService.getConversationAnalytics(testConversationId);

      expect(analytics).toBeDefined();
      expect(analytics.messageCount).toBe(2);
      expect(analytics.userMessages).toBe(1);
      expect(analytics.assistantMessages).toBe(1);
      expect(analytics.totalCost).toBe(0.001);
      expect(analytics.totalTokens).toBe(50);
      expect(analytics.averageResponseTime).toBe(1000);

      expect(analytics.providerBreakdown).toBeDefined();
      expect(analytics.providerBreakdown.openai).toBeDefined();
      expect(analytics.providerBreakdown.openai.requests).toBe(1);
      expect(analytics.providerBreakdown.openai.cost).toBe(0.001);

      expect(analytics.conceptEngagement).toBeDefined();
      expect(analytics.conceptEngagement!.progressMade).toBeGreaterThan(0);
    });
  });

  describe('searchMessages', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Search Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Add searchable messages
      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: 'What is a binary tree algorithm?',
        conceptId: testConceptId,
      });

      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'A binary tree algorithm is used for searching and sorting...',
        conceptId: testConceptId,
        tokens: 60,
        model: 'gpt-4',
        cost: 0.0015,
      });
    });

    it('should search messages with concept filtering', async () => {
      const results = await ChatService.searchMessages(testUserId, 'binary tree', {
        conceptId: testConceptId,
        limit: 10,
      });

      expect(results).toHaveLength(2);
      results.forEach(msg => {
        expect(msg.content.toLowerCase()).toContain('binary tree');
        expect(msg.conceptId).toBe(testConceptId);
      });

      // Check enhanced message information
      const assistantMessage = results.find(m => m.role === 'assistant');
      expect(assistantMessage?.providerInfo).toBeDefined();
      expect(assistantMessage?.providerInfo?.model).toBe('gpt-4');
    });

    it('should search messages across all concepts when no filter', async () => {
      const results = await ChatService.searchMessages(testUserId, 'algorithm', {
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(msg => {
        expect(msg.content.toLowerCase()).toContain('algorithm');
      });
    });
  });

  describe('getConversationsByConcept', () => {
    beforeEach(async () => {
      // Create multiple conversations for the concept
      await ChatService.createConversation({
        userId: testUserId,
        title: 'Concept Chat 1',
        conceptId: testConceptId,
      });

      await ChatService.createConversation({
        userId: testUserId,
        title: 'Concept Chat 2',
        conceptId: testConceptId,
      });

      // Create conversation for different concept (should not be included)
      const otherConcept = await learningConceptService.createConcept({
        userId: testUserId,
        name: 'Other Concept',
        category: 'math',
        difficulty: 'beginner',
        estimatedHours: 20,
      });

      await ChatService.createConversation({
        userId: testUserId,
        title: 'Other Concept Chat',
        conceptId: otherConcept.id,
      });
    });

    it('should return only conversations for specified concept', async () => {
      const conversations = await ChatService.getConversationsByConcept(
        testUserId,
        testConceptId,
        10
      );

      expect(conversations).toHaveLength(2);
      conversations.forEach(conv => {
        expect(conv.conceptId).toBe(testConceptId);
        expect(conv.concept!.name).toBe('Data Structures');
        expect(conv.providerStats).toBeDefined();
      });
    });
  });
});
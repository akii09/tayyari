/**
 * Enhanced Chat API Integration Tests
 * Tests for concept-aware chat endpoints and AI provider integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConversations, POST as createConversation } from '../conversations/route';
import { GET as getConversation, PUT as updateConversation } from '../conversations/[id]/route';
import { POST as addMessage } from '../messages/route';
import { GET as searchMessages } from '../search/route';
import { GET as getConceptConversations } from '../concepts/[conceptId]/route';
import { GET as getAnalytics } from '../analytics/route';
import { userService } from '@/lib/database/services/userService';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';
import { ChatService } from '@/lib/database/services/chatService';
import { contextManager } from '@/lib/database/services/contextManager';
import { aiProviderRouter } from '@/lib/ai/services/AIProviderRouter';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

// Mock authentication
vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  }),
}));

// Mock external services
vi.mock('@/lib/database/services/contextManager');
vi.mock('@/lib/ai/services/AIProviderRouter');
vi.mock('@/lib/ai/services/AIRequestService');

describe('Enhanced Chat API Integration', () => {
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

    // Update mock to return this user
    vi.mocked(require('@/lib/auth/session').requireAuth).mockResolvedValue({
      id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
    });

    // Create test concept
    const concept = await learningConceptService.createConcept({
      userId: testUserId,
      name: 'Data Structures',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 40,
    });
    testConceptId = concept.id;

    // Setup mocks
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

    vi.mocked(contextManager.storeConversationContext).mockResolvedValue();
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
      systemPrompts: ['You are an AI tutor.'],
      totalTokens: 100,
      metadata: {
        contextVersion: '1.0',
        buildTime: new Date(),
        compressionLevel: 0,
      },
    });

    vi.mocked(aiRequestService.getRequestLogs).mockResolvedValue([]);
    vi.mocked(aiRequestService.getRequestAnalytics).mockResolvedValue({
      totalRequests: 10,
      successfulRequests: 9,
      failedRequests: 1,
      totalCost: 0.05,
      totalTokens: 1000,
      averageResponseTime: 1500,
      providerBreakdown: {
        openai: {
          requests: 8,
          cost: 0.04,
          successRate: 1.0,
          averageResponseTime: 1400,
        },
        claude: {
          requests: 2,
          cost: 0.01,
          successRate: 0.5,
          averageResponseTime: 1800,
        },
      },
      modelBreakdown: {
        'gpt-4': {
          requests: 8,
          cost: 0.04,
          successRate: 1.0,
        },
        'claude-3': {
          requests: 2,
          cost: 0.01,
          successRate: 0.5,
        },
      },
      dailyUsage: [
        {
          date: '2024-01-01',
          requests: 5,
          cost: 0.025,
          tokens: 500,
        },
        {
          date: '2024-01-02',
          requests: 5,
          cost: 0.025,
          tokens: 500,
        },
      ],
    });

    vi.mocked(aiRequestService.getUserUsageStats).mockResolvedValue({
      totalRequests: 10,
      totalCost: 0.05,
      totalTokens: 1000,
      averageRequestsPerDay: 0.33,
      averageCostPerDay: 0.0017,
      favoriteProvider: 'openai',
      favoriteModel: 'gpt-4',
    });

    vi.mocked(aiRequestService.getCostAlerts).mockResolvedValue([]);
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await userService.deleteUser(testUserId);
    }
    vi.clearAllMocks();
  });

  describe('POST /api/chat/conversations', () => {
    it('should create conversation with concept support', async () => {
      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Concept Chat',
          context: 'dsa',
          conceptId: testConceptId,
          aiProvider: 'openai',
        }),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conversation.title).toBe('Test Concept Chat');
      expect(data.conversation.conceptId).toBe(testConceptId);
      expect(data.conversation.concept).toBeDefined();
      expect(data.conversation.concept.name).toBe('Data Structures');
      expect(data.conversation.aiProvider).toBe('openai');

      testConversationId = data.conversation.id;
    });

    it('should create conversation without concept', async () => {
      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'General Chat',
          context: 'general',
        }),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conversation.conceptId).toBeNull();
      expect(data.conversation.concept).toBeNull();
    });

    it('should reject invalid concept ID', async () => {
      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Invalid Concept Chat',
          conceptId: 'invalid-concept-id',
        }),
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid concept ID');
    });
  });

  describe('GET /api/chat/conversations', () => {
    beforeEach(async () => {
      // Create test conversations
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
    });

    it('should return conversations with concept information', async () => {
      const request = new NextRequest('http://localhost/api/chat/conversations?includeStats=true');

      const response = await getConversations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conversations).toHaveLength(2);

      const conceptChat = data.conversations.find((c: any) => c.conceptId === testConceptId);
      expect(conceptChat).toBeDefined();
      expect(conceptChat.concept).toBeDefined();
      expect(conceptChat.concept.name).toBe('Data Structures');
      expect(conceptChat.providerStats).toBeDefined();
    });

    it('should filter conversations by concept', async () => {
      const request = new NextRequest(`http://localhost/api/chat/conversations?conceptId=${testConceptId}`);

      const response = await getConversations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversations).toHaveLength(1);
      expect(data.conversations[0].conceptId).toBe(testConceptId);
    });
  });

  describe('GET /api/chat/conversations/[id]', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;

      // Add test messages
      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'user',
        content: 'What is a binary tree?',
        conceptId: testConceptId,
      });

      await ChatService.addMessage({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'A binary tree is...',
        tokens: 50,
        model: 'gpt-4',
        conceptId: testConceptId,
        cost: 0.001,
        processingTime: 1500,
      });
    });

    it('should return conversation with enhanced message information', async () => {
      const request = new NextRequest(`http://localhost/api/chat/conversations/${testConversationId}`);

      const response = await getConversation(request, {
        params: Promise.resolve({ id: testConversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conversation.concept).toBeDefined();
      expect(data.conversation.concept.name).toBe('Data Structures');
      expect(data.conversation.providerStats).toBeDefined();

      expect(data.messages).toHaveLength(2);
      const aiMessage = data.messages.find((m: any) => m.role === 'assistant');
      expect(aiMessage.providerInfo).toBeDefined();
      expect(aiMessage.cost).toBe(0.001);
      expect(aiMessage.processingTime).toBe(1500);
    });
  });

  describe('PUT /api/chat/conversations/[id] - switch concept', () => {
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

      // Create conversation
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Switch Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;
    });

    it('should switch conversation concept', async () => {
      const request = new NextRequest(`http://localhost/api/chat/conversations/${testConversationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'switch_concept',
          conceptId: secondConceptId,
        }),
      });

      const response = await updateConversation(request, {
        params: Promise.resolve({ id: testConversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conversation.conceptId).toBe(secondConceptId);
      expect(data.conversation.concept.name).toBe('Algorithms');

      // Verify context manager was called
      expect(contextManager.switchConceptContext).toHaveBeenCalledWith(
        testUserId,
        testConceptId,
        secondConceptId,
        testConversationId
      );
    });
  });

  describe('PUT /api/chat/conversations/[id] - get analytics', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'Analytics Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;
    });

    it('should return conversation analytics', async () => {
      const request = new NextRequest(`http://localhost/api/chat/conversations/${testConversationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'get_analytics',
        }),
      });

      const response = await updateConversation(request, {
        params: Promise.resolve({ id: testConversationId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.messageCount).toBeDefined();
      expect(data.analytics.providerBreakdown).toBeDefined();
    });
  });

  describe('POST /api/chat/messages - AI-powered messaging', () => {
    beforeEach(async () => {
      const conversation = await ChatService.createConversation({
        userId: testUserId,
        title: 'AI Test Chat',
        conceptId: testConceptId,
      });
      testConversationId = conversation.id;
    });

    it('should generate AI response with context awareness', async () => {
      const request = new NextRequest('http://localhost/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: testConversationId,
          content: 'What is a binary tree?',
          conceptId: testConceptId,
          preferredProvider: 'openai',
          maxTokens: 2000,
          temperature: 0.7,
        }),
      });

      const response = await addMessage(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messages).toHaveLength(2);

      const userMessage = data.messages[0];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('What is a binary tree?');
      expect(userMessage.conceptId).toBe(testConceptId);

      const aiMessage = data.messages[1];
      expect(aiMessage.role).toBe('assistant');
      expect(aiMessage.content).toBe('This is a test AI response.');
      expect(aiMessage.providerInfo).toBeDefined();
      expect(aiMessage.providerInfo.provider).toBe('openai');
      expect(aiMessage.providerInfo.model).toBe('gpt-4');
      expect(aiMessage.contextInfo).toBeDefined();

      expect(data.contextInfo).toBeDefined();
      expect(data.contextInfo.tokensUsed).toBe(100);

      // Verify AI services were called
      expect(contextManager.buildContext).toHaveBeenCalled();
      expect(aiProviderRouter.route).toHaveBeenCalled();
      expect(contextManager.storeConversationContext).toHaveBeenCalled();
    });
  });

  describe('GET /api/chat/search', () => {
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
        content: 'A binary tree algorithm is used for searching...',
        conceptId: testConceptId,
        tokens: 60,
        model: 'gpt-4',
        cost: 0.0015,
      });
    });

    it('should search messages with concept filtering', async () => {
      const request = new NextRequest(`http://localhost/api/chat/search?query=binary tree&conceptId=${testConceptId}&limit=10`);

      const response = await searchMessages(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.query).toBe('binary tree');
      expect(data.results).toHaveLength(2);

      data.results.forEach((msg: any) => {
        expect(msg.content.toLowerCase()).toContain('binary tree');
        expect(msg.conceptId).toBe(testConceptId);
      });

      const assistantMessage = data.results.find((m: any) => m.role === 'assistant');
      expect(assistantMessage.providerInfo).toBeDefined();
      expect(assistantMessage.providerInfo.model).toBe('gpt-4');
    });

    it('should require search query', async () => {
      const request = new NextRequest('http://localhost/api/chat/search');

      const response = await searchMessages(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Search query is required');
    });
  });

  describe('GET /api/chat/concepts/[conceptId]', () => {
    beforeEach(async () => {
      // Create conversations for the concept
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
    });

    it('should return conversations for specific concept', async () => {
      const request = new NextRequest(`http://localhost/api/chat/concepts/${testConceptId}?limit=20`);

      const response = await getConceptConversations(request, {
        params: Promise.resolve({ conceptId: testConceptId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.concept).toBeDefined();
      expect(data.concept.name).toBe('Data Structures');
      expect(data.conversations).toHaveLength(2);

      data.conversations.forEach((conv: any) => {
        expect(conv.title).toMatch(/Concept Chat/);
        expect(conv.providerStats).toBeDefined();
      });
    });

    it('should reject invalid concept ID', async () => {
      const request = new NextRequest('http://localhost/api/chat/concepts/invalid-id');

      const response = await getConceptConversations(request, {
        params: Promise.resolve({ conceptId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Concept not found');
    });
  });

  describe('GET /api/chat/analytics', () => {
    it('should return comprehensive chat analytics', async () => {
      const request = new NextRequest('http://localhost/api/chat/analytics?days=30');

      const response = await getAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.period).toBeDefined();
      expect(data.period.days).toBe(30);

      expect(data.analytics).toBeDefined();
      expect(data.analytics.totalRequests).toBe(10);
      expect(data.analytics.totalCost).toBe(0.05);
      expect(data.analytics.providerBreakdown).toBeDefined();
      expect(data.analytics.providerBreakdown.openai).toBeDefined();
      expect(data.analytics.dailyUsage).toHaveLength(2);

      expect(data.usageStats).toBeDefined();
      expect(data.usageStats.favoriteProvider).toBe('openai');
      expect(data.usageStats.favoriteModel).toBe('gpt-4');

      expect(data.costAlerts).toBeDefined();
      expect(Array.isArray(data.costAlerts)).toBe(true);

      // Verify AI request service was called
      expect(aiRequestService.getRequestAnalytics).toHaveBeenCalledWith({
        userId: testUserId,
        startDate: expect.any(Date),
        provider: undefined,
      });
      expect(aiRequestService.getUserUsageStats).toHaveBeenCalledWith(testUserId, 30);
      expect(aiRequestService.getCostAlerts).toHaveBeenCalled();
    });

    it('should support provider filtering', async () => {
      const request = new NextRequest('http://localhost/api/chat/analytics?provider=openai&days=7');

      const response = await getAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period.days).toBe(7);

      // Verify provider filter was passed
      expect(aiRequestService.getRequestAnalytics).toHaveBeenCalledWith({
        userId: testUserId,
        startDate: expect.any(Date),
        provider: 'openai',
      });
    });
  });
});
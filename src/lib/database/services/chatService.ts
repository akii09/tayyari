import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config';
import { 
  conversations, 
  messages, 
  learningConcepts,
  aiRequestLogs,
  type Conversation, 
  type NewConversation, 
  type Message, 
  type NewMessage,
  type LearningConcept 
} from '../schema';
import { contextManager } from './contextManager';
import { aiProviderRouter } from '../../ai/services/AIProviderRouter';
import { aiRequestService } from '../../ai/services/AIRequestService';
import type { AIRequest, AIResponse } from '../../ai/types';

export interface ConceptAwareConversation extends Conversation {
  concept?: LearningConcept;
  providerStats?: {
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    primaryProvider: string;
  };
}

export interface EnhancedMessage extends Message {
  providerInfo?: {
    provider: string;
    model: string;
    cost?: number;
    processingTime?: number;
  };
  contextInfo?: {
    relevantChunks: number;
    contextTokens: number;
    compressionLevel: number;
  };
}

export interface ConversationAnalytics {
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  totalCost: number;
  totalTokens: number;
  averageResponseTime: number;
  providerBreakdown: Record<string, {
    requests: number;
    cost: number;
    averageResponseTime: number;
  }>;
  conceptEngagement?: {
    timeSpent: number;
    topicsDiscussed: string[];
    progressMade: number;
  };
}

export class ChatService {
  // Create a new conversation with concept support
  static async createConversation(conversationData: NewConversation): Promise<ConceptAwareConversation> {
    try {
      const [newConversation] = await db.insert(conversations).values({
        ...conversationData,
        title: conversationData.title || 'New Chat',
      }).returning();

      // If concept is specified, fetch concept details
      let concept: LearningConcept | undefined;
      if (newConversation.conceptId) {
        const conceptResult = await db
          .select()
          .from(learningConcepts)
          .where(eq(learningConcepts.id, newConversation.conceptId))
          .limit(1);
        
        if (conceptResult.length > 0) {
          concept = conceptResult[0];
        }
      }

      console.log(`✅ Conversation created: ${newConversation.id}${concept ? ` for concept: ${concept.name}` : ''}`);
      
      return {
        ...newConversation,
        concept,
      };
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get conversation by ID with messages and enhanced context
  static async getConversationWithMessages(conversationId: string): Promise<{
    conversation: ConceptAwareConversation;
    messages: EnhancedMessage[];
  } | null> {
    try {
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) return null;

      const conv = conversation[0];

      // Get concept details if associated
      let concept: LearningConcept | undefined;
      if (conv.conceptId) {
        const conceptResult = await db
          .select()
          .from(learningConcepts)
          .where(eq(learningConcepts.id, conv.conceptId))
          .limit(1);
        
        if (conceptResult.length > 0) {
          concept = conceptResult[0];
        }
      }

      // Get provider statistics for this conversation
      const providerStats = await this.getConversationProviderStats(conversationId);

      // Get messages with enhanced information
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // Enhance messages with provider and context information
      const enhancedMessages: EnhancedMessage[] = conversationMessages.map(msg => ({
        ...msg,
        providerInfo: msg.cost || msg.processingTime ? {
          provider: 'unknown', // Would be populated from AI request logs
          model: msg.model || 'unknown',
          cost: msg.cost || undefined,
          processingTime: msg.processingTime || undefined,
        } : undefined,
        contextInfo: msg.contextUsed ? JSON.parse(msg.contextUsed) : undefined,
      }));

      return {
        conversation: {
          ...conv,
          concept,
          providerStats,
        },
        messages: enhancedMessages,
      };
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      return null;
    }
  }

  // Get user's conversations with concept information
  static async getUserConversations(
    userId: string, 
    options: {
      limit?: number;
      conceptId?: string;
      includeStats?: boolean;
    } = {}
  ): Promise<ConceptAwareConversation[]> {
    try {
      const { limit = 20, conceptId, includeStats = false } = options;
      
      let query = db
        .select({
          conversation: conversations,
          concept: learningConcepts,
        })
        .from(conversations)
        .leftJoin(learningConcepts, eq(conversations.conceptId, learningConcepts.id))
        .where(
          and(
            eq(conversations.userId, userId),
            conceptId ? eq(conversations.conceptId, conceptId) : undefined
          )
        )
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit);

      const results = await query;

      const enhancedConversations: ConceptAwareConversation[] = [];

      for (const result of results) {
        const conversation: ConceptAwareConversation = {
          ...result.conversation,
          concept: result.concept || undefined,
        };

        // Add provider stats if requested
        if (includeStats) {
          conversation.providerStats = await this.getConversationProviderStats(result.conversation.id);
        }

        enhancedConversations.push(conversation);
      }

      return enhancedConversations;
    } catch (error) {
      console.error('❌ Error fetching user conversations:', error);
      return [];
    }
  }

  // Add message to conversation
  static async addMessage(messageData: NewMessage): Promise<Message> {
    try {
      const [newMessage] = await db.insert(messages).values(messageData).returning();

      // Update conversation metadata
      await db
        .update(conversations)
        .set({
          messageCount: sql`${conversations.messageCount} + 1`,
          lastMessageAt: sql`(datetime('now'))`,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(conversations.id, messageData.conversationId));

      return newMessage;
    } catch (error) {
      console.error('❌ Error adding message:', error);
      throw new Error('Failed to add message');
    }
  }

  // Update message feedback
  static async updateMessageFeedback(
    messageId: string, 
    feedback: 'positive' | 'negative', 
    feedbackNote?: string
  ): Promise<boolean> {
    try {
      await db
        .update(messages)
        .set({
          feedback,
          feedbackNote,
        })
        .where(eq(messages.id, messageId));

      console.log(`✅ Message feedback updated: ${messageId} - ${feedback}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating message feedback:', error);
      return false;
    }
  }

  // Update conversation title
  static async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      await db
        .update(conversations)
        .set({
          title,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(conversations.id, conversationId));

      return true;
    } catch (error) {
      console.error('❌ Error updating conversation title:', error);
      return false;
    }
  }

  // Delete conversation and all messages
  static async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      await db.delete(conversations).where(eq(conversations.id, conversationId));
      console.log(`✅ Conversation deleted: ${conversationId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      return false;
    }
  }

  // Get conversation statistics
  static async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    averageTokens: number;
    positiveFeedback: number;
    negativeFeedback: number;
  }> {
    try {
      const stats = await db
        .select({
          total: sql<number>`count(*)`,
          userCount: sql<number>`sum(case when ${messages.role} = 'user' then 1 else 0 end)`,
          assistantCount: sql<number>`sum(case when ${messages.role} = 'assistant' then 1 else 0 end)`,
          avgTokens: sql<number>`avg(${messages.tokens})`,
          positiveCount: sql<number>`sum(case when ${messages.feedback} = 'positive' then 1 else 0 end)`,
          negativeCount: sql<number>`sum(case when ${messages.feedback} = 'negative' then 1 else 0 end)`,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      const result = stats[0];
      return {
        messageCount: result.total || 0,
        userMessages: result.userCount || 0,
        assistantMessages: result.assistantCount || 0,
        averageTokens: Math.round(result.avgTokens || 0),
        positiveFeedback: result.positiveCount || 0,
        negativeFeedback: result.negativeCount || 0,
      };
    } catch (error) {
      console.error('❌ Error fetching conversation stats:', error);
      return {
        messageCount: 0,
        userMessages: 0,
        assistantMessages: 0,
        averageTokens: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
      };
    }
  }

  // Search messages in conversations with concept filtering
  static async searchMessages(
    userId: string, 
    query: string, 
    options: {
      limit?: number;
      conceptId?: string;
      conversationId?: string;
    } = {}
  ): Promise<EnhancedMessage[]> {
    try {
      const { limit = 10, conceptId, conversationId } = options;
      
      const results = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          role: messages.role,
          content: messages.content,
          attachments: messages.attachments,
          tokens: messages.tokens,
          model: messages.model,
          conceptId: messages.conceptId,
          contextUsed: messages.contextUsed,
          cost: messages.cost,
          processingTime: messages.processingTime,
          feedback: messages.feedback,
          feedbackNote: messages.feedbackNote,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(
          and(
            eq(conversations.userId, userId),
            sql`${messages.content} LIKE ${'%' + query + '%'}`,
            conceptId ? eq(messages.conceptId, conceptId) : undefined,
            conversationId ? eq(messages.conversationId, conversationId) : undefined
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return results.map(msg => ({
        ...msg,
        providerInfo: msg.cost || msg.processingTime ? {
          provider: 'unknown',
          model: msg.model || 'unknown',
          cost: msg.cost || undefined,
          processingTime: msg.processingTime || undefined,
        } : undefined,
        contextInfo: msg.contextUsed ? JSON.parse(msg.contextUsed) : undefined,
      }));
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      return [];
    }
  }

  // Generate AI response with context awareness
  static async generateAIResponse(
    conversationId: string,
    userMessage: string,
    options: {
      conceptId?: string;
      preferredProvider?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    response: EnhancedMessage;
    contextInfo: {
      tokensUsed: number;
      relevantChunks: number;
      compressionLevel: number;
    };
  }> {
    try {
      // Get conversation details
      const conversationData = await this.getConversationWithMessages(conversationId);
      if (!conversationData) {
        throw new Error('Conversation not found');
      }

      const { conversation } = conversationData;
      if (!conversation.userId) {
        throw new Error('Conversation has no associated user');
      }

      // Build context for AI request
      const context = await contextManager.buildContext(conversation.userId, {
        conceptId: options.conceptId || conversation.conceptId || undefined,
        conversationId,
        maxTokens: options.maxTokens || 8000,
        includeHistory: true,
        historyLimit: 20,
      });

      // Prepare AI request
      const aiRequest: AIRequest = {
        userId: conversation.userId,
        conversationId,
        conceptId: options.conceptId || conversation.conceptId || undefined,
        messages: [
          ...context.systemPrompts.map(prompt => ({
            role: 'system' as const,
            content: prompt,
          })),
          ...context.conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user' as const,
            content: userMessage,
          },
        ],
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        preferredProvider: options.preferredProvider,
      };

      // Route request to AI provider
      const routingResult = await aiProviderRouter.route(aiRequest, {
        userId: conversation.userId,
        conceptId: options.conceptId || conversation.conceptId || undefined,
        conversationId,
        preferredProvider: options.preferredProvider,
      });

      // Create AI message record
      const aiMessage = await this.addMessage({
        conversationId,
        role: 'assistant',
        content: routingResult.response.content,
        tokens: routingResult.response.tokens.total,
        model: routingResult.response.model,
        conceptId: options.conceptId || conversation.conceptId || undefined,
        contextUsed: JSON.stringify({
          relevantChunks: context.relevantKnowledge.length,
          contextTokens: context.totalTokens,
          compressionLevel: context.metadata.compressionLevel,
        }),
        cost: routingResult.response.cost,
        processingTime: routingResult.response.processingTime,
      });

      // Store conversation context for future retrieval
      await contextManager.storeConversationContext(
        conversationId,
        [
          {
            id: 'temp-user',
            conversationId,
            role: 'user',
            content: userMessage,
            createdAt: new Date().toISOString(),
            attachments: null,
            tokens: null,
            model: null,
            conceptId: options.conceptId || conversation.conceptId || undefined,
            contextUsed: null,
            cost: null,
            processingTime: null,
            feedback: null,
            feedbackNote: null,
          },
          aiMessage,
        ],
        options.conceptId || conversation.conceptId || undefined
      );

      return {
        response: {
          ...aiMessage,
          providerInfo: {
            provider: routingResult.provider.type,
            model: routingResult.response.model,
            cost: routingResult.response.cost,
            processingTime: routingResult.response.processingTime,
          },
          contextInfo: {
            relevantChunks: context.relevantKnowledge.length,
            contextTokens: context.totalTokens,
            compressionLevel: context.metadata.compressionLevel,
          },
        },
        contextInfo: {
          tokensUsed: context.totalTokens,
          relevantChunks: context.relevantKnowledge.length,
          compressionLevel: context.metadata.compressionLevel,
        },
      };
    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  // Switch conversation to different concept
  static async switchConversationConcept(
    conversationId: string,
    newConceptId: string,
    userId: string
  ): Promise<ConceptAwareConversation> {
    try {
      // Get current conversation
      const currentData = await this.getConversationWithMessages(conversationId);
      if (!currentData || currentData.conversation.userId !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      const oldConceptId = currentData.conversation.conceptId || undefined;

      // Update conversation concept
      await db
        .update(conversations)
        .set({
          conceptId: newConceptId,
          updatedAt: sql`(datetime('now'))`,
        })
        .where(eq(conversations.id, conversationId));

      // Switch context in context manager
      await contextManager.switchConceptContext(
        userId,
        oldConceptId,
        newConceptId,
        conversationId
      );

      // Get updated conversation
      const updatedData = await this.getConversationWithMessages(conversationId);
      if (!updatedData) {
        throw new Error('Failed to retrieve updated conversation');
      }

      console.log(`✅ Conversation ${conversationId} switched from concept ${oldConceptId} to ${newConceptId}`);
      return updatedData.conversation;
    } catch (error) {
      console.error('❌ Error switching conversation concept:', error);
      throw new Error('Failed to switch conversation concept');
    }
  }

  // Get comprehensive conversation analytics
  static async getConversationAnalytics(conversationId: string): Promise<ConversationAnalytics> {
    try {
      // Get basic message statistics
      const messageStats = await this.getConversationStats(conversationId);

      // Get AI request logs for this conversation
      const requestLogs = await aiRequestService.getRequestLogs({
        conversationId,
        limit: 1000,
      });

      // Calculate provider breakdown
      const providerBreakdown: Record<string, {
        requests: number;
        cost: number;
        averageResponseTime: number;
      }> = {};

      let totalCost = 0;
      let totalTokens = 0;
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const log of requestLogs) {
        const provider = log.provider;
        
        if (!providerBreakdown[provider]) {
          providerBreakdown[provider] = {
            requests: 0,
            cost: 0,
            averageResponseTime: 0,
          };
        }

        providerBreakdown[provider].requests++;
        providerBreakdown[provider].cost += log.cost || 0;
        
        if (log.responseTime) {
          providerBreakdown[provider].averageResponseTime += log.responseTime;
          totalResponseTime += log.responseTime;
          responseCount++;
        }

        totalCost += log.cost || 0;
        totalTokens += log.totalTokens || 0;
      }

      // Calculate averages
      for (const provider in providerBreakdown) {
        const stats = providerBreakdown[provider];
        if (stats.requests > 0) {
          stats.averageResponseTime = stats.averageResponseTime / stats.requests;
        }
      }

      const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // Get concept engagement if conversation has a concept
      let conceptEngagement: ConversationAnalytics['conceptEngagement'];
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conversation.length > 0 && conversation[0].conceptId) {
        conceptEngagement = await this.getConceptEngagement(conversationId, conversation[0].conceptId);
      }

      return {
        messageCount: messageStats.messageCount,
        userMessages: messageStats.userMessages,
        assistantMessages: messageStats.assistantMessages,
        totalCost,
        totalTokens,
        averageResponseTime,
        providerBreakdown,
        conceptEngagement,
      };
    } catch (error) {
      console.error('❌ Error getting conversation analytics:', error);
      throw new Error('Failed to get conversation analytics');
    }
  }

  // Get conversations by concept
  static async getConversationsByConcept(
    userId: string,
    conceptId: string,
    limit: number = 20
  ): Promise<ConceptAwareConversation[]> {
    try {
      return await this.getUserConversations(userId, {
        limit,
        conceptId,
        includeStats: true,
      });
    } catch (error) {
      console.error('❌ Error fetching conversations by concept:', error);
      return [];
    }
  }

  // Get provider statistics for a conversation
  private static async getConversationProviderStats(conversationId: string): Promise<{
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    primaryProvider: string;
  }> {
    try {
      const logs = await aiRequestService.getRequestLogs({
        conversationId,
        success: true,
        limit: 1000,
      });

      if (logs.length === 0) {
        return {
          totalRequests: 0,
          totalCost: 0,
          averageResponseTime: 0,
          primaryProvider: 'none',
        };
      }

      const providerCounts: Record<string, number> = {};
      let totalCost = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      for (const log of logs) {
        providerCounts[log.provider] = (providerCounts[log.provider] || 0) + 1;
        totalCost += log.cost || 0;
        
        if (log.responseTime) {
          totalResponseTime += log.responseTime;
          responseTimeCount++;
        }
      }

      // Find primary provider
      let primaryProvider = 'none';
      let maxCount = 0;
      for (const [provider, count] of Object.entries(providerCounts)) {
        if (count > maxCount) {
          maxCount = count;
          primaryProvider = provider;
        }
      }

      return {
        totalRequests: logs.length,
        totalCost,
        averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
        primaryProvider,
      };
    } catch (error) {
      console.error('❌ Error getting provider stats:', error);
      return {
        totalRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        primaryProvider: 'none',
      };
    }
  }

  // Get concept engagement metrics
  private static async getConceptEngagement(
    conversationId: string,
    conceptId: string
  ): Promise<{
    timeSpent: number;
    topicsDiscussed: string[];
    progressMade: number;
  }> {
    try {
      // Get conversation messages
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      if (conversationMessages.length === 0) {
        return {
          timeSpent: 0,
          topicsDiscussed: [],
          progressMade: 0,
        };
      }

      // Calculate time spent (rough estimate based on message timestamps)
      const firstMessage = conversationMessages[0];
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const timeSpent = new Date(lastMessage.createdAt).getTime() - new Date(firstMessage.createdAt).getTime();

      // Extract topics from messages (simplified approach)
      const topics = new Set<string>();
      const keywordPatterns = [
        /\b(algorithm|data structure|array|tree|graph|sorting|searching)\b/gi,
        /\b(system design|architecture|scalability|database|caching)\b/gi,
        /\b(behavioral|leadership|teamwork|conflict|challenge)\b/gi,
        /\b(javascript|python|java|react|node|sql)\b/gi,
      ];

      for (const message of conversationMessages) {
        for (const pattern of keywordPatterns) {
          const matches = message.content.match(pattern);
          if (matches) {
            matches.forEach(match => topics.add(match.toLowerCase()));
          }
        }
      }

      // Estimate progress made (simplified - based on message count and positive feedback)
      const positiveFeedback = conversationMessages.filter(m => m.feedback === 'positive').length;
      const progressMade = Math.min(100, (conversationMessages.length * 2) + (positiveFeedback * 5));

      return {
        timeSpent: Math.round(timeSpent / (1000 * 60)), // Convert to minutes
        topicsDiscussed: Array.from(topics).slice(0, 10),
        progressMade,
      };
    } catch (error) {
      console.error('❌ Error getting concept engagement:', error);
      return {
        timeSpent: 0,
        topicsDiscussed: [],
        progressMade: 0,
      };
    }
  }
}

// Export singleton instance for backward compatibility
export const chatService = new ChatService();

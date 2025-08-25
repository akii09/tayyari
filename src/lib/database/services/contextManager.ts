/**
 * Context Manager
 * Handles intelligent context building, compression, and pruning for AI interactions
 */

import { contextEmbeddingService, type ContextChunk } from './contextEmbeddingService';
import { userService } from './userService';
import { LearningConceptService } from './learningConceptService';
import { chatService } from './chatService';
import { db } from '../config';
import { conversations, messages, type User, type LearningConcept, type Message } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export interface UserProfile {
  id: string;
  name: string;
  experienceLevel: string;
  learningStyle?: string;
  currentSkills?: Record<string, number>;
  weakAreas?: string[];
  strongAreas?: string[];
  preferences: {
    difficultyPreference: string;
    hoursPerWeek: number;
    preferredStudyTime?: string;
  };
}

export interface ConceptContext {
  concept: LearningConcept;
  progress: {
    completionPercentage: number;
    currentModule?: string;
    timeSpent: number;
    lastStudied?: Date;
  };
  customPrompts: Array<{
    type: 'system' | 'instruction' | 'example';
    content: string;
    priority: number;
  }>;
  relatedConcepts: LearningConcept[];
}

export interface LearningSession {
  id: string;
  conceptId?: string;
  startTime: Date;
  duration: number;
  topics: string[];
  achievements: string[];
  challenges: string[];
}

export interface AIContext {
  userProfile: UserProfile;
  learningHistory: LearningSession[];
  conceptContext?: ConceptContext;
  conversationHistory: Message[];
  relevantKnowledge: ContextChunk[];
  systemPrompts: string[];
  totalTokens: number;
  metadata: {
    contextVersion: string;
    buildTime: Date;
    compressionLevel: number;
  };
}

export interface ContextBuildOptions {
  conceptId?: string;
  conversationId?: string;
  maxTokens?: number;
  includeHistory?: boolean;
  historyLimit?: number;
  relevanceThreshold?: number;
  compressionLevel?: number;
}

export class ContextManager {
  private static readonly MAX_TOKENS_DEFAULT = 8000;
  private static readonly HISTORY_LIMIT_DEFAULT = 20;
  private static readonly RELEVANCE_THRESHOLD_DEFAULT = 0.7;
  private static readonly CONTEXT_VERSION = '1.0';

  /**
   * Build comprehensive context for AI requests
   */
  async buildContext(
    userId: string,
    options: ContextBuildOptions = {}
  ): Promise<AIContext> {
    try {
      const startTime = new Date();
      
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      
      // Get concept context if specified
      let conceptContext: ConceptContext | undefined;
      if (options.conceptId) {
        conceptContext = await this.getConceptContext(userId, options.conceptId);
      }
      
      // Get conversation history
      const conversationHistory = await this.getConversationHistory(
        userId,
        options.conversationId,
        options.historyLimit ?? ContextManager.HISTORY_LIMIT_DEFAULT
      );
      
      // Get learning history
      const learningHistory = await this.getLearningHistory(userId, options.conceptId);
      
      // Get relevant knowledge from embeddings
      const relevantKnowledge = await this.getRelevantKnowledge(
        userId,
        conversationHistory,
        {
          conceptId: options.conceptId,
          threshold: options.relevanceThreshold ?? ContextManager.RELEVANCE_THRESHOLD_DEFAULT,
          limit: 10,
        }
      );
      
      // Build system prompts
      const systemPrompts = await this.buildSystemPrompts(userProfile, conceptContext);
      
      // Calculate initial token count
      let totalTokens = this.estimateTokenCount({
        userProfile,
        learningHistory,
        conceptContext,
        conversationHistory,
        relevantKnowledge,
        systemPrompts,
      });
      
      // Apply compression if needed
      const maxTokens = options.maxTokens ?? ContextManager.MAX_TOKENS_DEFAULT;
      const compressionLevel = options.compressionLevel ?? 0;
      
      let compressedContext = {
        userProfile,
        learningHistory,
        conceptContext,
        conversationHistory,
        relevantKnowledge,
        systemPrompts,
      };
      
      if (totalTokens > maxTokens || compressionLevel > 0) {
        compressedContext = await this.compressContext(compressedContext, maxTokens, compressionLevel);
        totalTokens = this.estimateTokenCount(compressedContext);
      }
      
      return {
        ...compressedContext,
        totalTokens,
        metadata: {
          contextVersion: ContextManager.CONTEXT_VERSION,
          buildTime: startTime,
          compressionLevel,
        },
      };
    } catch (error) {
      console.error('Failed to build context:', error);
      throw new Error('Context building failed');
    }
  }

  /**
   * Store conversation context as embeddings
   */
  async storeConversationContext(
    conversationId: string,
    messages: Message[],
    conceptId?: string
  ): Promise<void> {
    try {
      // Get conversation details
      const conversation = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (conversation.length === 0) {
        throw new Error('Conversation not found');
      }
      
      const conv = conversation[0];
      if (!conv.userId) {
        throw new Error('Conversation has no associated user');
      }
      
      // Process messages in chunks for embedding
      const contextChunks: Array<{
        userId: string;
        content: string;
        metadata: {
          type: 'conversation';
          conceptId?: string;
          conversationId: string;
        };
      }> = [];
      
      // Group messages into meaningful chunks
      let currentChunk = '';
      let messageCount = 0;
      
      for (const message of messages) {
        currentChunk += `${message.role}: ${message.content}\n`;
        messageCount++;
        
        // Create chunk every 3 messages or when chunk gets large
        if (messageCount >= 3 || currentChunk.length > 1000) {
          contextChunks.push({
            userId: conv.userId,
            content: currentChunk.trim(),
            metadata: {
              type: 'conversation',
              conceptId: conceptId || message.conceptId || undefined,
              conversationId,
            },
          });
          
          currentChunk = '';
          messageCount = 0;
        }
      }
      
      // Add remaining content
      if (currentChunk.trim()) {
        contextChunks.push({
          userId: conv.userId,
          content: currentChunk.trim(),
          metadata: {
            type: 'conversation',
            conceptId: conceptId || undefined,
            conversationId,
          },
        });
      }
      
      // Store chunks as embeddings
      if (contextChunks.length > 0) {
        await contextEmbeddingService.batchStoreContexts(contextChunks);
      }
    } catch (error) {
      console.error('Failed to store conversation context:', error);
      throw new Error('Conversation context storage failed');
    }
  }

  /**
   * Retrieve relevant context using semantic search
   */
  async retrieveRelevantContext(
    query: string,
    userId: string,
    options: {
      conceptId?: string;
      conversationId?: string;
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<ContextChunk[]> {
    try {
      return await contextEmbeddingService.searchSimilarContexts(query, {
        userId,
        conceptId: options.conceptId,
        conversationId: options.conversationId,
        limit: options.limit ?? 10,
        threshold: options.threshold ?? 0.7,
      });
    } catch (error) {
      console.error('Failed to retrieve relevant context:', error);
      throw new Error('Context retrieval failed');
    }
  }

  /**
   * Compress context when approaching token limits
   */
  async compressContext(
    context: Omit<AIContext, 'totalTokens' | 'metadata'>,
    maxTokens: number,
    compressionLevel: number = 0
  ): Promise<Omit<AIContext, 'totalTokens' | 'metadata'>> {
    try {
      let compressedContext = { ...context };
      
      // Level 1: Reduce conversation history
      if (compressionLevel >= 1 || this.estimateTokenCount(compressedContext) > maxTokens) {
        compressedContext.conversationHistory = compressedContext.conversationHistory.slice(-10);
      }
      
      // Level 2: Reduce relevant knowledge
      if (compressionLevel >= 2 || this.estimateTokenCount(compressedContext) > maxTokens) {
        compressedContext.relevantKnowledge = compressedContext.relevantKnowledge.slice(0, 5);
      }
      
      // Level 3: Reduce learning history
      if (compressionLevel >= 3 || this.estimateTokenCount(compressedContext) > maxTokens) {
        compressedContext.learningHistory = compressedContext.learningHistory.slice(-5);
      }
      
      // Level 4: Summarize conversation history
      if (compressionLevel >= 4 || this.estimateTokenCount(compressedContext) > maxTokens) {
        compressedContext.conversationHistory = await this.summarizeConversationHistory(
          compressedContext.conversationHistory
        );
      }
      
      return compressedContext;
    } catch (error) {
      console.error('Failed to compress context:', error);
      throw new Error('Context compression failed');
    }
  }

  /**
   * Generate context summary for storage
   */
  async generateContextSummary(conversationId: string): Promise<string> {
    try {
      const messages = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      
      if (messages.length === 0) {
        return 'Empty conversation';
      }
      
      // Create a summary of the conversation
      const topics = new Set<string>();
      const keyPoints: string[] = [];
      let userQuestions = 0;
      let assistantResponses = 0;
      
      for (const message of messages) {
        if (message.role === 'user') {
          userQuestions++;
          // Extract potential topics from user messages
          const words = message.content.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 4 && !['what', 'how', 'why', 'when', 'where', 'which'].includes(word)) {
              topics.add(word);
            }
          });
        } else if (message.role === 'assistant') {
          assistantResponses++;
          // Extract key points from assistant responses
          if (message.content.includes('important') || message.content.includes('key') || message.content.includes('remember')) {
            const sentences = message.content.split(/[.!?]+/);
            sentences.forEach(sentence => {
              if ((sentence.includes('important') || sentence.includes('key') || sentence.includes('remember')) && sentence.length < 200) {
                keyPoints.push(sentence.trim());
              }
            });
          }
        }
      }
      
      const topicsList = Array.from(topics).slice(0, 5).join(', ');
      const keyPointsList = keyPoints.slice(0, 3).join('; ');
      
      return `Conversation with ${userQuestions} questions and ${assistantResponses} responses. Topics: ${topicsList}. Key points: ${keyPointsList}`;
    } catch (error) {
      console.error('Failed to generate context summary:', error);
      return 'Summary generation failed';
    }
  }

  /**
   * Handle real-time context loading for concept switches
   */
  async switchConceptContext(
    userId: string,
    fromConceptId: string | undefined,
    toConceptId: string,
    conversationId?: string
  ): Promise<AIContext> {
    try {
      // Store current context if switching from another concept
      if (fromConceptId && conversationId) {
        const currentMessages = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt))
          .limit(5);
        
        if (currentMessages.length > 0) {
          await this.storeConversationContext(conversationId, currentMessages, fromConceptId);
        }
      }
      
      // Build new context for the target concept
      const newContext = await this.buildContext(userId, {
        conceptId: toConceptId,
        conversationId,
        maxTokens: 10000, // Allow more tokens for concept switches
        includeHistory: true,
        historyLimit: 15,
      });
      
      return newContext;
    } catch (error) {
      console.error('Failed to switch concept context:', error);
      throw new Error('Concept context switch failed');
    }
  }

  /**
   * Get user profile for context
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user.id,
      name: user.name,
      experienceLevel: user.experienceLevel,
      learningStyle: user.learningStyle || undefined,
      currentSkills: user.currentSkills ? JSON.parse(user.currentSkills) : undefined,
      weakAreas: user.weakAreas ? JSON.parse(user.weakAreas) : undefined,
      strongAreas: user.strongAreas ? JSON.parse(user.strongAreas) : undefined,
      preferences: {
        difficultyPreference: user.difficultyPreference || 'medium',
        hoursPerWeek: user.hoursPerWeek,
        preferredStudyTime: user.preferredStudyTime || undefined,
      },
    };
  }

  /**
   * Get concept context
   */
  private async getConceptContext(userId: string, conceptId: string): Promise<ConceptContext> {
    const concept = await LearningConceptService.getConceptById(conceptId);
    if (!concept || concept.userId !== userId) {
      throw new Error('Concept not found or access denied');
    }
    
    // Get related concepts
    const relatedConcepts = await LearningConceptService.getUserConcepts(userId);
    const related = relatedConcepts.filter(c => c.id !== conceptId && c.category === concept.category);
    
    return {
      concept,
      progress: {
        completionPercentage: concept.completionPercentage,
        currentModule: concept.currentModule || undefined,
        timeSpent: concept.timeSpent,
        lastStudied: concept.lastStudied ? new Date(concept.lastStudied) : undefined,
      },
      customPrompts: concept.customPrompts ? JSON.parse(concept.customPrompts) : [],
      relatedConcepts: related.slice(0, 3), // Limit to 3 related concepts
    };
  }

  /**
   * Get conversation history
   */
  private async getConversationHistory(
    userId: string,
    conversationId?: string,
    limit: number = 20
  ): Promise<Message[]> {
    if (!conversationId) {
      return [];
    }
    
    const messageList = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return messageList.reverse(); // Return in chronological order
  }

  /**
   * Get learning history
   */
  private async getLearningHistory(userId: string, conceptId?: string): Promise<LearningSession[]> {
    // This is a simplified implementation - in a real system, you'd have a separate learning sessions table
    const conversations = await db.select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          conceptId ? eq(conversations.conceptId, conceptId) : undefined
        )
      )
      .orderBy(desc(conversations.createdAt))
      .limit(10);
    
    return conversations.map(conv => ({
      id: conv.id,
      conceptId: conv.conceptId || undefined,
      startTime: new Date(conv.createdAt),
      duration: 30, // Placeholder - would calculate from actual session data
      topics: [conv.title || 'General discussion'],
      achievements: [],
      challenges: [],
    }));
  }

  /**
   * Get relevant knowledge from embeddings
   */
  private async getRelevantKnowledge(
    userId: string,
    conversationHistory: Message[],
    options: {
      conceptId?: string;
      threshold: number;
      limit: number;
    }
  ): Promise<ContextChunk[]> {
    if (conversationHistory.length === 0) {
      return [];
    }
    
    // Use the last few messages to build a query
    const recentMessages = conversationHistory.slice(-3);
    const query = recentMessages.map(m => m.content).join(' ');
    
    return await contextEmbeddingService.searchSimilarContexts(query, {
      userId,
      conceptId: options.conceptId,
      limit: options.limit,
      threshold: options.threshold,
    });
  }

  /**
   * Build system prompts
   */
  private async buildSystemPrompts(
    userProfile: UserProfile,
    conceptContext?: ConceptContext
  ): Promise<string[]> {
    const prompts: string[] = [];
    
    // Base system prompt
    prompts.push(`You are an AI tutor helping ${userProfile.name}, a ${userProfile.experienceLevel} learner.`);
    
    // Learning style prompt
    if (userProfile.learningStyle) {
      prompts.push(`The user prefers ${userProfile.learningStyle} learning approaches.`);
    }
    
    // Concept-specific prompts
    if (conceptContext) {
      prompts.push(`Currently focusing on: ${conceptContext.concept.name} (${conceptContext.concept.difficulty} level).`);
      
      if (conceptContext.progress.completionPercentage > 0) {
        prompts.push(`Progress: ${Math.round(conceptContext.progress.completionPercentage)}% complete.`);
      }
      
      // Add custom prompts
      conceptContext.customPrompts
        .sort((a, b) => b.priority - a.priority)
        .forEach(prompt => {
          prompts.push(prompt.content);
        });
    }
    
    return prompts;
  }

  /**
   * Estimate token count for context
   */
  private estimateTokenCount(context: Partial<AIContext>): number {
    let tokens = 0;
    
    // Rough estimation: 1 token ≈ 4 characters
    if (context.userProfile) {
      tokens += JSON.stringify(context.userProfile).length / 4;
    }
    
    if (context.conversationHistory) {
      tokens += context.conversationHistory.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    }
    
    if (context.relevantKnowledge) {
      tokens += context.relevantKnowledge.reduce((sum, chunk) => sum + chunk.content.length / 4, 0);
    }
    
    if (context.systemPrompts) {
      tokens += context.systemPrompts.reduce((sum, prompt) => sum + prompt.length / 4, 0);
    }
    
    if (context.learningHistory) {
      tokens += context.learningHistory.length * 50; // Rough estimate per session
    }
    
    if (context.conceptContext) {
      tokens += JSON.stringify(context.conceptContext).length / 4;
    }
    
    return Math.ceil(tokens);
  }

  /**
   * Summarize conversation history
   */
  private async summarizeConversationHistory(messages: Message[]): Promise<Message[]> {
    if (messages.length <= 5) {
      return messages;
    }
    
    // Keep first and last few messages, summarize the middle
    const keepStart = messages.slice(0, 2);
    const keepEnd = messages.slice(-2);
    const toSummarize = messages.slice(2, -2);
    
    if (toSummarize.length === 0) {
      return messages;
    }
    
    // Create a summary message
    const summaryContent = `[Summary of ${toSummarize.length} messages: Discussion covered various topics with questions and explanations]`;
    
    const summaryMessage: Message = {
      id: 'summary-' + Date.now(),
      conversationId: messages[0].conversationId,
      role: 'assistant',
      content: summaryContent,
      createdAt: toSummarize[0].createdAt,
      attachments: null,
      tokens: null,
      model: null,
      conceptId: null,
      contextUsed: null,
      cost: null,
      processingTime: null,
      feedback: null,
      feedbackNote: null,
    };
    
    return [...keepStart, summaryMessage, ...keepEnd];
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
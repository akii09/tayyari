import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config';
import { conversations, messages, type Conversation, type NewConversation, type Message, type NewMessage } from '../schema';

export class ChatService {
  // Create a new conversation
  static async createConversation(conversationData: NewConversation): Promise<Conversation> {
    try {
      const [newConversation] = await db.insert(conversations).values({
        ...conversationData,
        title: conversationData.title || 'New Chat',
      }).returning();

      console.log(`✅ Conversation created: ${newConversation.id}`);
      return newConversation;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get conversation by ID with messages
  static async getConversationWithMessages(conversationId: string): Promise<{
    conversation: Conversation;
    messages: Message[];
  } | null> {
    try {
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) return null;

      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      return {
        conversation: conversation[0],
        messages: conversationMessages,
      };
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      return null;
    }
  }

  // Get user's conversations
  static async getUserConversations(userId: string, limit: number = 20): Promise<Conversation[]> {
    try {
      return await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit);
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

  // Search messages in conversations
  static async searchMessages(userId: string, query: string, limit: number = 10): Promise<Message[]> {
    try {
      return await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          role: messages.role,
          content: messages.content,
          attachments: messages.attachments,
          tokens: messages.tokens,
          model: messages.model,
          feedback: messages.feedback,
          feedbackNote: messages.feedbackNote,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(conversations, eq(conversations.id, messages.conversationId))
        .where(
          and(
            eq(conversations.userId, userId),
            sql`${messages.content} LIKE ${'%' + query + '%'}`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      return [];
    }
  }
}

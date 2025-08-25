/**
 * Context Embedding Service
 * Handles vector embeddings for context storage and semantic search
 */

import { db } from '../config';
import { contextEmbeddings, type ContextEmbedding, type NewContextEmbedding } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';
// Note: In a real implementation, you would use the AI SDK for embeddings
// For now, we'll create a placeholder implementation that can be replaced
// with actual AI SDK integration when the environment is properly configured

export interface ContextChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'conversation' | 'progress' | 'concept' | 'feedback';
    conceptId?: string;
    conversationId?: string;
    timestamp: Date;
    relevanceScore?: number;
  };
}

export interface EmbeddingSearchOptions {
  userId: string;
  conceptId?: string;
  conversationId?: string;
  type?: 'conversation' | 'progress' | 'concept' | 'feedback';
  limit?: number;
  threshold?: number;
}

export class ContextEmbeddingService {
  private static readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_THRESHOLD = 0.7;

  /**
   * Generate embedding for text content
   * TODO: Replace with actual AI SDK implementation when environment is configured
   */
  async generateEmbedding(content: string): Promise<number[]> {
    try {
      // Placeholder implementation - in production, this would use AI SDK
      // For now, create a simple hash-based embedding for testing
      const hash = this.simpleHash(content);
      const embedding = Array.from({ length: 1536 }, (_, i) => {
        return Math.sin(hash + i) * 0.1 + Math.cos(hash * 2 + i) * 0.1;
      });
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Simple hash function for generating consistent embeddings in testing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Store context with embedding
   */
  async storeContext(
    userId: string,
    content: string,
    metadata: {
      type: 'conversation' | 'progress' | 'concept' | 'feedback';
      conceptId?: string;
      conversationId?: string;
    }
  ): Promise<string> {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);
      
      // Prepare embedding data
      const embeddingData: NewContextEmbedding = {
        userId,
        conceptId: metadata.conceptId,
        conversationId: metadata.conversationId,
        content,
        embedding: Buffer.from(new Float32Array(embedding).buffer),
        metadata: JSON.stringify({
          ...metadata,
          timestamp: new Date().toISOString(),
        }),
        relevanceScore: 1.0, // Initial relevance score
      };

      // Insert into database
      const result = await db.insert(contextEmbeddings).values(embeddingData).returning({ id: contextEmbeddings.id });
      
      return result[0].id;
    } catch (error) {
      console.error('Failed to store context embedding:', error);
      throw new Error('Context storage failed');
    }
  }

  /**
   * Search for similar contexts using semantic search
   */
  async searchSimilarContexts(
    query: string,
    options: EmbeddingSearchOptions
  ): Promise<ContextChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Build base query
      let dbQuery = db.select().from(contextEmbeddings);
      
      // Add filters
      const conditions = [eq(contextEmbeddings.userId, options.userId)];
      
      if (options.conceptId) {
        conditions.push(eq(contextEmbeddings.conceptId, options.conceptId));
      }
      
      if (options.conversationId) {
        conditions.push(eq(contextEmbeddings.conversationId, options.conversationId));
      }
      
      if (options.type) {
        conditions.push(sql`json_extract(${contextEmbeddings.metadata}, '$.type') = ${options.type}`);
      }
      
      // Apply filters
      if (conditions.length > 0) {
        dbQuery = dbQuery.where(and(...conditions));
      }
      
      // Get all matching embeddings
      const results = await dbQuery.orderBy(desc(contextEmbeddings.createdAt));
      
      // Calculate similarity scores and filter
      const similarContexts: ContextChunk[] = [];
      const threshold = options.threshold ?? ContextEmbeddingService.DEFAULT_THRESHOLD;
      
      for (const result of results) {
        if (!result.embedding) continue;
        
        // Convert buffer back to float array
        const embedding = Array.from(new Float32Array(result.embedding.buffer));
        
        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        
        if (similarity >= threshold) {
          const metadata = result.metadata ? JSON.parse(result.metadata) : {};
          
          similarContexts.push({
            id: result.id,
            content: result.content,
            embedding,
            metadata: {
              ...metadata,
              timestamp: new Date(metadata.timestamp || result.createdAt),
              relevanceScore: similarity,
            },
          });
        }
      }
      
      // Sort by relevance score and limit results
      const limit = options.limit ?? ContextEmbeddingService.DEFAULT_LIMIT;
      return similarContexts
        .sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0))
        .slice(0, limit);
        
    } catch (error) {
      console.error('Failed to search similar contexts:', error);
      throw new Error('Context search failed');
    }
  }

  /**
   * Get context by ID
   */
  async getContextById(id: string): Promise<ContextChunk | null> {
    try {
      const result = await db.select().from(contextEmbeddings).where(eq(contextEmbeddings.id, id)).limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const context = result[0];
      const embedding = context.embedding ? Array.from(new Float32Array(context.embedding.buffer)) : [];
      const metadata = context.metadata ? JSON.parse(context.metadata) : {};
      
      return {
        id: context.id,
        content: context.content,
        embedding,
        metadata: {
          ...metadata,
          timestamp: new Date(metadata.timestamp || context.createdAt),
          relevanceScore: context.relevanceScore || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get context by ID:', error);
      throw new Error('Context retrieval failed');
    }
  }

  /**
   * Update context relevance score
   */
  async updateRelevanceScore(id: string, score: number): Promise<void> {
    try {
      await db.update(contextEmbeddings)
        .set({ 
          relevanceScore: score,
          updatedAt: new Date().toISOString()
        })
        .where(eq(contextEmbeddings.id, id));
    } catch (error) {
      console.error('Failed to update relevance score:', error);
      throw new Error('Relevance score update failed');
    }
  }

  /**
   * Delete context embedding
   */
  async deleteContext(id: string): Promise<void> {
    try {
      await db.delete(contextEmbeddings).where(eq(contextEmbeddings.id, id));
    } catch (error) {
      console.error('Failed to delete context:', error);
      throw new Error('Context deletion failed');
    }
  }

  /**
   * Get contexts for a user with optional filters
   */
  async getUserContexts(
    userId: string,
    options: {
      conceptId?: string;
      conversationId?: string;
      type?: string;
      limit?: number;
    } = {}
  ): Promise<ContextChunk[]> {
    try {
      let query = db.select().from(contextEmbeddings).where(eq(contextEmbeddings.userId, userId));
      
      if (options.conceptId) {
        query = query.where(eq(contextEmbeddings.conceptId, options.conceptId));
      }
      
      if (options.conversationId) {
        query = query.where(eq(contextEmbeddings.conversationId, options.conversationId));
      }
      
      if (options.type) {
        query = query.where(sql`json_extract(${contextEmbeddings.metadata}, '$.type') = ${options.type}`);
      }
      
      const limit = options.limit ?? 50;
      const results = await query.orderBy(desc(contextEmbeddings.createdAt)).limit(limit);
      
      return results.map(result => {
        const embedding = result.embedding ? Array.from(new Float32Array(result.embedding.buffer)) : [];
        const metadata = result.metadata ? JSON.parse(result.metadata) : {};
        
        return {
          id: result.id,
          content: result.content,
          embedding,
          metadata: {
            ...metadata,
            timestamp: new Date(metadata.timestamp || result.createdAt),
            relevanceScore: result.relevanceScore || 0,
          },
        };
      });
    } catch (error) {
      console.error('Failed to get user contexts:', error);
      throw new Error('User contexts retrieval failed');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Batch store multiple contexts
   */
  async batchStoreContexts(
    contexts: Array<{
      userId: string;
      content: string;
      metadata: {
        type: 'conversation' | 'progress' | 'concept' | 'feedback';
        conceptId?: string;
        conversationId?: string;
      };
    }>
  ): Promise<string[]> {
    try {
      const embeddingPromises = contexts.map(async (context) => {
        const embedding = await this.generateEmbedding(context.content);
        
        return {
          userId: context.userId,
          conceptId: context.metadata.conceptId,
          conversationId: context.metadata.conversationId,
          content: context.content,
          embedding: Buffer.from(new Float32Array(embedding).buffer),
          metadata: JSON.stringify({
            ...context.metadata,
            timestamp: new Date().toISOString(),
          }),
          relevanceScore: 1.0,
        };
      });
      
      const embeddingData = await Promise.all(embeddingPromises);
      const results = await db.insert(contextEmbeddings).values(embeddingData).returning({ id: contextEmbeddings.id });
      
      return results.map(result => result.id);
    } catch (error) {
      console.error('Failed to batch store contexts:', error);
      throw new Error('Batch context storage failed');
    }
  }

  /**
   * Clean up old contexts based on age and relevance
   */
  async cleanupOldContexts(
    userId: string,
    options: {
      olderThanDays?: number;
      minRelevanceScore?: number;
      keepCount?: number;
    } = {}
  ): Promise<number> {
    try {
      const olderThanDays = options.olderThanDays ?? 90;
      const minRelevanceScore = options.minRelevanceScore ?? 0.3;
      const keepCount = options.keepCount ?? 1000;
      
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // Get contexts to potentially delete
      const contextsToDelete = await db.select({ id: contextEmbeddings.id })
        .from(contextEmbeddings)
        .where(
          and(
            eq(contextEmbeddings.userId, userId),
            sql`${contextEmbeddings.createdAt} < ${cutoffDate.toISOString()}`,
            sql`${contextEmbeddings.relevanceScore} < ${minRelevanceScore}`
          )
        )
        .orderBy(contextEmbeddings.relevanceScore, contextEmbeddings.createdAt)
        .limit(1000); // Safety limit
      
      // Keep the most recent contexts
      const totalContexts = await db.select({ count: sql`count(*)` })
        .from(contextEmbeddings)
        .where(eq(contextEmbeddings.userId, userId));
      
      const currentCount = Number(totalContexts[0]?.count || 0);
      const deleteCount = Math.max(0, Math.min(contextsToDelete.length, currentCount - keepCount));
      
      if (deleteCount > 0) {
        const idsToDelete = contextsToDelete.slice(0, deleteCount).map(c => c.id);
        
        await db.delete(contextEmbeddings)
          .where(sql`${contextEmbeddings.id} IN (${idsToDelete.map(id => `'${id}'`).join(',')})`);
        
        return deleteCount;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to cleanup old contexts:', error);
      throw new Error('Context cleanup failed');
    }
  }
}

// Export singleton instance
export const contextEmbeddingService = new ContextEmbeddingService();
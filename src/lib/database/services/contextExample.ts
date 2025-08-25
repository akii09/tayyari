/**
 * Context Management System Example
 * Demonstrates how to use the intelligent context management and embedding system
 */

import { contextManager } from './contextManager';
import { contextEmbeddingService } from './contextEmbeddingService';
import { userService } from './userService';
import { LearningConceptService } from './learningConceptService';

/**
 * Example: Complete context management workflow
 */
export async function demonstrateContextManagement() {
  try {
    console.log('🚀 Starting Context Management Demonstration...\n');

    // 1. Create a test user
    const userId = await userService.createUser({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'Software Engineer',
      experienceLevel: 'mid',
      yearsOfExperience: 3,
      hoursPerWeek: 10,
      difficultyPreference: 'medium',
      learningStyle: 'hands-on',
      currentSkills: JSON.stringify({ javascript: 8, python: 6, react: 7 }),
      weakAreas: JSON.stringify(['algorithms', 'system_design']),
      strongAreas: JSON.stringify(['frontend', 'databases']),
      onboardingCompleted: true,
    });
    console.log('✅ Created user:', userId);

    // 2. Create learning concepts
    const jsConceptId = await LearningConceptService.createConcept({
      userId,
      name: 'JavaScript Advanced Concepts',
      description: 'Deep dive into JavaScript closures, prototypes, and async programming',
      category: 'programming',
      difficulty: 'intermediate',
      estimatedHours: 40,
      prerequisites: JSON.stringify(['javascript_basics']),
      learningObjectives: JSON.stringify([
        'Understand closures and scope',
        'Master prototypal inheritance',
        'Handle async operations effectively'
      ]),
      customPrompts: JSON.stringify([
        {
          type: 'system',
          content: 'Focus on practical examples and real-world applications',
          priority: 1
        },
        {
          type: 'instruction',
          content: 'Always provide code examples with explanations',
          priority: 2
        }
      ]),
    });
    console.log('✅ Created JavaScript concept:', jsConceptId);

    const algoConceptId = await LearningConceptService.createConcept({
      userId,
      name: 'Data Structures & Algorithms',
      description: 'Master fundamental algorithms and data structures',
      category: 'computer_science',
      difficulty: 'intermediate',
      estimatedHours: 60,
      prerequisites: JSON.stringify(['programming_basics']),
      learningObjectives: JSON.stringify([
        'Implement common data structures',
        'Analyze algorithm complexity',
        'Solve coding interview problems'
      ]),
      customPrompts: JSON.stringify([
        {
          type: 'system',
          content: 'Emphasize time and space complexity analysis',
          priority: 1
        }
      ]),
    });
    console.log('✅ Created Algorithms concept:', algoConceptId);

    // 3. Store some learning context
    console.log('\n📚 Storing learning contexts...');
    
    const contexts = [
      {
        userId,
        content: 'User learned about JavaScript closures and how they capture variables from outer scope',
        metadata: {
          type: 'progress' as const,
          conceptId: jsConceptId,
        }
      },
      {
        userId,
        content: 'Discussion about the difference between var, let, and const in JavaScript',
        metadata: {
          type: 'conversation' as const,
          conceptId: jsConceptId,
        }
      },
      {
        userId,
        content: 'User struggled with understanding prototype chain but made progress with examples',
        metadata: {
          type: 'feedback' as const,
          conceptId: jsConceptId,
        }
      },
      {
        userId,
        content: 'Implemented binary search algorithm with O(log n) time complexity',
        metadata: {
          type: 'progress' as const,
          conceptId: algoConceptId,
        }
      },
      {
        userId,
        content: 'User asked about when to use arrays vs linked lists for different operations',
        metadata: {
          type: 'conversation' as const,
          conceptId: algoConceptId,
        }
      }
    ];

    const contextIds = await contextEmbeddingService.batchStoreContexts(contexts);
    console.log('✅ Stored contexts:', contextIds.length);

    // 4. Build comprehensive context for JavaScript concept
    console.log('\n🧠 Building context for JavaScript learning session...');
    
    const jsContext = await contextManager.buildContext(userId, {
      conceptId: jsConceptId,
      maxTokens: 8000,
      includeHistory: true,
      historyLimit: 10,
      relevanceThreshold: 0.6,
    });

    console.log('📊 Context built successfully:');
    console.log(`  - User: ${jsContext.userProfile.name} (${jsContext.userProfile.experienceLevel})`);
    console.log(`  - Concept: ${jsContext.conceptContext?.concept.name}`);
    console.log(`  - Progress: ${jsContext.conceptContext?.progress.completionPercentage}%`);
    console.log(`  - Relevant knowledge chunks: ${jsContext.relevantKnowledge.length}`);
    console.log(`  - System prompts: ${jsContext.systemPrompts.length}`);
    console.log(`  - Total tokens: ${jsContext.totalTokens}`);

    // 5. Demonstrate semantic search
    console.log('\n🔍 Demonstrating semantic search...');
    
    const searchResults = await contextEmbeddingService.searchSimilarContexts(
      'JavaScript functions and scope',
      {
        userId,
        conceptId: jsConceptId,
        limit: 3,
        threshold: 0.5,
      }
    );

    console.log(`Found ${searchResults.length} relevant contexts:`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. [${result.metadata.type}] ${result.content.substring(0, 80)}...`);
      console.log(`     Relevance: ${(result.metadata.relevanceScore || 0).toFixed(3)}`);
    });

    // 6. Demonstrate context switching
    console.log('\n🔄 Demonstrating context switching...');
    
    const switchedContext = await contextManager.switchConceptContext(
      userId,
      jsConceptId,
      algoConceptId
    );

    console.log('✅ Switched to Algorithms context:');
    console.log(`  - New concept: ${switchedContext.conceptContext?.concept.name}`);
    console.log(`  - Relevant knowledge: ${switchedContext.relevantKnowledge.length} chunks`);
    console.log(`  - Total tokens: ${switchedContext.totalTokens}`);

    // 7. Demonstrate context compression
    console.log('\n🗜️ Demonstrating context compression...');
    
    const compressedContext = await contextManager.buildContext(userId, {
      conceptId: jsConceptId,
      maxTokens: 2000, // Force compression
      compressionLevel: 2,
    });

    console.log('✅ Compressed context:');
    console.log(`  - Original tokens: ${jsContext.totalTokens}`);
    console.log(`  - Compressed tokens: ${compressedContext.totalTokens}`);
    console.log(`  - Compression level: ${compressedContext.metadata.compressionLevel}`);
    console.log(`  - Relevant knowledge: ${compressedContext.relevantKnowledge.length} chunks`);

    // 8. Demonstrate context retrieval
    console.log('\n📖 Demonstrating context retrieval...');
    
    const relevantContext = await contextManager.retrieveRelevantContext(
      'How do closures work in JavaScript?',
      userId,
      {
        conceptId: jsConceptId,
        limit: 2,
        threshold: 0.4,
      }
    );

    console.log(`Retrieved ${relevantContext.length} relevant contexts for the query:`);
    relevantContext.forEach((context, index) => {
      console.log(`  ${index + 1}. ${context.content.substring(0, 100)}...`);
      console.log(`     Score: ${(context.metadata.relevanceScore || 0).toFixed(3)}`);
    });

    // 9. Update progress and store new context
    console.log('\n📈 Updating progress and storing new context...');
    
    await LearningConceptService.updateProgress(jsConceptId, {
      completionPercentage: 75,
      currentModule: 'Prototypes',
      timeSpent: 20,
    });

    await contextEmbeddingService.storeContext(
      userId,
      'User completed advanced closure exercises and demonstrated understanding of lexical scoping',
      {
        type: 'progress',
        conceptId: jsConceptId,
      }
    );

    console.log('✅ Progress updated and new context stored');

    // 10. Cleanup demonstration
    console.log('\n🧹 Demonstrating context cleanup...');
    
    const cleanedCount = await contextEmbeddingService.cleanupOldContexts(userId, {
      olderThanDays: 0, // Clean all for demo
      minRelevanceScore: 0.9, // Very high threshold
      keepCount: 3,
    });

    console.log(`✅ Cleaned up ${cleanedCount} old contexts`);

    console.log('\n🎉 Context Management Demonstration Complete!');
    console.log('\nKey Features Demonstrated:');
    console.log('  ✅ Vector embedding generation and storage');
    console.log('  ✅ Semantic search and similarity matching');
    console.log('  ✅ Intelligent context building and compression');
    console.log('  ✅ Multi-concept context management');
    console.log('  ✅ Context switching and real-time loading');
    console.log('  ✅ Progress tracking and context updates');
    console.log('  ✅ Context cleanup and maintenance');

    return {
      userId,
      jsConceptId,
      algoConceptId,
      contextIds,
      jsContext,
      switchedContext,
      compressedContext,
      relevantContext,
    };

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    throw error;
  }
}

/**
 * Example: Real-time context management for chat
 */
export async function demonstrateChatContextManagement(
  userId: string,
  conceptId: string,
  conversationId: string
) {
  try {
    console.log('💬 Demonstrating chat context management...\n');

    // 1. Build initial context for chat
    const initialContext = await contextManager.buildContext(userId, {
      conceptId,
      conversationId,
      maxTokens: 6000,
      includeHistory: true,
      historyLimit: 15,
    });

    console.log('📝 Initial chat context built:');
    console.log(`  - Conversation history: ${initialContext.conversationHistory.length} messages`);
    console.log(`  - Relevant knowledge: ${initialContext.relevantKnowledge.length} chunks`);
    console.log(`  - System prompts: ${initialContext.systemPrompts.length}`);

    // 2. Simulate storing new conversation context
    const mockMessages = [
      {
        id: 'msg-1',
        conversationId,
        role: 'user' as const,
        content: 'Can you explain how JavaScript event loop works?',
        createdAt: new Date().toISOString(),
        attachments: null,
        tokens: null,
        model: null,
        conceptId,
        contextUsed: null,
        cost: null,
        processingTime: null,
        feedback: null,
        feedbackNote: null,
      },
      {
        id: 'msg-2',
        conversationId,
        role: 'assistant' as const,
        content: 'The JavaScript event loop is a fundamental concept that handles asynchronous operations...',
        createdAt: new Date().toISOString(),
        attachments: null,
        tokens: 150,
        model: 'gpt-4',
        conceptId,
        contextUsed: JSON.stringify({ relevantChunks: 3, systemPrompts: 2 }),
        cost: 0.003,
        processingTime: 1200,
        feedback: null,
        feedbackNote: null,
      },
    ];

    await contextManager.storeConversationContext(conversationId, mockMessages, conceptId);
    console.log('✅ Stored conversation context as embeddings');

    // 3. Retrieve updated context
    const updatedContext = await contextManager.buildContext(userId, {
      conceptId,
      conversationId,
      maxTokens: 6000,
    });

    console.log('🔄 Updated context after conversation:');
    console.log(`  - Total tokens: ${updatedContext.totalTokens}`);
    console.log(`  - Build time: ${updatedContext.metadata.buildTime.toISOString()}`);

    return {
      initialContext,
      updatedContext,
      mockMessages,
    };

  } catch (error) {
    console.error('❌ Chat context demonstration failed:', error);
    throw error;
  }
}

// Export for use in other parts of the application
export {
  contextManager,
  contextEmbeddingService,
};
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';

/**
 * Get conversations for a specific concept
 * 
 * GET /api/chat/concepts/[conceptId]?limit=20
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> }
) {
  try {
    const user = await requireAuth();
    const { conceptId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    // Verify concept belongs to user
    const concept = await learningConceptService.getConceptById(conceptId);
    if (!concept || concept.userId !== user.id) {
      return NextResponse.json(
        { error: 'Concept not found or access denied' },
        { status: 404 }
      );
    }
    
    const conversations = await ChatService.getConversationsByConcept(
      user.id,
      conceptId,
      limit
    );
    
    return NextResponse.json({
      success: true,
      concept: {
        id: concept.id,
        name: concept.name,
        category: concept.category,
        difficulty: concept.difficulty,
        completionPercentage: concept.completionPercentage,
      },
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        context: conv.context,
        messageCount: conv.messageCount,
        lastMessageAt: conv.lastMessageAt,
        totalCost: conv.totalCost,
        aiProvider: conv.aiProvider,
        providerStats: conv.providerStats,
        createdAt: conv.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get concept conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to get concept conversations' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';

/**
 * Get user's conversations with concept support
 * 
 * GET /api/chat/conversations?limit=20&conceptId=uuid&includeStats=true
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const conceptId = searchParams.get('conceptId') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';
    
    const conversations = await ChatService.getUserConversations(user.id, {
      limit,
      conceptId,
      includeStats,
    });
    
    return NextResponse.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        context: conv.context,
        conceptId: conv.conceptId,
        concept: conv.concept ? {
          id: conv.concept.id,
          name: conv.concept.name,
          category: conv.concept.category,
          difficulty: conv.concept.difficulty,
          completionPercentage: conv.concept.completionPercentage,
        } : null,
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
    
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}

/**
 * Create a new conversation with concept support
 * 
 * POST /api/chat/conversations
 * Body: { title?: string, context?: string, conceptId?: string, aiProvider?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    // Validate concept if provided
    if (body.conceptId) {
      const concept = await learningConceptService.getConceptById(body.conceptId);
      if (!concept || concept.userId !== user.id) {
        return NextResponse.json(
          { error: 'Invalid concept ID or access denied' },
          { status: 400 }
        );
      }
    }
    
    const conversation = await ChatService.createConversation({
      userId: user.id,
      title: body.title || 'New Chat',
      context: body.context || 'general',
      conceptId: body.conceptId || null,
      aiProvider: body.aiProvider || null,
    });
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context,
        conceptId: conversation.conceptId,
        concept: conversation.concept ? {
          id: conversation.concept.id,
          name: conversation.concept.name,
          category: conversation.concept.category,
          difficulty: conversation.concept.difficulty,
        } : null,
        aiProvider: conversation.aiProvider,
        messageCount: conversation.messageCount,
        totalCost: conversation.totalCost,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

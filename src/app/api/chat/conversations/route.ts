import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';

/**
 * Get user's conversations
 * 
 * GET /api/chat/conversations?limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const conversations = await ChatService.getUserConversations(user.id, limit);
    
    return NextResponse.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        context: conv.context,
        messageCount: conv.messageCount,
        lastMessageAt: conv.lastMessageAt,
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
 * Create a new conversation
 * 
 * POST /api/chat/conversations
 * Body: { title?: string, context?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const conversation = await ChatService.createConversation({
      userId: user.id,
      title: body.title || 'New Chat',
      context: body.context || 'general',
    });
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        context: conversation.context,
        messageCount: conversation.messageCount,
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

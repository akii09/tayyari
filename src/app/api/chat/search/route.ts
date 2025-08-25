import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';

/**
 * Search messages across conversations with concept filtering
 * 
 * GET /api/chat/search?query=algorithm&conceptId=uuid&conversationId=uuid&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query');
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    const conceptId = searchParams.get('conceptId') || undefined;
    const conversationId = searchParams.get('conversationId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    const messages = await ChatService.searchMessages(user.id, query, {
      limit,
      conceptId,
      conversationId,
    });
    
    return NextResponse.json({
      success: true,
      query,
      results: messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        conceptId: msg.conceptId,
        tokens: msg.tokens,
        model: msg.model,
        cost: msg.cost,
        processingTime: msg.processingTime,
        providerInfo: msg.providerInfo,
        contextInfo: msg.contextInfo,
        feedback: msg.feedback,
        createdAt: msg.createdAt,
      })),
      totalResults: messages.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Search messages error:', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}
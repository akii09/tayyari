import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';

/**
 * Get a specific conversation with its messages
 * 
 * GET /api/chat/conversations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    const chatData = await ChatService.getConversationWithMessages(id);
    
    if (!chatData) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Verify the conversation belongs to the user
    if (chatData.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: chatData.conversation.id,
        title: chatData.conversation.title,
        context: chatData.conversation.context,
        messageCount: chatData.conversation.messageCount,
        lastMessageAt: chatData.conversation.lastMessageAt,
        createdAt: chatData.conversation.createdAt,
      },
      messages: chatData.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
        tokens: msg.tokens,
        model: msg.model,
        feedback: msg.feedback,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

/**
 * Update conversation title
 * 
 * PUT /api/chat/conversations/[id]
 * Body: { title: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Verify conversation belongs to user
    const chatData = await ChatService.getConversationWithMessages(id);
    if (!chatData || chatData.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    const success = await ChatService.updateConversationTitle(id, body.title);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conversation updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * Delete a conversation
 * 
 * DELETE /api/chat/conversations/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Verify conversation belongs to user
    const chatData = await ChatService.getConversationWithMessages(id);
    if (!chatData || chatData.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    const success = await ChatService.deleteConversation(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';
import { LearningConceptService } from '@/lib/database/services/learningConceptService';

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
        conceptId: chatData.conversation.conceptId,
        concept: chatData.conversation.concept ? {
          id: chatData.conversation.concept.id,
          name: chatData.conversation.concept.name,
          category: chatData.conversation.concept.category,
          difficulty: chatData.conversation.concept.difficulty,
          completionPercentage: chatData.conversation.concept.completionPercentage,
        } : null,
        aiProvider: chatData.conversation.aiProvider,
        contextSummary: chatData.conversation.contextSummary,
        messageCount: chatData.conversation.messageCount,
        lastMessageAt: chatData.conversation.lastMessageAt,
        totalCost: chatData.conversation.totalCost,
        providerStats: chatData.conversation.providerStats,
        createdAt: chatData.conversation.createdAt,
      },
      messages: chatData.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
        tokens: msg.tokens,
        model: msg.model,
        conceptId: msg.conceptId,
        cost: msg.cost,
        processingTime: msg.processingTime,
        feedback: msg.feedback,
        feedbackNote: msg.feedbackNote,
        providerInfo: msg.providerInfo,
        contextInfo: msg.contextInfo,
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
 * Update conversation (title, concept, etc.)
 * 
 * PUT /api/chat/conversations/[id]
 * Body: { title?: string, conceptId?: string, action?: 'switch_concept' | 'get_analytics' }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    
    // Verify conversation belongs to user
    const chatData = await ChatService.getConversationWithMessages(id);
    if (!chatData || chatData.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (body.action === 'switch_concept') {
      if (!body.conceptId) {
        return NextResponse.json(
          { error: 'Concept ID is required for concept switch' },
          { status: 400 }
        );
      }

      // Validate concept
      const concept = await learningConceptService.getConceptById(body.conceptId);
      if (!concept || concept.userId !== user.id) {
        return NextResponse.json(
          { error: 'Invalid concept ID or access denied' },
          { status: 400 }
        );
      }

      const updatedConversation = await ChatService.switchConversationConcept(
        id,
        body.conceptId,
        user.id
      );

      return NextResponse.json({
        success: true,
        message: 'Conversation concept switched successfully',
        conversation: {
          id: updatedConversation.id,
          conceptId: updatedConversation.conceptId,
          concept: updatedConversation.concept ? {
            id: updatedConversation.concept.id,
            name: updatedConversation.concept.name,
            category: updatedConversation.concept.category,
            difficulty: updatedConversation.concept.difficulty,
          } : null,
        },
      });
    }

    if (body.action === 'get_analytics') {
      const analytics = await ChatService.getConversationAnalytics(id);
      
      return NextResponse.json({
        success: true,
        analytics,
      });
    }

    // Default: Update title
    if (body.title && typeof body.title === 'string') {
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
    }

    return NextResponse.json(
      { error: 'No valid update action specified' },
      { status: 400 }
    );
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

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { ChatService } from '@/lib/database/services/chatService';

export interface MessageRequest {
  conversationId: string;
  content: string;
  attachments?: any[];
  conceptId?: string;
  preferredProvider?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Add a message to a conversation with AI-powered response
 * 
 * POST /api/chat/messages
 * Body: { conversationId: string, content: string, attachments?: any[], conceptId?: string, preferredProvider?: string, maxTokens?: number, temperature?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: MessageRequest = await request.json();
    
    if (!body.conversationId || !body.content) {
      return NextResponse.json(
        { error: 'Conversation ID and content are required' },
        { status: 400 }
      );
    }
    
    // Verify conversation belongs to user
    const chatData = await ChatService.getConversationWithMessages(body.conversationId);
    if (!chatData || chatData.conversation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // Add user message
    const userMessage = await ChatService.addMessage({
      conversationId: body.conversationId,
      role: 'user',
      content: body.content,
      attachments: body.attachments ? JSON.stringify(body.attachments) : null,
      conceptId: body.conceptId || chatData.conversation.conceptId || null,
    });
    
    try {
      // Generate AI response using the enhanced system
      const aiResult = await ChatService.generateAIResponse(
        body.conversationId,
        body.content,
        {
          conceptId: body.conceptId || chatData.conversation.conceptId || undefined,
          preferredProvider: body.preferredProvider,
          maxTokens: body.maxTokens,
          temperature: body.temperature,
        }
      );
      
      return NextResponse.json({
        success: true,
        messages: [
          {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            attachments: userMessage.attachments ? JSON.parse(userMessage.attachments) : null,
            conceptId: userMessage.conceptId,
            createdAt: userMessage.createdAt,
          },
          {
            id: aiResult.response.id,
            role: aiResult.response.role,
            content: aiResult.response.content,
            tokens: aiResult.response.tokens,
            model: aiResult.response.model,
            conceptId: aiResult.response.conceptId,
            cost: aiResult.response.cost,
            processingTime: aiResult.response.processingTime,
            providerInfo: aiResult.response.providerInfo,
            contextInfo: aiResult.response.contextInfo,
            createdAt: aiResult.response.createdAt,
          },
        ],
        contextInfo: aiResult.contextInfo,
      });
    } catch (aiError) {
      console.error('AI response generation failed:', aiError);
      
      // Fallback to simple response if AI fails
      const fallbackResponse = await generateFallbackResponse(body.content, chatData.conversation.context || 'general');
      
      const aiMessage = await ChatService.addMessage({
        conversationId: body.conversationId,
        role: 'assistant',
        content: fallbackResponse.content,
        tokens: fallbackResponse.tokens,
        model: 'fallback-v1',
        conceptId: body.conceptId || chatData.conversation.conceptId || null,
      });
      
      return NextResponse.json({
        success: true,
        messages: [
          {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            attachments: userMessage.attachments ? JSON.parse(userMessage.attachments) : null,
            conceptId: userMessage.conceptId,
            createdAt: userMessage.createdAt,
          },
          {
            id: aiMessage.id,
            role: aiMessage.role,
            content: aiMessage.content,
            tokens: aiMessage.tokens,
            model: aiMessage.model,
            conceptId: aiMessage.conceptId,
            createdAt: aiMessage.createdAt,
          },
        ],
        warning: 'AI response generated using fallback system',
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Add message error:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

/**
 * Update message feedback
 * 
 * PUT /api/chat/messages
 * Body: { messageId: string, feedback: 'positive' | 'negative', note?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    if (!body.messageId || !body.feedback) {
      return NextResponse.json(
        { error: 'Message ID and feedback are required' },
        { status: 400 }
      );
    }
    
    if (!['positive', 'negative'].includes(body.feedback)) {
      return NextResponse.json(
        { error: 'Feedback must be positive or negative' },
        { status: 400 }
      );
    }
    
    // For security, we should verify the message belongs to the user's conversation
    // For now, we'll trust the frontend to only send valid message IDs
    
    const success = await ChatService.updateMessageFeedback(
      body.messageId,
      body.feedback,
      body.note
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Feedback updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Update feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

/**
 * Fallback AI response generator when main AI system fails
 */
async function generateFallbackResponse(userMessage: string, context: string): Promise<{
  content: string;
  tokens: number;
}> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const responses = {
    dsa: [
      "Great question! Let's break down this algorithm problem step by step. First, let's identify the pattern and then work through the optimal solution.",
      "This is a classic problem that can be solved using dynamic programming. Let me walk you through the approach and explain the time complexity.",
      "I can help you with this data structure question. The key insight here is to use the right data structure for efficient operations.",
    ],
    system: [
      "Excellent system design question! Let's start with the high-level architecture and then dive into the specific components and their interactions.",
      "For this system design problem, we need to consider scalability, reliability, and performance. Let me outline a comprehensive solution.",
      "This is a common system design pattern. Let's discuss the trade-offs and design decisions involved in building this system.",
    ],
    behavioral: [
      "That's a thoughtful behavioral question. Let me help you structure your response using the STAR method (Situation, Task, Action, Result).",
      "This question is assessing your leadership and problem-solving skills. Here's how you can frame your experience effectively.",
      "Great question about team dynamics. Let's work on crafting a compelling story that showcases your soft skills.",
    ],
    general: [
      "I'm here to help with your interview preparation! Whether it's algorithms, system design, or behavioral questions, I can provide guidance tailored to your goals.",
      "Thanks for your question! I can assist with coding problems, system architecture, or help you practice behavioral interview responses.",
      "I'd be happy to help you prepare for your interviews. What specific area would you like to focus on today?",
    ],
  };
  
  const contextResponses = responses[context as keyof typeof responses] || responses.general;
  const randomResponse = contextResponses[Math.floor(Math.random() * contextResponses.length)];
  
  // Add some personalization based on message content
  let finalResponse = randomResponse;
  
  if (userMessage.toLowerCase().includes('algorithm') || userMessage.toLowerCase().includes('leetcode')) {
    finalResponse += "\n\n**Algorithm Approach:**\n1. Understand the problem constraints\n2. Identify patterns and edge cases\n3. Code the solution step by step\n4. Analyze time and space complexity\n\nWould you like me to help you with a specific problem?";
  } else if (userMessage.toLowerCase().includes('system') || userMessage.toLowerCase().includes('design')) {
    finalResponse += "\n\n**System Design Framework:**\n1. **Requirements** - Functional and non-functional\n2. **High-level design** - Major components\n3. **Detailed design** - APIs, database schema\n4. **Scale and optimize** - Handle bottlenecks\n\nWhat system would you like to design together?";
  } else if (userMessage.toLowerCase().includes('interview') || userMessage.toLowerCase().includes('behavioral')) {
    finalResponse += "\n\n**Behavioral Interview Tips:**\n- Use specific examples from your experience\n- Quantify your impact with numbers\n- Show growth and learning from challenges\n- Practice your stories beforehand\n\nWhat type of behavioral question are you preparing for?";
  }
  
  return {
    content: finalResponse,
    tokens: Math.floor(finalResponse.length / 4), // Rough token estimate
  };
}

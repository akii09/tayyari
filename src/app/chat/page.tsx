"use client";

import { useState, useEffect, useRef } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: File[];
}

// Use static timestamps to prevent hydration mismatches
const baseTime = new Date('2025-01-01T12:00:00Z');

const initialMessages: Message[] = [
  { 
    id: "m1", 
    role: "assistant", 
    content: "Hello! I'm NymbleUp AI, your development assistant. I can help you with coding, system design, code reviews, and much more. What would you like to work on today?",
    timestamp: new Date(baseTime.getTime() - 5 * 60 * 1000) // 5 minutes before base
  },
  { 
    id: "m2", 
    role: "user", 
    content: "Can you help me with React component optimization?",
    timestamp: new Date(baseTime.getTime() - 3 * 60 * 1000) // 3 minutes before base
  },
  { 
    id: "m3", 
    role: "assistant", 
    content: "Absolutely! React optimization is crucial for performance. Here are the key strategies:\n\n**1. Memoization**\n- Use `React.memo()` for components\n- Use `useMemo()` for expensive calculations\n- Use `useCallback()` for function references\n\n**2. Code Splitting**\n```javascript\nconst LazyComponent = React.lazy(() => import('./Component'));\n```\n\n**3. Avoid Unnecessary Re-renders**\n- Move state down\n- Split components\n- Use proper dependency arrays\n\nWould you like me to dive deeper into any of these techniques?",
    timestamp: new Date(baseTime.getTime() - 2 * 60 * 1000) // 2 minutes before base
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Check if user is at bottom of chat
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setIsAtBottom(atBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, files?: File[], code?: string) => {
    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: new Date(),
      files,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Auto-scroll to bottom when user sends a message
    setIsAtBottom(true);

    // Simulate AI response with streaming
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: generateMockResponse(content),
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);

      // Stop streaming after a delay
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id ? { ...msg, isStreaming: false } : msg
          )
        );
      }, 3000);
    }, 1000);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleExportChat = () => {
    const chatContent = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    console.log(`Feedback: ${type}`);
    // Implement feedback handling
  };

  const isCurrentlyStreaming = messages.some(msg => msg.isStreaming);

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto" 
        id="messages-container"
      >
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Start a new conversation
              </h2>
              <p className="text-text-muted">
                Ask me anything about coding, system design, or development best practices.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
                files={message.files}
                timestamp={message.timestamp}
                onCopy={handleCopyMessage}
                onFeedback={handleFeedback}
              />
            ))
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Scroll to bottom padding */}
        <div className="h-32" />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 glass-card p-3 rounded-full shadow-lg hover:scale-105 transition-all z-10"
          title="Scroll to bottom"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

function generateMockResponse(userInput: string): string {
  const responses = [
    "Great question! Let me help you with that. Here's a comprehensive approach to solve this problem...",
    "I understand what you're looking for. Based on best practices, I'd recommend the following strategy...",
    "That's an interesting challenge. Let me break this down into manageable steps for you...",
    "Perfect! This is a common scenario in development. Here's how I would approach it...",
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  // Add some relevant content based on keywords
  if (userInput.toLowerCase().includes('react')) {
    return `${randomResponse}\n\n**React Best Practices:**\n\n1. **Component Composition**: Break down complex components into smaller, reusable pieces\n2. **State Management**: Use local state when possible, lift state up when needed\n3. **Performance**: Implement memoization and lazy loading\n\n\`\`\`jsx\nfunction OptimizedComponent({ data }) {\n  const memoizedValue = useMemo(() => \n    expensiveCalculation(data), [data]\n  );\n  \n  return <div>{memoizedValue}</div>;\n}\n\`\`\`\n\nWould you like me to elaborate on any of these points?`;
  }
  
  if (userInput.toLowerCase().includes('design') || userInput.toLowerCase().includes('system')) {
    return `${randomResponse}\n\n**System Design Fundamentals:**\n\n- **Scalability**: Design for horizontal scaling\n- **Reliability**: Implement redundancy and fault tolerance\n- **Performance**: Optimize for latency and throughput\n- **Security**: Follow security best practices\n\nLet's dive deeper into your specific requirements!`;
  }

  return `${randomResponse}\n\nI'm here to help with any technical questions you might have. Feel free to share more details about your specific use case!`;
}



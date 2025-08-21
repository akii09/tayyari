"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { FloatingActions } from "@/components/shell/FloatingActions";
import { CommandPalette, defaultCommands } from "@/components/ui/CommandPalette";

import { useScreenReaderAnnouncement, useFocusManagement } from "@/components/ui/AccessibilityEnhancer";
import { useFeatureDetection } from "@/components/ui/ProgressiveEnhancement";
import { useErrorHandler } from "@/components/ui/ErrorBoundary";
import { useNotifications, notificationUtils } from "@/components/ui/NotificationSystem";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";

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
    content: "Hello! I'm TayyarAI, your interview preparation assistant. I can help you with coding interviews, system design, behavioral questions, and much more. What would you like to prepare for today?",
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
    content: `Absolutely! React optimization is crucial for performance. Here are the key strategies:

## 1. Memoization Techniques

### Component Memoization
- Use \`React.memo()\` for components to prevent unnecessary re-renders
- Use \`useMemo()\` for expensive calculations  
- Use \`useCallback()\` for function references

\`\`\`typescript
const OptimizedComponent = React.memo(({ data }) => {
  const expensiveValue = useMemo(() => {
    return data.reduce((acc, item) => acc + item.value, 0);
  }, [data]);

  return <div>{expensiveValue}</div>;
});
\`\`\`

## 2. Code Splitting

### Dynamic Imports
\`\`\`javascript
const LazyComponent = React.lazy(() => import('./Component'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
\`\`\`

## 3. State Management Best Practices

> **Important**: Keep state as close as possible to where it's used

| Strategy | Use Case | Performance Impact |
|----------|----------|-------------------|
| Local State | Component-specific data | ✅ High |
| Context | Shared app state | ⚠️ Medium |
| External Store | Complex state logic | ✅ High |

### Example: State Optimization
\`\`\`tsx
// ❌ Bad: All components re-render when count changes
function BadExample() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState(null);
  
  return (
    <div>
      <ExpensiveComponent user={user} />
      <Counter count={count} setCount={setCount} />
    </div>
  );
}

// ✅ Good: Separate concerns
function GoodExample() {
  const [user, setUser] = useState(null);
  
  return (
    <div>
      <ExpensiveComponent user={user} />
      <CounterWrapper />
    </div>
  );
}
\`\`\`

Would you like me to dive deeper into any of these techniques?`,
    timestamp: new Date(baseTime.getTime() - 2 * 60 * 1000) // 2 minutes before base
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enhanced hooks
  const { announce } = useScreenReaderAnnouncement();
  const { focusElement } = useFocusManagement();
  const featureDetection = useFeatureDetection();
  const { handleError } = useErrorHandler();
  const { showNotification } = useNotifications();
  const router = useRouter();

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
    try {
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
      announce("Message sent", "polite");
      
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
        announce("AI is responding", "polite");

        // Stop streaming after a delay
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessage.id ? { ...msg, isStreaming: false } : msg
            )
          );
          announce("AI response complete", "polite");
        }, 3000);
      }, 1000);

    } catch (error) {
      setIsLoading(false);
      setHasError(true);
      handleError(error as Error, "sending message");
      
      showNotification(notificationUtils.error(
        "Failed to send message",
        "Please check your connection and try again",
        [{
          label: "Retry",
          action: () => handleSendMessage(content, files, code),
          style: "primary"
        }]
      ));
    }
  };

  // Command palette keyboard shortcut
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSettings = () => {
    router.push('/settings');
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



  // Enhanced message action handlers - simplified without toast spam
  const handleEditMessage = (messageId: string) => {
    console.log(`Edit message ${messageId}`);
  };

  const handleShareMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleReactToMessage = (messageId: string) => {
    console.log(`React to message ${messageId}`);
  };

  const handleBookmarkMessage = (messageId: string) => {
    console.log(`Bookmark message ${messageId}`);
  };

  const handleReplyToMessage = (messageId: string) => {
    console.log(`Reply to message ${messageId}`);
  };

  // Enhanced commands with actual functionality
  const enhancedCommands = defaultCommands.map(cmd => ({
    ...cmd,
    action: () => {
      switch (cmd.id) {
        case 'clear-chat':
          handleClearChat();
          break;
        case 'export-chat':
          handleExportChat();
          break;
        case 'new-chat':
          setMessages([]);
          break;
        default:
          cmd.action();
      }
    }
  }));

  const isCurrentlyStreaming = messages.some(msg => msg.isStreaming);

  return (
    <div className="flex flex-col min-h-screen pl-20 sm:pl-24">
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
            messages.map((message, index) => (
              <div
                key={message.id}
                className={featureDetection.shouldUseAnimations() ? "animate-message-appear" : ""}
                style={{ 
                  animationDelay: featureDetection.shouldUseAnimations() ? `${index * 100}ms` : '0ms',
                  animationFillMode: 'both'
                }}
              >
                <ChatMessage
                  role={message.role}
                  content={message.content}
                  isStreaming={message.isStreaming}
                  files={message.files}
                  timestamp={message.timestamp}
                  onCopy={handleCopyMessage}
                  onFeedback={handleFeedback}
                  onEdit={() => handleEditMessage(message.id)}
                  onShare={() => handleShareMessage(message.id)}
                  onReact={() => handleReactToMessage(message.id)}
                  onBookmark={() => handleBookmarkMessage(message.id)}
                  onReply={() => handleReplyToMessage(message.id)}
                />
              </div>
            ))
          )}

          {/* Enhanced Loading State */}
          {isLoading && (
            <div className="animate-message-appear">
              <LoadingSkeleton variant="message" lines={3} />
            </div>
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

      {/* Floating Actions */}
      <FloatingActions
        progress={85}
        onClear={handleClearChat}
        onExport={handleExportChat}
        onSettings={handleSettings}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={enhancedCommands}
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



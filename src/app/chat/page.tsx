"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { AppSidebar } from "@/components/chat/AppSidebar";
import { MessagesArea } from "@/components/chat/MessagesArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { FloatingActions } from "@/components/shell/FloatingActions";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

// Lazy load heavy components
const ConceptSwitcher = lazy(() => import("@/components/chat/ConceptSwitcher").then(m => ({ default: m.ConceptSwitcher })));
const MultiConceptProgress = lazy(() => import("@/components/progress/MultiConceptProgress").then(m => ({ default: m.MultiConceptProgress })));
const CommandPalette = lazy(() => import("@/components/ui/CommandPalette").then(m => ({ default: m.CommandPalette })));

// Import defaultCommands separately to avoid lazy loading issues
import { defaultCommands } from "@/components/ui/CommandPalette";

import { useScreenReaderAnnouncement, useFocusManagement } from "@/components/ui/AccessibilityEnhancer";
import { useFeatureDetection } from "@/components/ui/ProgressiveEnhancement";
import { useErrorHandler } from "@/components/ui/ErrorBoundary";
import { useNotifications } from "@/components/ui/NotificationSystem";
import { useToast } from "@/components/ui/Toast";
import { useAIModel } from "@/lib/ai/AIModelContext";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: File[];
  conceptId?: string;
  model?: string;
  provider?: string;
}

interface LearningConcept {
  id: string;
  name: string;
  category: string;
  completionPercentage: number;
  isActive: boolean;
}

interface UserProgress {
  totalConcepts: number;
  activeConcepts: number;
  completedConcepts: number;
  averageProgress: number;
  totalTimeSpent: number;
}

type SidebarView = 'concepts' | 'progress' | 'analytics' | 'settings';

export default function ChatPage() {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('concepts');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Learning state
  const [selectedConcept, setSelectedConcept] = useState<LearningConcept | null>(null);
  const [userConcepts, setUserConcepts] = useState<LearningConcept[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Hooks
  const router = useRouter();
  const { announce } = useScreenReaderAnnouncement();
  const { focusElement } = useFocusManagement();
  const featureDetection = useFeatureDetection();
  const { handleError } = useErrorHandler();
  const { showNotification } = useNotifications();
  const toast = useToast();
  const { selectedModel, selectedProvider } = useAIModel();

  // Initialize data on component mount
  useEffect(() => {
    initializeData();
  }, []);

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

  const initializeData = async () => {
    try {
      // Fetch user concepts
      const conceptsResponse = await fetch('/api/concepts');
      if (conceptsResponse.ok) {
        const conceptsData = await conceptsResponse.json();
        if (conceptsData.success) {
          setUserConcepts(conceptsData.concepts);
          // Set first active concept as default
          const activeConcept = conceptsData.concepts.find((c: LearningConcept) => c.isActive);
          if (activeConcept) {
            setSelectedConcept(activeConcept);
          }
        }
      }

      // Fetch user progress
      const progressResponse = await fetch('/api/learning/analytics');
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        if (progressData.success) {
          setUserProgress(progressData.analytics);
        }
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
    }
  };

  const handleSendMessage = async (content: string, files?: File[], code?: string) => {
    try {
      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content,
        timestamp: new Date(),
        files,
        conceptId: selectedConcept?.id,
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      announce("Message sent", "polite");

      // Create conversation ID if not exists
      const currentConversationId = conversationId || `conv-${Date.now()}`;
      if (!conversationId) {
        setConversationId(currentConversationId);
      }

      // Call the AI API with selected model and concept
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId,
          conceptId: selectedConcept?.id,
          preferredProvider: selectedProvider?.type,
          maxTokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      // Ensure we have the expected message structure
      if (!data.messages || data.messages.length < 2) {
        throw new Error('Invalid response format from API');
      }

      // Add AI response
      const aiMessage: Message = {
        id: data.messages[1].id || `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.messages[1].content || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(data.messages[1].timestamp || new Date().toISOString()),
        isStreaming: false,
        conceptId: selectedConcept?.id,
        model: data.messages[1].model || 'unknown',
        provider: data.messages[1].provider || 'unknown',
      };

      setMessages(prev => {
        // Remove the user message we added optimistically and add both messages from API
        const withoutOptimistic = prev.slice(0, -1);
        return [
          ...withoutOptimistic,
          {
            ...userMessage,
            id: data.messages[0].id,
            timestamp: new Date(data.messages[0].timestamp),
          },
          aiMessage,
        ];
      });

      // Update conversation ID from response
      if (data.conversationId && data.conversationId !== 'temp-conversation') {
        setConversationId(data.conversationId);
      }

      setIsLoading(false);
      announce("AI response received", "polite");

      // Update concept progress if applicable
      if (selectedConcept) {
        updateConceptProgress(selectedConcept.id, 5); // 5 minutes of study time
      }

    } catch (error) {
      setIsLoading(false);
      handleError(error as Error, "sending message");
      
      // Remove the optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `❌ **Error sending message**\n\n${error instanceof Error ? error.message : "Please check your connection and try again"}\n\n*You can try sending your message again or check your AI provider settings.*`,
        timestamp: new Date(),
        isStreaming: false,
        model: 'error',
        provider: 'system',
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(
        "Failed to send message",
        error instanceof Error ? error.message : "Please check your connection and try again"
      );
    }
  };

  const updateConceptProgress = async (conceptId: string, timeSpent: number) => {
    try {
      await fetch('/api/concepts/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId,
          timeSpent,
          completionPercentage: Math.min((userProgress?.averageProgress || 0) + 1, 100),
        }),
      });
      
      // Refresh progress data
      initializeData();
    } catch (error) {
      console.error('Failed to update concept progress:', error);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleSettings = () => {
    setShowSidebar(true);
    setSidebarView('settings');
  };

  const handleConceptSelect = (concept: LearningConcept) => {
    setSelectedConcept(concept);
    toast.success(`Switched to ${concept.name}`, "Now focusing on this learning concept");
  };

  const handleToggleSidebar = (view?: SidebarView) => {
    if (view) {
      setSidebarView(view);
      setShowSidebar(true);
    } else {
      setShowSidebar(!showSidebar);
    }
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

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    console.log(`Feedback for ${messageId}: ${feedback}`);
    // Implement feedback handling
  };

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

  // Memoized sidebar content to prevent unnecessary re-renders
  const renderSidebarContent = useMemo(() => {
    const LoadingFallback = () => (
      <div className="p-4">
        <LoadingSkeleton variant="card" lines={3} />
      </div>
    );

    switch (sidebarView) {
      case 'concepts':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ConceptSwitcher
              concepts={userConcepts}
              selectedConcept={selectedConcept}
              onConceptSelect={handleConceptSelect}
            />
          </Suspense>
        );
      
      case 'progress':
        return userProgress ? (
          <Suspense fallback={<LoadingFallback />}>
            <MultiConceptProgress
              concepts={userConcepts}
              analytics={userProgress}
            />
          </Suspense>
        ) : (
          <div className="text-center text-text-muted py-8">
            Loading progress data...
          </div>
        );
      
      case 'analytics':
        return (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Learning Stats</h3>
              {userProgress ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Total Concepts</span>
                    <span className="text-text-primary font-semibold">{userProgress.totalConcepts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Active</span>
                    <span className="text-electric-blue font-semibold">{userProgress.activeConcepts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Completed</span>
                    <span className="text-neon-green font-semibold">{userProgress.completedConcepts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Avg Progress</span>
                    <span className="text-text-primary font-semibold">{userProgress.averageProgress.toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-text-muted text-sm">Loading analytics...</div>
              )}
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-sm font-medium text-text-secondary mb-3">🤖 AI Provider</h3>
              <div className="text-sm text-text-muted mb-3">
                Current: {selectedProvider?.name || 'None selected'}
              </div>
              <button
                onClick={() => router.push('/admin/ai-providers')}
                className="w-full p-3 bg-electric-blue/20 hover:bg-electric-blue/30 rounded-lg transition-colors text-electric-blue text-sm font-medium border border-electric-blue/20"
              >
                Configure AI Providers
              </button>
            </div>
            
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-sm font-medium text-text-secondary mb-3">🚀 Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition-colors text-text-primary flex items-center gap-2"
                >
                  <span>📊</span> Dashboard
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition-colors text-text-primary flex items-center gap-2"
                >
                  <span>⚙️</span> Admin Panel
                </button>
                <button
                  onClick={handleExportChat}
                  className="w-full text-left p-3 hover:bg-white/10 rounded-lg transition-colors text-text-primary flex items-center gap-2"
                >
                  <span>💾</span> Export Chat
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [sidebarView, userConcepts, selectedConcept, userProgress, selectedProvider, router, handleConceptSelect, handleExportChat]);

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

  return (
    <ChatLayout
      sidebar={
        <AppSidebar
          currentView={sidebarView}
          onViewChange={setSidebarView}
          onClose={() => setShowSidebar(false)}
        >
          {renderSidebarContent}
        </AppSidebar>
      }
      header={
        <ChatHeader
          onSidebarToggle={() => setShowSidebar(!showSidebar)}
          currentConcept={selectedConcept}
          currentProvider={selectedProvider}
          onConceptsClick={() => handleToggleSidebar('concepts')}
          onProgressClick={() => handleToggleSidebar('progress')}
          onAnalyticsClick={() => handleToggleSidebar('analytics')}
          onSettingsClick={() => handleToggleSidebar('settings')}
        />
      }
      input={
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      }
      floatingActions={
        <FloatingActions
          progress={userProgress?.averageProgress || 0}
          onClear={handleClearChat}
          onExport={handleExportChat}
          onSettings={handleSettings}
          onConcepts={() => handleToggleSidebar('concepts')}
          onProgress={() => handleToggleSidebar('progress')}
          onAnalytics={() => handleToggleSidebar('analytics')}
        />
      }
      sidebarOpen={showSidebar}
      onSidebarToggle={() => setShowSidebar(!showSidebar)}
    >
      <MessagesArea
        messages={messages}
        isLoading={isLoading}
        selectedConcept={selectedConcept}
        selectedProvider={selectedProvider}
        onCopyMessage={handleCopyMessage}
        onFeedback={handleFeedback}
        onEditMessage={handleEditMessage}
        onShareMessage={handleShareMessage}
        onReactToMessage={handleReactToMessage}
        onBookmarkMessage={handleBookmarkMessage}
        onReplyToMessage={handleReplyToMessage}
        onConceptsClick={() => handleToggleSidebar('concepts')}
        onProgressClick={() => handleToggleSidebar('progress')}
      />

      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            commands={enhancedCommands}
          />
        </Suspense>
      )}
    </ChatLayout>
  );
}
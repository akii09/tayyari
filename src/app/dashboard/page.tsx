"use client";

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/base/GlassCard';
import { Button } from '@/components/base/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface Concept {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  completionPercentage: number;
  currentModule: string;
  timeSpent: number;
  lastStudied: string | null;
  isActive: boolean;
}

interface Conversation {
  id: string;
  title: string;
  context: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConcepts: 0,
    activeConcepts: 0,
    completedConcepts: 0,
    totalTimeSpent: 0,
    averageProgress: 0,
    totalConversations: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch concepts
      const conceptsResponse = await fetch('/api/concepts');
      const conceptsData = await conceptsResponse.json();
      
      // Fetch conversations
      const conversationsResponse = await fetch('/api/chat/conversations?limit=5');
      const conversationsData = await conversationsResponse.json();
      
      if (conceptsData.success) {
        setConcepts(conceptsData.concepts);
        
        // Calculate stats
        const totalConcepts = conceptsData.concepts.length;
        const activeConcepts = conceptsData.concepts.filter((c: Concept) => c.isActive).length;
        const completedConcepts = conceptsData.concepts.filter((c: Concept) => c.completionPercentage >= 100).length;
        const totalTimeSpent = conceptsData.concepts.reduce((sum: number, c: Concept) => sum + c.timeSpent, 0);
        const averageProgress = totalConcepts > 0 
          ? conceptsData.concepts.reduce((sum: number, c: Concept) => sum + c.completionPercentage, 0) / totalConcepts 
          : 0;
        
        setStats({
          totalConcepts,
          activeConcepts,
          completedConcepts,
          totalTimeSpent,
          averageProgress,
          totalConversations: conversationsData.success ? conversationsData.conversations.length : 0,
        });
      }
      
      if (conversationsData.success) {
        setConversations(conversationsData.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-red-400';
      default: return 'text-text-secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'programming': return '💻';
      case 'system-design': return '🏗️';
      case 'backend': return '⚙️';
      case 'frontend': return '🎨';
      case 'devops': return '🚀';
      case 'soft-skills': return '🗣️';
      default: return '📚';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Please sign in to view your dashboard
          </h2>
          <Button onClick={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 pl-20 sm:pl-24">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-text-secondary">
            Here's your learning progress and recent activity
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-text-secondary">Loading your dashboard...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">Active Concepts</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.activeConcepts}</p>
                  </div>
                  <div className="text-3xl">📚</div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-400">{stats.completedConcepts}</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">Time Spent</p>
                    <p className="text-2xl font-bold text-text-primary">{Math.round(stats.totalTimeSpent)}h</p>
                  </div>
                  <div className="text-3xl">⏱️</div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">Avg Progress</p>
                    <p className="text-2xl font-bold text-electric-blue">{Math.round(stats.averageProgress)}%</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Learning Concepts */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">Learning Concepts</h2>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => router.push('/concepts')}
                  >
                    View All
                  </Button>
                </div>
                
                {concepts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📚</div>
                    <p className="text-text-secondary mb-4">No learning concepts yet</p>
                    <Button onClick={() => router.push('/onboarding')}>
                      Start Learning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {concepts.slice(0, 5).map((concept) => (
                      <div key={concept.id} className="border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">{getCategoryIcon(concept.category)}</span>
                            <div>
                              <h3 className="font-medium text-text-primary">{concept.name}</h3>
                              <p className="text-sm text-text-secondary">{concept.description}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium ${getDifficultyColor(concept.difficulty)}`}>
                            {concept.difficulty}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <div className="flex justify-between text-xs text-text-secondary mb-1">
                              <span>Progress</span>
                              <span>{Math.round(concept.completionPercentage)}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-electric-blue h-2 rounded-full transition-all duration-300"
                                style={{ width: `${concept.completionPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-xs text-text-secondary">
                            {concept.timeSpent}h / {concept.estimatedHours}h
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Recent Conversations */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">Recent Conversations</h2>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => router.push('/chat')}
                  >
                    New Chat
                  </Button>
                </div>
                
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-text-secondary mb-4">No conversations yet</p>
                    <Button onClick={() => router.push('/chat')}>
                      Start Chatting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <div 
                        key={conversation.id}
                        className="border border-white/10 rounded-lg p-4 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => router.push(`/chat?conversation=${conversation.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-text-primary truncate">
                            {conversation.title}
                          </h3>
                          <span className="text-xs text-text-secondary">
                            {conversation.messageCount} messages
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-secondary capitalize">
                            {conversation.context}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Quick Actions */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="flex items-center justify-center space-x-2 h-12"
                  onClick={() => router.push('/chat')}
                >
                  <span>💬</span>
                  <span>Start New Chat</span>
                </Button>
                <Button 
                  variant="secondary"
                  className="flex items-center justify-center space-x-2 h-12"
                  onClick={() => router.push('/progress')}
                >
                  <span>📊</span>
                  <span>View Progress</span>
                </Button>
                <Button 
                  variant="secondary"
                  className="flex items-center justify-center space-x-2 h-12"
                  onClick={() => router.push('/settings')}
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
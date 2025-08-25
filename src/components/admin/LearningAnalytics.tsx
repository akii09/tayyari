/**
 * Learning Analytics Component
 * Displays learning progress analytics across multiple concepts
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Target,
  RefreshCw,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';
import { MetricCard } from './MetricCard';

interface LearningConcept {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  userCount: number;
  averageProgress: number;
  completionRate: number;
  averageTimeSpent: number;
  totalSessions: number;
}

interface UserProgress {
  userId: string;
  userName: string;
  activeConcepts: number;
  totalProgress: number;
  timeSpent: number;
  lastActive: string;
  milestones: number;
}

interface LearningAnalyticsData {
  overview: {
    totalUsers: number;
    activeConcepts: number;
    totalSessions: number;
    averageProgress: number;
    completionRate: number;
    totalTimeSpent: number;
  };
  concepts: LearningConcept[];
  topUsers: UserProgress[];
  categoryBreakdown: Record<string, {
    conceptCount: number;
    userCount: number;
    averageProgress: number;
    totalTimeSpent: number;
  }>;
  progressTrends: Array<{
    date: string;
    newUsers: number;
    activeSessions: number;
    completions: number;
    averageProgress: number;
  }>;
}

export function LearningAnalytics() {
  const [data, setData] = useState<LearningAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLearningAnalytics();
  }, [timeRange]);

  const fetchLearningAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/learning/analytics?days=${timeRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        // Fallback to mock data if API fails
        const mockData: LearningAnalyticsData = {
        overview: {
          totalUsers: 156,
          activeConcepts: 12,
          totalSessions: 2847,
          averageProgress: 67.3,
          completionRate: 23.1,
          totalTimeSpent: 15420, // minutes
        },
        concepts: [
          {
            id: '1',
            name: 'JavaScript Fundamentals',
            category: 'programming',
            difficulty: 'beginner',
            userCount: 45,
            averageProgress: 78.5,
            completionRate: 34.2,
            averageTimeSpent: 180,
            totalSessions: 567,
          },
          {
            id: '2',
            name: 'React Development',
            category: 'programming',
            difficulty: 'intermediate',
            userCount: 32,
            averageProgress: 56.7,
            completionRate: 18.7,
            averageTimeSpent: 240,
            totalSessions: 423,
          },
          {
            id: '3',
            name: 'Data Structures',
            category: 'computer-science',
            difficulty: 'intermediate',
            userCount: 28,
            averageProgress: 45.3,
            completionRate: 12.5,
            averageTimeSpent: 320,
            totalSessions: 389,
          },
          {
            id: '4',
            name: 'Machine Learning Basics',
            category: 'ai-ml',
            difficulty: 'advanced',
            userCount: 19,
            averageProgress: 34.2,
            completionRate: 8.3,
            averageTimeSpent: 450,
            totalSessions: 234,
          },
        ],
        topUsers: [
          {
            userId: '1',
            userName: 'Alice Johnson',
            activeConcepts: 3,
            totalProgress: 89.2,
            timeSpent: 1240,
            lastActive: '2024-01-15T10:30:00Z',
            milestones: 12,
          },
          {
            userId: '2',
            userName: 'Bob Smith',
            activeConcepts: 2,
            totalProgress: 76.8,
            timeSpent: 980,
            lastActive: '2024-01-15T09:15:00Z',
            milestones: 8,
          },
          {
            userId: '3',
            userName: 'Carol Davis',
            activeConcepts: 4,
            totalProgress: 72.1,
            timeSpent: 1560,
            lastActive: '2024-01-15T11:45:00Z',
            milestones: 15,
          },
        ],
        categoryBreakdown: {
          programming: {
            conceptCount: 5,
            userCount: 89,
            averageProgress: 68.4,
            totalTimeSpent: 8940,
          },
          'computer-science': {
            conceptCount: 3,
            userCount: 45,
            averageProgress: 52.1,
            totalTimeSpent: 4320,
          },
          'ai-ml': {
            conceptCount: 2,
            userCount: 28,
            averageProgress: 41.7,
            totalTimeSpent: 2890,
          },
          mathematics: {
            conceptCount: 2,
            userCount: 34,
            averageProgress: 59.3,
            totalTimeSpent: 3270,
          },
        },
        progressTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          newUsers: Math.floor(Math.random() * 10) + 1,
          activeSessions: Math.floor(Math.random() * 50) + 20,
          completions: Math.floor(Math.random() * 5),
          averageProgress: Math.random() * 20 + 60,
        })),
        };
        
        setData(mockData);
      }
    } catch (err) {
      setError('Network error while fetching learning analytics');
      
      // Fallback to mock data on network error
      const mockData: LearningAnalyticsData = {
        overview: {
          totalUsers: 156,
          activeConcepts: 12,
          totalSessions: 2847,
          averageProgress: 67.3,
          completionRate: 23.1,
          totalTimeSpent: 15420,
        },
        concepts: [
          {
            id: '1',
            name: 'JavaScript Fundamentals',
            category: 'programming',
            difficulty: 'beginner',
            userCount: 45,
            averageProgress: 78.5,
            completionRate: 34.2,
            averageTimeSpent: 180,
            totalSessions: 567,
          },
        ],
        topUsers: [],
        categoryBreakdown: {},
        progressTrends: [],
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLearningAnalytics();
    setRefreshing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      programming: 'bg-blue-100 text-blue-800',
      'computer-science': 'bg-purple-100 text-purple-800',
      'ai-ml': 'bg-indigo-100 text-indigo-800',
      mathematics: 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Learning Analytics</h2>
          <p className="text-gray-600">Monitor learning progress across multiple concepts</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Users"
              value={data.overview.totalUsers.toLocaleString()}
              icon={<Users className="h-5 w-5" />}
              subtitle={`${data.overview.activeConcepts} active concepts`}
              className="bg-blue-50 border-blue-200"
            />
            
            <MetricCard
              title="Average Progress"
              value={`${data.overview.averageProgress.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle={`${data.overview.completionRate.toFixed(1)}% completion rate`}
              className="bg-green-50 border-green-200"
            />
            
            <MetricCard
              title="Total Sessions"
              value={data.overview.totalSessions.toLocaleString()}
              icon={<BookOpen className="h-5 w-5" />}
              subtitle={`${Math.round(data.overview.totalTimeSpent / 60)} hours total`}
              className="bg-yellow-50 border-yellow-200"
            />
            
            <MetricCard
              title="Avg Session Time"
              value={`${Math.round(data.overview.totalTimeSpent / data.overview.totalSessions)} min`}
              icon={<Clock className="h-5 w-5" />}
              subtitle="per learning session"
              className="bg-purple-50 border-purple-200"
            />
          </div>

          {/* Concept Performance */}
          <div className="mb-6 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Concept Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concept
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.concepts.map((concept) => (
                    <tr key={concept.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {concept.name}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(concept.category)}`}>
                              {concept.category.replace('-', ' ')}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(concept.difficulty)}`}>
                              {concept.difficulty}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {concept.userCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${concept.averageProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">
                            {concept.averageProgress.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {concept.completionRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {concept.averageTimeSpent} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {concept.totalSessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Breakdown and Top Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Categories</h3>
              <div className="space-y-4">
                {Object.entries(data.categoryBreakdown).map(([category, stats]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                        {category.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {stats.conceptCount} concepts, {stats.userCount} users
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {stats.averageProgress.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(stats.totalTimeSpent / 60)}h total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Learners</h3>
              <div className="space-y-4">
                {data.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.userName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.activeConcepts} concepts, {user.milestones} milestones
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {user.totalProgress.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(user.timeSpent / 60)}h spent
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Trends Chart */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Activity Trends</h3>
            <div className="h-64 flex items-end justify-between space-x-1">
              {data.progressTrends.slice(-14).map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center space-y-1">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{
                        height: `${(day.activeSessions / 70) * 200}px`,
                        minHeight: '4px'
                      }}
                      title={`${day.activeSessions} sessions`}
                    ></div>
                    <div
                      className="w-full bg-green-500"
                      style={{
                        height: `${(day.newUsers / 10) * 50}px`,
                        minHeight: '2px'
                      }}
                      title={`${day.newUsers} new users`}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600">Active Sessions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">New Users</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
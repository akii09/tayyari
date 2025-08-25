// Unit tests for AIProviderSelector component logic
import { describe, it, expect } from 'vitest';

const mockProviders = [
  {
    id: 'openai-1',
    name: 'OpenAI GPT-4o',
    type: 'openai' as const,
    enabled: true,
    priority: 1,
    status: 'healthy' as const,
    models: ['gpt-4o', 'gpt-4o-mini'],
    currentModel: 'gpt-4o',
    metrics: {
      responseTime: 1200,
      successRate: 98.5,
      totalRequests: 1500,
      totalCost: 25.50,
    },
    lastChecked: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: 'claude-1',
    name: 'Claude 3.5 Sonnet',
    type: 'anthropic' as const,
    enabled: true,
    priority: 2,
    status: 'degraded' as const,
    models: ['claude-3-5-sonnet-20241022'],
    metrics: {
      responseTime: 2000,
      successRate: 85.0,
      totalRequests: 800,
      totalCost: 15.25,
    },
    lastChecked: new Date('2024-01-15T09:30:00Z'),
  },
];

// Helper functions that would be used in the component
function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(2)}`;
}

function getEnabledProviders(providers: typeof mockProviders) {
  return providers.filter(p => p.enabled);
}

function getHealthyProviders(providers: typeof mockProviders) {
  return providers.filter(p => p.enabled && p.status === 'healthy');
}

function getDegradedProviders(providers: typeof mockProviders) {
  return providers.filter(p => p.enabled && p.status === 'degraded');
}

function getUnhealthyProviders(providers: typeof mockProviders) {
  return providers.filter(p => p.enabled && p.status === 'unhealthy');
}

function getBestProvider(providers: typeof mockProviders) {
  const healthyProviders = getHealthyProviders(providers);
  if (healthyProviders.length > 0) {
    return healthyProviders.sort((a, b) => a.priority - b.priority)[0];
  }
  return null;
}

function formatLastChecked(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

describe('AIProviderSelector Logic', () => {
  it('formats response time correctly', () => {
    expect(formatResponseTime(500)).toBe('500ms');
    expect(formatResponseTime(1200)).toBe('1.2s');
    expect(formatResponseTime(2500)).toBe('2.5s');
  });

  it('formats cost correctly', () => {
    expect(formatCost(0.005)).toBe('$5.00m');
    expect(formatCost(0.15)).toBe('$0.15');
    expect(formatCost(25.50)).toBe('$25.50');
  });

  it('filters enabled providers', () => {
    const enabledProviders = getEnabledProviders(mockProviders);
    expect(enabledProviders).toHaveLength(2);
    expect(enabledProviders.every(p => p.enabled)).toBe(true);
  });

  it('filters healthy providers', () => {
    const healthyProviders = getHealthyProviders(mockProviders);
    expect(healthyProviders).toHaveLength(1);
    expect(healthyProviders[0].status).toBe('healthy');
  });

  it('filters degraded providers', () => {
    const degradedProviders = getDegradedProviders(mockProviders);
    expect(degradedProviders).toHaveLength(1);
    expect(degradedProviders[0].status).toBe('degraded');
  });

  it('filters unhealthy providers', () => {
    const unhealthyProviders = getUnhealthyProviders(mockProviders);
    expect(unhealthyProviders).toHaveLength(0);
  });

  it('selects best provider by priority', () => {
    const bestProvider = getBestProvider(mockProviders);
    expect(bestProvider).toBe(mockProviders[0]);
    expect(bestProvider?.priority).toBe(1);
  });

  it('handles empty providers list', () => {
    const enabledProviders = getEnabledProviders([]);
    expect(enabledProviders).toHaveLength(0);
    
    const bestProvider = getBestProvider([]);
    expect(bestProvider).toBeNull();
  });

  it('formats last checked time correctly', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    expect(formatLastChecked(fiveMinutesAgo)).toBe('5m ago');
    expect(formatLastChecked(twoHoursAgo)).toBe('2h ago');
    expect(formatLastChecked(threeDaysAgo)).toBe('3d ago');
  });

  it('identifies multi-model providers', () => {
    const multiModelProvider = mockProviders[0];
    const singleModelProvider = mockProviders[1];

    expect(multiModelProvider.models.length).toBeGreaterThan(1);
    expect(singleModelProvider.models.length).toBe(1);
  });

  it('calculates success rate correctly', () => {
    const provider = mockProviders[0];
    expect(Math.round(provider.metrics.successRate)).toBe(99);
  });
});
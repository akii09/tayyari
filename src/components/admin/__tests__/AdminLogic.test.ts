/**
 * Logic tests for admin dashboard components
 */

import { describe, it, expect } from 'vitest';

// Mock data structures
interface Provider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  totalRequests: number;
  totalCost: number;
  maxCostPerDay: number;
}

interface CostAlert {
  id: string;
  type: 'daily_limit' | 'monthly_limit' | 'provider_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  threshold: number;
}

interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  totalCost: number;
  totalTokens: number;
}

// Helper functions that would be used in admin components
function getProviderHealthSummary(providers: Provider[]) {
  return providers.reduce(
    (summary, provider) => {
      summary.total++;
      if (provider.enabled) summary.enabled++;
      
      switch (provider.healthStatus) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          break;
        case 'unhealthy':
          summary.unhealthy++;
          break;
        default:
          summary.unknown++;
      }
      
      return summary;
    },
    { total: 0, enabled: 0, healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 }
  );
}

function calculateCostEfficiency(data: AnalyticsData) {
  return {
    costPerRequest: data.totalRequests > 0 ? data.totalCost / data.totalRequests : 0,
    costPerToken: data.totalTokens > 0 ? data.totalCost / data.totalTokens : 0,
    successRate: data.totalRequests > 0 ? data.successfulRequests / data.totalRequests : 0,
  };
}

function categorizeAlerts(alerts: CostAlert[]) {
  return alerts.reduce(
    (categories, alert) => {
      categories[alert.severity]++;
      return categories;
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  );
}

function getBudgetUsagePercentage(currentCost: number, limit: number): number {
  return limit > 0 ? (currentCost / limit) * 100 : 0;
}

function getBudgetStatus(percentage: number): 'safe' | 'warning' | 'danger' | 'exceeded' {
  if (percentage > 100) return 'exceeded';
  if (percentage > 90) return 'danger';
  if (percentage > 70) return 'warning';
  return 'safe';
}

function getTopProvidersByUsage(providers: Provider[], limit: number = 5) {
  return providers
    .filter(p => p.enabled)
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, limit);
}

function getTopProvidersByCost(providers: Provider[], limit: number = 5) {
  return providers
    .filter(p => p.enabled)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, limit);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Mock data for tests
const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'OpenAI GPT-4',
    type: 'openai',
    enabled: true,
    priority: 1,
    healthStatus: 'healthy',
    totalRequests: 1500,
    totalCost: 45.67,
    maxCostPerDay: 50,
  },
  {
    id: '2',
    name: 'Claude 3.5',
    type: 'anthropic',
    enabled: true,
    priority: 2,
    healthStatus: 'degraded',
    totalRequests: 800,
    totalCost: 25.30,
    maxCostPerDay: 30,
  },
  {
    id: '3',
    name: 'Gemini Pro',
    type: 'google',
    enabled: false,
    priority: 3,
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
    maxCostPerDay: 20,
  },
];

const mockAlerts: CostAlert[] = [
  {
    id: '1',
    type: 'daily_limit',
    severity: 'high',
    currentValue: 52.50,
    threshold: 50.00,
  },
  {
    id: '2',
    type: 'provider_limit',
    severity: 'medium',
    currentValue: 28.75,
    threshold: 30.00,
  },
];

const mockAnalytics: AnalyticsData = {
  totalRequests: 2300,
  successfulRequests: 2254,
  totalCost: 70.97,
  totalTokens: 230000,
};

describe('Admin Dashboard Logic', () => {
  describe('Provider Health Summary', () => {
    it('calculates provider health summary correctly', () => {
      const summary = getProviderHealthSummary(mockProviders);
      
      expect(summary.total).toBe(3);
      expect(summary.enabled).toBe(2);
      expect(summary.healthy).toBe(1);
      expect(summary.degraded).toBe(1);
      expect(summary.unhealthy).toBe(0);
      expect(summary.unknown).toBe(1);
    });

    it('handles empty providers list', () => {
      const summary = getProviderHealthSummary([]);
      
      expect(summary.total).toBe(0);
      expect(summary.enabled).toBe(0);
      expect(summary.healthy).toBe(0);
    });
  });

  describe('Cost Efficiency Calculations', () => {
    it('calculates cost efficiency metrics correctly', () => {
      const efficiency = calculateCostEfficiency(mockAnalytics);
      
      expect(efficiency.costPerRequest).toBeCloseTo(0.0309, 3);
      expect(efficiency.costPerToken).toBeCloseTo(0.0003086, 6);
      expect(efficiency.successRate).toBeCloseTo(0.98, 2);
    });

    it('handles zero values gracefully', () => {
      const zeroData: AnalyticsData = {
        totalRequests: 0,
        successfulRequests: 0,
        totalCost: 0,
        totalTokens: 0,
      };
      
      const efficiency = calculateCostEfficiency(zeroData);
      
      expect(efficiency.costPerRequest).toBe(0);
      expect(efficiency.costPerToken).toBe(0);
      expect(efficiency.successRate).toBe(0);
    });
  });

  describe('Alert Categorization', () => {
    it('categorizes alerts by severity correctly', () => {
      const categories = categorizeAlerts(mockAlerts);
      
      expect(categories.high).toBe(1);
      expect(categories.medium).toBe(1);
      expect(categories.low).toBe(0);
      expect(categories.critical).toBe(0);
    });

    it('handles empty alerts list', () => {
      const categories = categorizeAlerts([]);
      
      expect(categories.high).toBe(0);
      expect(categories.medium).toBe(0);
      expect(categories.low).toBe(0);
      expect(categories.critical).toBe(0);
    });
  });

  describe('Budget Usage Calculations', () => {
    it('calculates budget usage percentage correctly', () => {
      expect(getBudgetUsagePercentage(75, 100)).toBe(75);
      expect(getBudgetUsagePercentage(125, 100)).toBe(125);
      expect(getBudgetUsagePercentage(50, 0)).toBe(0);
    });

    it('determines budget status correctly', () => {
      expect(getBudgetStatus(50)).toBe('safe');
      expect(getBudgetStatus(75)).toBe('warning');
      expect(getBudgetStatus(95)).toBe('danger');
      expect(getBudgetStatus(105)).toBe('exceeded');
    });
  });

  describe('Provider Rankings', () => {
    it('ranks providers by usage correctly', () => {
      const topProviders = getTopProvidersByUsage(mockProviders, 2);
      
      expect(topProviders).toHaveLength(2);
      expect(topProviders[0].name).toBe('OpenAI GPT-4');
      expect(topProviders[1].name).toBe('Claude 3.5');
    });

    it('ranks providers by cost correctly', () => {
      const topProviders = getTopProvidersByCost(mockProviders, 2);
      
      expect(topProviders).toHaveLength(2);
      expect(topProviders[0].name).toBe('OpenAI GPT-4');
      expect(topProviders[1].name).toBe('Claude 3.5');
    });

    it('excludes disabled providers from rankings', () => {
      const topProviders = getTopProvidersByUsage(mockProviders);
      
      expect(topProviders.every(p => p.enabled)).toBe(true);
      expect(topProviders.find(p => p.name === 'Gemini Pro')).toBeUndefined();
    });
  });

  describe('Formatting Functions', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(45.67)).toBe('$45.67');
      expect(formatCurrency(0.05)).toBe('$0.05');
      expect(formatCurrency(1000.5)).toBe('$1,000.50');
    });

    it('formats percentage correctly', () => {
      expect(formatPercentage(98.5)).toBe('98.5%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0.1)).toBe('0.1%');
    });
  });

  describe('Provider Type Analysis', () => {
    it('groups providers by type', () => {
      const providersByType = mockProviders.reduce((groups, provider) => {
        if (!groups[provider.type]) {
          groups[provider.type] = [];
        }
        groups[provider.type].push(provider);
        return groups;
      }, {} as Record<string, Provider[]>);

      expect(providersByType.openai).toHaveLength(1);
      expect(providersByType.anthropic).toHaveLength(1);
      expect(providersByType.google).toHaveLength(1);
    });

    it('calculates total cost by provider type', () => {
      const costByType = mockProviders.reduce((costs, provider) => {
        if (!costs[provider.type]) {
          costs[provider.type] = 0;
        }
        costs[provider.type] += provider.totalCost;
        return costs;
      }, {} as Record<string, number>);

      expect(costByType.openai).toBe(45.67);
      expect(costByType.anthropic).toBe(25.30);
      expect(costByType.google).toBe(0);
    });
  });
});
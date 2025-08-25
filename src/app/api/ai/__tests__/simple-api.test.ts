/**
 * Simple API test to verify basic functionality
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getProviders, POST as createProvider } from '../providers/route';
import { GET as getConfig } from '../config/route';
import { GET as getAnalytics } from '../monitoring/analytics/route';

describe('Simple API Tests', () => {
  it('should get providers list', async () => {
    const request = new NextRequest('http://localhost/api/ai/providers');
    const response = await getProviders(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should get AI configuration', async () => {
    const request = new NextRequest('http://localhost/api/ai/config');
    const response = await getConfig(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('providers');
    expect(data.data).toHaveProperty('systemConfig');
  });

  it('should get analytics', async () => {
    const request = new NextRequest('http://localhost/api/ai/monitoring/analytics');
    const response = await getAnalytics(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('analytics');
  });

  it('should create a provider', async () => {
    const request = new NextRequest('http://localhost/api/ai/providers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Simple Test Provider',
        type: 'openai',
        priority: 1,
      }),
    });

    const response = await createProvider(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Simple Test Provider');
  });
});
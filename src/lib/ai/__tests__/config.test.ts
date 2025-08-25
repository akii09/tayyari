/**
 * Tests for AI Provider Configuration
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROVIDER_CONFIGS,
  createProviderConfig,
  validateProviderConfig,
  getEnvironmentConfig,
} from '../config';
import type { ProviderConfig } from '../types';

describe('AI Provider Configuration', () => {
  describe('DEFAULT_PROVIDER_CONFIGS', () => {
    it('should have configurations for all supported providers', () => {
      const expectedProviders = ['openai', 'anthropic', 'google', 'mistral', 'ollama'];
      const actualProviders = Object.keys(DEFAULT_PROVIDER_CONFIGS);
      
      expect(actualProviders).toEqual(expect.arrayContaining(expectedProviders));
    });

    it('should have valid default configurations', () => {
      Object.entries(DEFAULT_PROVIDER_CONFIGS).forEach(([type, config]) => {
        expect(config.name).toBeTruthy();
        expect(config.type).toBe(type);
        expect(config.priority).toBeGreaterThan(0);
        expect(config.maxRequestsPerMinute).toBeGreaterThan(0);
        expect(config.maxCostPerDay).toBeGreaterThanOrEqual(0);
        expect(config.models.length).toBeGreaterThan(0);
        expect(config.healthCheckInterval).toBeGreaterThan(0);
      });
    });
  });

  describe('createProviderConfig', () => {
    it('should create a valid provider config with defaults', () => {
      const config = createProviderConfig('openai');
      
      expect(config.id).toBeTruthy();
      expect(config.type).toBe('openai');
      expect(config.name).toBe('OpenAI');
      expect(config.enabled).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        id: 'custom-openai',
        enabled: false,
        priority: 10,
        apiKey: 'test-key',
      };
      
      const config = createProviderConfig('openai', overrides);
      
      expect(config.id).toBe('custom-openai');
      expect(config.enabled).toBe(false);
      expect(config.priority).toBe(10);
      expect(config.apiKey).toBe('test-key');
    });
  });

  describe('validateProviderConfig', () => {
    it('should return no errors for valid config', () => {
      const config = createProviderConfig('openai', {
        apiKey: 'test-key',
      });
      
      const errors = validateProviderConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidConfig: Partial<ProviderConfig> = {
        type: 'openai',
      };
      
      const errors = validateProviderConfig(invalidConfig as ProviderConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('ID is required'))).toBe(true);
    });

    it('should require API key for non-Ollama providers', () => {
      const config = createProviderConfig('openai');
      delete config.apiKey;
      
      const errors = validateProviderConfig(config);
      expect(errors.some(error => error.includes('API key is required'))).toBe(true);
    });

    it('should not require API key for Ollama', () => {
      const config = createProviderConfig('ollama');
      
      const errors = validateProviderConfig(config);
      expect(errors.some(error => error.includes('API key is required'))).toBe(false);
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return environment configuration object', () => {
      const envConfig = getEnvironmentConfig();
      
      expect(envConfig).toHaveProperty('openai');
      expect(envConfig).toHaveProperty('anthropic');
      expect(envConfig).toHaveProperty('google');
      expect(envConfig).toHaveProperty('mistral');
      expect(envConfig).toHaveProperty('ollama');
    });
  });
});
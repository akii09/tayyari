#!/usr/bin/env node

/**
 * Script to seed AI providers in the database
 */

const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

// Database setup
const dbPath = path.join(process.cwd(), 'data', 'tayyarai.db');
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Provider configurations
const defaultProviders = [
  {
    id: crypto.randomUUID(),
    name: 'OpenAI GPT-4o',
    type: 'openai',
    enabled: false,
    priority: 1,
    config: JSON.stringify({
      maxRequestsPerMinute: 60,
      maxCostPerDay: 10,
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Claude 3.5 Sonnet',
    type: 'anthropic',
    enabled: false,
    priority: 2,
    config: JSON.stringify({
      maxRequestsPerMinute: 60,
      maxCostPerDay: 10,
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Google Gemini',
    type: 'google',
    enabled: false,
    priority: 3,
    config: JSON.stringify({
      maxRequestsPerMinute: 60,
      maxCostPerDay: 10,
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Mistral AI',
    type: 'mistral',
    enabled: false,
    priority: 4,
    config: JSON.stringify({
      maxRequestsPerMinute: 60,
      maxCostPerDay: 10,
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Ollama Local',
    type: 'ollama',
    enabled: false,
    priority: 5,
    config: JSON.stringify({
      maxRequestsPerMinute: 120,
      maxCostPerDay: 0,
      models: ['gpt-oss:20b', 'llama3.1:8b', 'llama3:latest', 'deepseek-r1:latest', 'phi3:latest', 'gemma3:latest', 'llama3.2:latest'],
      baseUrl: 'http://localhost:11434',
      healthCheckInterval: 300000,
      timeout: 60000,
      retryAttempts: 2,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Groq',
    type: 'groq',
    enabled: false,
    priority: 6,
    config: JSON.stringify({
      maxRequestsPerMinute: 30,
      maxCostPerDay: 5,
      models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
  {
    id: crypto.randomUUID(),
    name: 'Perplexity',
    type: 'perplexity',
    enabled: false,
    priority: 7,
    config: JSON.stringify({
      maxRequestsPerMinute: 20,
      maxCostPerDay: 5,
      models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-8b-instruct', 'llama-3.1-70b-instruct'],
      healthCheckInterval: 300000,
      timeout: 30000,
      retryAttempts: 3,
    }),
    healthStatus: 'unknown',
    totalRequests: 0,
    totalCost: 0,
  },
];

async function seedProviders() {
  try {
    console.log('🌱 Seeding AI providers...');
    
    // Check if providers already exist using raw SQL
    const existingProviders = sqlite.prepare('SELECT COUNT(*) as count FROM ai_providers').get();
    
    if (existingProviders.count > 0) {
      console.log(`✅ Found ${existingProviders.count} existing providers. Skipping seed.`);
      return;
    }
    
    // Insert providers using raw SQL
    const insertStmt = sqlite.prepare(`
      INSERT INTO ai_providers (id, name, type, enabled, priority, config, health_status, total_requests, total_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const provider of defaultProviders) {
      insertStmt.run(
        provider.id,
        provider.name,
        provider.type,
        provider.enabled ? 1 : 0,
        provider.priority,
        provider.config,
        provider.healthStatus,
        provider.totalRequests,
        provider.totalCost
      );
      console.log(`✅ Added provider: ${provider.name}`);
    }
    
    console.log(`🎉 Successfully seeded ${defaultProviders.length} AI providers!`);
    
    // List all providers using raw SQL
    const allProviders = sqlite.prepare('SELECT name, type, enabled FROM ai_providers ORDER BY priority').all();
    console.log('\n📋 Current providers:');
    allProviders.forEach(p => {
      console.log(`  - ${p.name} (${p.type}) - ${p.enabled ? 'Enabled' : 'Disabled'}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding providers:', error);
  } finally {
    sqlite.close();
  }
}

seedProviders();
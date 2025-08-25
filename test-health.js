#!/usr/bin/env node

/**
 * Test script to check AI provider health
 */

const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

// Database setup
const dbPath = path.join(process.cwd(), 'data', 'tayyarai.db');
const sqlite = new Database(dbPath);

async function testProviderHealth() {
  try {
    console.log('🔍 Testing AI provider health...\n');
    
    // Get all providers
    const providers = sqlite.prepare('SELECT * FROM ai_providers ORDER BY priority').all();
    
    for (const provider of providers) {
      console.log(`\n🤖 Testing ${provider.name} (${provider.type})`);
      console.log(`   Enabled: ${provider.enabled ? 'Yes' : 'No'}`);
      
      const config = JSON.parse(provider.config || '{}');
      console.log(`   Models: ${config.models?.join(', ') || 'None'}`);
      console.log(`   Base URL: ${config.baseUrl || 'Default'}`);
      console.log(`   Has API Key: ${config.apiKey ? 'Yes' : 'No'}`);
      
      // Test specific provider types
      if (provider.type === 'ollama') {
        await testOllama(config);
      } else if (provider.type === 'google') {
        await testGoogle(config);
      } else if (provider.type === 'groq') {
        await testGroq(config);
      } else {
        console.log(`   ⚠️  No specific test for ${provider.type} - needs API key`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing providers:', error);
  } finally {
    sqlite.close();
  }
}

async function testOllama(config) {
  try {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    console.log(`   Testing Ollama at ${baseUrl}...`);
    
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      console.log(`   ❌ Ollama server returned ${response.status}: ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const availableModels = data.models?.map(model => model.name) || [];
    
    console.log(`   ✅ Ollama is running`);
    console.log(`   📦 Available models: ${availableModels.length > 0 ? availableModels.join(', ') : 'None'}`);
    
    if (availableModels.length === 0) {
      console.log(`   ⚠️  No models installed. Run: ollama pull llama3.1:8b`);
    }
    
  } catch (error) {
    console.log(`   ❌ Ollama test failed: ${error.message}`);
    console.log(`   💡 Make sure Ollama is running: ollama serve`);
  }
}

async function testGoogle(config) {
  if (!config.apiKey) {
    console.log(`   ⚠️  No API key configured`);
    return;
  }
  
  try {
    console.log(`   Testing Google AI...`);
    
    // Test with a simple request to check API key validity
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': config.apiKey,
      },
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        console.log(`   ❌ Google API key is invalid or lacks permissions`);
      } else {
        console.log(`   ❌ Google API returned ${response.status}: ${response.statusText}`);
      }
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ Google AI API is accessible`);
    console.log(`   📦 Available models: ${data.models?.length || 0}`);
    
  } catch (error) {
    console.log(`   ❌ Google test failed: ${error.message}`);
  }
}

async function testGroq(config) {
  if (!config.apiKey) {
    console.log(`   ⚠️  No API key configured`);
    return;
  }
  
  try {
    console.log(`   Testing Groq...`);
    
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log(`   ❌ Groq API key is invalid`);
      } else if (response.status === 429) {
        console.log(`   ❌ Groq API rate limit exceeded`);
      } else {
        console.log(`   ❌ Groq API returned ${response.status}: ${response.statusText}`);
      }
      return;
    }
    
    const data = await response.json();
    const availableModels = data.data?.map(model => model.id) || [];
    
    console.log(`   ✅ Groq API is accessible`);
    console.log(`   📦 Available models: ${availableModels.join(', ')}`);
    
  } catch (error) {
    console.log(`   ❌ Groq test failed: ${error.message}`);
  }
}

testProviderHealth();
// Direct test of health check functionality
const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

// Database setup
const dbPath = path.join(process.cwd(), 'data', 'tayyarai.db');
const sqlite = new Database(dbPath);

async function testHealthChecks() {
  console.log('🔍 Testing AI provider health checks directly...\n');
  
  // Get providers from database
  const providers = sqlite.prepare(`
    SELECT id, name, type, enabled, config 
    FROM ai_providers 
    WHERE enabled = 1 
    ORDER BY priority
  `).all();
  
  console.log(`Found ${providers.length} enabled providers:\n`);
  
  for (const provider of providers) {
    console.log(`🤖 Testing ${provider.name} (${provider.type})`);
    
    const config = JSON.parse(provider.config || '{}');
    
    try {
      if (provider.type === 'ollama') {
        await testOllamaHealth(config);
      } else if (provider.type === 'google') {
        await testGoogleHealth(config);
      } else if (provider.type === 'groq') {
        await testGroqHealth(config);
      } else {
        console.log(`   ⚠️  No test implemented for ${provider.type}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }
  
  sqlite.close();
}

async function testOllamaHealth(config) {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Ollama server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const availableModels = data.models?.map(model => model.name) || [];
    
    if (availableModels.length === 0) {
      console.log('   ⚠️  Ollama is running but no models are installed');
      console.log('   💡 Run: ollama pull llama3.1:8b');
    } else {
      console.log('   ✅ Ollama is healthy');
      console.log(`   📦 Models: ${availableModels.join(', ')}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('   ❌ Ollama health check timed out');
      console.log('   💡 Start Ollama with: ollama serve');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.log('   ❌ Ollama server is not running');
      console.log('   💡 Start it with: ollama serve');
    } else {
      throw error;
    }
  }
}

async function testGoogleHealth(config) {
  if (!config.apiKey) {
    console.log('   ⚠️  No API key configured');
    return;
  }
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.log('   ❌ Invalid Google API key or insufficient permissions');
      } else if (response.status === 429) {
        console.log('   ❌ Google API quota exceeded');
      } else {
        console.log(`   ❌ Google API returned ${response.status}: ${response.statusText}`);
      }
      return;
    }

    const data = await response.json();
    const availableModels = data.models?.map(model => model.name.replace('models/', '')) || [];
    
    console.log('   ✅ Google API is healthy');
    console.log(`   📦 Available models: ${availableModels.length}`);
    if (availableModels.length > 0) {
      console.log(`   📝 Sample models: ${availableModels.slice(0, 3).join(', ')}`);
    }
  } catch (error) {
    throw new Error(`Google health check failed: ${error.message}`);
  }
}

async function testGroqHealth(config) {
  if (!config.apiKey) {
    console.log('   ⚠️  No API key configured');
    return;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('   ❌ Invalid Groq API key');
      } else if (response.status === 429) {
        console.log('   ❌ Groq API rate limit exceeded');
      } else if (response.status === 403) {
        console.log('   ❌ Groq API access forbidden');
      } else {
        console.log(`   ❌ Groq API returned ${response.status}: ${response.statusText}`);
      }
      return;
    }

    const data = await response.json();
    const availableModels = data.data?.map(model => model.id) || [];
    
    if (availableModels.length === 0) {
      console.log('   ⚠️  No models available from Groq API');
    } else {
      console.log('   ✅ Groq API is healthy');
      console.log(`   📦 Models: ${availableModels.join(', ')}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('   ❌ Groq health check timed out');
    } else {
      throw new Error(`Groq health check failed: ${error.message}`);
    }
  }
}

// Run the test
testHealthChecks().catch(console.error);
#!/usr/bin/env node

/**
 * Script to enable a test AI provider for development
 */

const { aiProviderService } = require('../src/lib/ai/services/AIProviderService.ts');

async function enableTestProvider() {
  try {
    console.log('🔧 Setting up test AI provider...');
    
    // First, seed default providers if none exist
    await aiProviderService.seedDefaultProviders();
    
    // Get all providers
    const providers = await aiProviderService.getAllProviders();
    console.log(`Found ${providers.length} providers`);
    
    // Try to enable Google Gemini with a test API key if GOOGLE_API_KEY is set
    if (process.env.GOOGLE_API_KEY) {
      const geminiProvider = providers.find(p => p.type === 'google');
      if (geminiProvider) {
        await aiProviderService.updateProvider(geminiProvider.id, {
          apiKey: process.env.GOOGLE_API_KEY,
          enabled: true,
          priority: 1,
        });
        console.log('✅ Enabled Google Gemini provider with API key');
      }
    }
    
    // Try to enable OpenAI if API key is set
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = providers.find(p => p.type === 'openai');
      if (openaiProvider) {
        await aiProviderService.updateProvider(openaiProvider.id, {
          apiKey: process.env.OPENAI_API_KEY,
          enabled: true,
          priority: 2,
        });
        console.log('✅ Enabled OpenAI provider with API key');
      }
    }
    
    // Try to enable Anthropic if API key is set
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicProvider = providers.find(p => p.type === 'anthropic');
      if (anthropicProvider) {
        await aiProviderService.updateProvider(anthropicProvider.id, {
          apiKey: process.env.ANTHROPIC_API_KEY,
          enabled: true,
          priority: 3,
        });
        console.log('✅ Enabled Anthropic provider with API key');
      }
    }
    
    // Enable Ollama as a fallback (no API key needed)
    const ollamaProvider = providers.find(p => p.type === 'ollama');
    if (ollamaProvider) {
      await aiProviderService.updateProvider(ollamaProvider.id, {
        enabled: true,
        priority: 10,
      });
      console.log('✅ Enabled Ollama provider (local)');
    }
    
    // Show enabled providers
    const enabledProviders = await aiProviderService.getEnabledProviders();
    console.log(`\n🎉 Enabled ${enabledProviders.length} providers:`);
    enabledProviders.forEach(p => {
      console.log(`  - ${p.name} (${p.type}) - Priority: ${p.priority}`);
    });
    
    if (enabledProviders.length === 0) {
      console.log('\n⚠️ No providers enabled. Set environment variables:');
      console.log('  - GOOGLE_API_KEY for Google Gemini');
      console.log('  - OPENAI_API_KEY for OpenAI');
      console.log('  - ANTHROPIC_API_KEY for Anthropic');
      console.log('  - Or start Ollama locally: ollama serve');
    }
    
  } catch (error) {
    console.error('❌ Failed to enable test provider:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  enableTestProvider();
}

module.exports = { enableTestProvider };
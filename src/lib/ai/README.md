# Multi-AI Provider Integration

This module provides a unified interface for integrating multiple AI providers using the AI-SDK. It supports OpenAI, Anthropic, Google, Mistral, and Ollama providers with automatic health checking and failover capabilities.

## Features

- **Multi-Provider Support**: Integrate with OpenAI, Anthropic, Google, Mistral, and Ollama
- **Health Monitoring**: Automatic health checks with configurable intervals
- **Failover Logic**: Automatic fallback to healthy providers
- **Cost Tracking**: Built-in cost estimation and tracking
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Quick Start

### 1. Install Dependencies

The required dependencies are already installed:
- `ai` - AI-SDK core
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/anthropic` - Anthropic provider
- `@ai-sdk/google` - Google provider
- `@ai-sdk/mistral` - Mistral provider
- `ollama` - Ollama local provider

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your API keys:

```bash
cp .env.example .env.local
```

### 3. Basic Usage

```typescript
import { 
  createProviderConfig, 
  healthChecker, 
  AIProviderFactory 
} from '@/lib/ai';

// Create a provider configuration
const config = createProviderConfig('openai', {
  apiKey: process.env.OPENAI_API_KEY,
});

// Start health monitoring
healthChecker.startHealthMonitoring(config);

// Generate a response
const request = {
  userId: 'user-123',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
};

const response = await AIProviderFactory.generateResponse(config, request);
console.log(response.content);
```

## Provider Configuration

Each provider can be configured with the following options:

```typescript
interface ProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  enabled: boolean;
  priority: number;
  maxRequestsPerMinute: number;
  maxCostPerDay: number;
  models: string[];
  apiKey?: string;
  baseUrl?: string;
  healthCheckInterval: number;
  timeout?: number;
  retryAttempts?: number;
}
```

## Health Monitoring

The health checker automatically monitors provider availability:

```typescript
import { healthChecker } from '@/lib/ai';

// Check health of a specific provider
const status = await healthChecker.checkProviderHealth(config);

// Get all healthy providers
const healthyProviders = healthChecker.getHealthyProviders(configs);

// Check if a provider is healthy
const isHealthy = healthChecker.isProviderHealthy('provider-id');
```

## Error Handling

The system includes comprehensive error handling with categorized error types:

- `RATE_LIMIT` - Provider rate limit exceeded
- `API_KEY_INVALID` - Invalid or missing API key
- `MODEL_UNAVAILABLE` - Requested model not available
- `TIMEOUT` - Request timeout
- `NETWORK_ERROR` - Network connectivity issues
- `UNKNOWN` - Other errors

## Cost Tracking

Built-in cost estimation helps monitor usage:

```typescript
const response = await AIProviderFactory.generateResponse(config, request);
console.log(`Cost: $${response.cost}`);
```

## Supported Models

### OpenAI
- gpt-4o
- gpt-4o-mini  
- gpt-3.5-turbo

### Anthropic
- claude-3-5-sonnet-20241022
- claude-3-haiku-20240307

### Google
- gemini-1.5-pro
- gemini-1.5-flash

### Mistral
- mistral-large-latest
- mistral-small-latest

### Ollama (Local)
- llama3.2
- mistral
- codellama
- Any locally installed model

## Next Steps

This infrastructure is ready for the next tasks in the implementation plan:
1. Database schema extension for multi-AI support
2. AI provider management service
3. Provider router with fallback logic
4. Integration with the chat system

See the tasks.md file for the complete implementation roadmap.
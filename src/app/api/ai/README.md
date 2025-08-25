# AI Provider Configuration and Monitoring APIs

This document describes the comprehensive set of APIs for managing AI providers, monitoring usage, tracking costs, and configuring the multi-AI system.

## Overview

The AI Provider Configuration and Monitoring system provides:

- **Provider Management**: CRUD operations for AI provider configurations
- **Dynamic Configuration**: Update configurations without system restarts
- **Performance Monitoring**: Track response times, success rates, and provider health
- **Cost Tracking**: Monitor spending across providers with budget alerts
- **Usage Analytics**: Detailed analytics on request patterns and efficiency
- **Budget Alerts**: Configurable alerts for cost control and optimization

## API Endpoints

### Provider Management

#### GET /api/ai/providers
Get all AI provider configurations.

**Query Parameters:**
- `enabled` (boolean): Filter for enabled providers only
- `type` (string): Filter by provider type (openai, anthropic, google, mistral, ollama)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "provider-id",
      "name": "OpenAI GPT-4o",
      "type": "openai",
      "enabled": true,
      "priority": 1,
      "maxRequestsPerMinute": 60,
      "maxCostPerDay": 10,
      "models": ["gpt-4o", "gpt-4o-mini"],
      "timeout": 30000,
      "retryAttempts": 3
    }
  ],
  "count": 1
}
```

#### POST /api/ai/providers
Create a new AI provider configuration.

**Request Body:**
```json
{
  "name": "OpenAI GPT-4o",
  "type": "openai",
  "enabled": true,
  "priority": 1,
  "maxRequestsPerMinute": 60,
  "maxCostPerDay": 10,
  "models": ["gpt-4o", "gpt-4o-mini"],
  "apiKey": "sk-...",
  "timeout": 30000,
  "retryAttempts": 3
}
```

#### GET /api/ai/providers/[id]
Get a specific provider by ID.

#### PUT /api/ai/providers/[id]
Update a provider configuration.

#### DELETE /api/ai/providers/[id]
Delete a provider configuration.

#### POST /api/ai/providers/[id]/toggle
Enable or disable a provider.

**Request Body:**
```json
{
  "enabled": false
}
```

#### POST /api/ai/providers/[id]/priority
Update provider priority.

**Request Body:**
```json
{
  "priority": 5
}
```

#### GET /api/ai/providers/[id]/health
Get provider health status and metrics.

#### POST /api/ai/providers/[id]/health
Update provider health status.

**Request Body:**
```json
{
  "status": "unhealthy",
  "errorMessage": "API key invalid"
}
```

### Monitoring and Analytics

#### GET /api/ai/monitoring/analytics
Get comprehensive AI usage analytics.

**Query Parameters:**
- `userId` (string): Filter by user ID
- `provider` (string): Filter by provider
- `startDate` (ISO date): Start date for analytics
- `endDate` (ISO date): End date for analytics
- `days` (number): Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalRequests": 1250,
      "successfulRequests": 1200,
      "failedRequests": 50,
      "totalCost": 15.75,
      "totalTokens": 125000,
      "averageResponseTime": 1500,
      "providerBreakdown": {
        "openai": {
          "requests": 800,
          "cost": 12.50,
          "successRate": 0.96,
          "averageResponseTime": 1400
        }
      },
      "modelBreakdown": {
        "gpt-4o": {
          "requests": 600,
          "cost": 10.00,
          "successRate": 0.97
        }
      },
      "dailyUsage": [
        {
          "date": "2024-01-01",
          "requests": 45,
          "cost": 0.75,
          "tokens": 4500
        }
      ]
    },
    "insights": {
      "mostUsedProvider": "openai",
      "mostUsedModel": "gpt-4o",
      "averageCostPerRequest": 0.0126,
      "successRate": 0.96,
      "costTrend": "stable",
      "requestTrend": "increasing"
    }
  }
}
```

#### GET /api/ai/monitoring/costs
Get cost tracking and budget alerts.

**Query Parameters:**
- `userId` (string): Filter by user ID
- `dailyLimit` (number): Daily spending limit
- `monthlyLimit` (number): Monthly spending limit
- `providerLimits` (string): Provider-specific limits (JSON or comma-separated)

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": {
      "critical": [],
      "warning": [
        {
          "type": "daily_limit",
          "message": "Daily cost is 85% of limit",
          "currentAmount": 8.50,
          "threshold": 10.00,
          "severity": "warning"
        }
      ]
    },
    "currentCosts": {
      "today": {
        "total": 8.50,
        "requests": 340,
        "tokens": 34000,
        "byProvider": [
          {
            "provider": "openai",
            "cost": 6.75,
            "requests": 270,
            "percentage": 79.4
          }
        ]
      },
      "month": {
        "total": 125.75,
        "requests": 5000,
        "tokens": 500000,
        "byProvider": [...]
      }
    },
    "recommendations": [
      {
        "type": "cost_reduction",
        "priority": "medium",
        "title": "High-cost provider dominance",
        "description": "OpenAI accounts for 79% of costs...",
        "potentialSavings": 2.03
      }
    ]
  }
}
```

#### GET /api/ai/monitoring/usage
Get detailed usage statistics and patterns.

**Query Parameters:**
- `userId` (string): Filter by user ID
- `provider` (string): Filter by provider
- `days` (number): Number of days to analyze
- `granularity` (string): Data granularity (daily, hourly)

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": {
      "hourlyDistribution": [
        {
          "hour": 9,
          "requests": 45,
          "cost": 0.75
        }
      ],
      "dayOfWeekDistribution": [
        {
          "day": "Monday",
          "requests": 180,
          "cost": 3.00
        }
      ],
      "errorPatterns": [
        {
          "error": "Rate limit exceeded",
          "count": 12,
          "percentage": 24.0
        }
      ]
    },
    "performance": {
      "responseTimePercentiles": {
        "p50": 1200,
        "p90": 2500,
        "p95": 3200,
        "p99": 5000
      },
      "reliability": {
        "uptime": 98.5,
        "errorRate": 4.0,
        "timeoutRate": 1.2
      }
    },
    "insights": [
      {
        "type": "performance",
        "severity": "warning",
        "title": "High response times detected",
        "description": "95th percentile response time is 3.2 seconds",
        "recommendation": "Consider using faster models"
      }
    ]
  }
}
```

#### GET /api/ai/monitoring/logs
Get filtered request logs.

**Query Parameters:**
- `userId` (string): Filter by user ID
- `conversationId` (string): Filter by conversation
- `conceptId` (string): Filter by learning concept
- `provider` (string): Filter by provider
- `success` (boolean): Filter by success status
- `startDate` (ISO date): Start date filter
- `endDate` (ISO date): End date filter
- `limit` (number): Maximum records (max 1000)
- `offset` (number): Pagination offset
- `format` (string): Response format (json, csv)

#### DELETE /api/ai/monitoring/logs
Clean up old request logs.

**Query Parameters:**
- `retentionDays` (number): Days to retain (1-365)

#### GET /api/ai/monitoring/alerts
Get current budget alerts.

#### POST /api/ai/monitoring/alerts
Configure budget alert thresholds.

**Request Body:**
```json
{
  "userId": "user-id",
  "dailyLimit": 10.00,
  "monthlyLimit": 250.00,
  "providerLimits": {
    "openai": 8.00,
    "anthropic": 5.00
  },
  "warningPercentage": 80,
  "criticalPercentage": 100,
  "enableEmailAlerts": true,
  "webhookUrl": "https://example.com/webhook"
}
```

### Configuration Management

#### GET /api/ai/config
Get current AI system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [...],
    "systemConfig": {
      "defaultProvider": "provider-id",
      "fallbackEnabled": true,
      "maxRetries": 3,
      "requestTimeout": 30000,
      "rateLimiting": {
        "enabled": true,
        "requestsPerMinute": 100
      },
      "costControls": {
        "dailyLimit": null,
        "monthlyLimit": null
      }
    },
    "summary": {
      "totalProviders": 5,
      "enabledProviders": 3,
      "healthyProviders": 2,
      "primaryProvider": "OpenAI GPT-4o"
    }
  }
}
```

#### POST /api/ai/config
Update AI system configuration.

**Request Body:**
```json
{
  "systemConfig": {
    "requestTimeout": 45000,
    "maxRetries": 5
  },
  "providerUpdates": [
    {
      "id": "provider-id",
      "maxRequestsPerMinute": 120
    }
  ]
}
```

#### POST /api/ai/config/reload
Reload configuration without system restart.

**Request Body:**
```json
{
  "force": false,
  "validateOnly": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "providersReloaded": 3,
      "providersValidated": 5,
      "errors": [],
      "warnings": ["No primary provider configured"],
      "healthChecks": [
        {
          "providerId": "provider-id",
          "name": "OpenAI GPT-4o",
          "status": "healthy",
          "responseTime": 250
        }
      ]
    },
    "summary": {
      "totalProviders": 5,
      "enabledProviders": 3,
      "healthyProviders": 2
    }
  }
}
```

## Error Handling

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error
- `207`: Multi-Status (partial success)

## Features Implemented

### ✅ Provider Configuration Management
- CRUD operations for AI providers
- Dynamic configuration updates
- Provider priority management
- Enable/disable providers
- Health status tracking

### ✅ Monitoring and Analytics
- Comprehensive usage analytics
- Cost tracking and breakdown
- Performance metrics
- Usage pattern analysis
- Request logging with filtering

### ✅ Budget Management
- Configurable spending limits
- Real-time cost alerts
- Cost optimization recommendations
- Provider-specific budgets
- Spending trend analysis

### ✅ System Configuration
- Centralized configuration management
- Configuration validation
- Hot reload without restarts
- Health checks for all providers
- System status monitoring

### ✅ Integration Tests
- Comprehensive API testing
- Error handling validation
- Edge case coverage
- Performance testing
- Data export functionality

## Usage Examples

### Setting up a new provider
```bash
curl -X POST /api/ai/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI GPT-4o",
    "type": "openai",
    "enabled": true,
    "priority": 1,
    "apiKey": "sk-...",
    "maxCostPerDay": 10
  }'
```

### Getting cost analytics
```bash
curl "/api/ai/monitoring/costs?dailyLimit=10&monthlyLimit=250"
```

### Configuring budget alerts
```bash
curl -X POST /api/ai/monitoring/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "dailyLimit": 10,
    "monthlyLimit": 250,
    "warningPercentage": 80
  }'
```

### Reloading configuration
```bash
curl -X POST /api/ai/config/reload \
  -H "Content-Type: application/json" \
  -d '{"validateOnly": false}'
```

This implementation provides a complete solution for AI provider configuration and monitoring, enabling dynamic management, cost control, and comprehensive analytics for the multi-AI system.
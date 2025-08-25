# API Overview

TayyarAI provides a comprehensive REST API for managing users, conversations, learning concepts, and AI providers.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Most API endpoints require authentication. Include the session cookie or authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-domain.com/api/endpoint
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

## API Endpoints

### Chat & Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message and get AI response |
| `GET` | `/api/chat/conversations` | List user conversations |
| `POST` | `/api/chat/conversations` | Create new conversation |
| `POST` | `/api/chat/messages` | Add message to conversation |

### Learning Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/concepts` | Get user's learning concepts |
| `POST` | `/api/concepts` | Create new learning concept |
| `GET` | `/api/progress` | Get learning progress |
| `GET` | `/api/learning-plans` | Get learning plans |

### AI Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/providers` | List AI providers |
| `PUT` | `/api/ai/providers` | Update provider configuration |
| `POST` | `/api/ai/providers/test` | Test provider connection |
| `GET` | `/api/ai/models` | Get available AI models |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/onboarding` | Complete user onboarding |
| `GET` | `/api/auth/me` | Get current user |
| `PUT` | `/api/auth/update-profile` | Update user profile |

### System & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/system/health` | System health check |
| `GET` | `/api/learning/analytics` | Learning analytics |

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Chat endpoints**: 60 requests per minute
- **General endpoints**: 100 requests per minute
- **Admin endpoints**: 30 requests per minute

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `AUTHENTICATION_ERROR` | Authentication required |
| `AUTHORIZATION_ERROR` | Access denied |
| `NOT_FOUND_ERROR` | Resource not found |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `AI_PROVIDER_ERROR` | AI service error |

## Examples

### Send Chat Message

```bash
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me with React optimization",
    "maxTokens": 1000,
    "temperature": 0.7
  }'
```

### Create Learning Concept

```bash
curl -X POST https://your-domain.com/api/concepts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "React Hooks",
    "description": "Master React Hooks",
    "category": "programming",
    "difficulty": "intermediate",
    "estimatedHours": 20
  }'
```

### Configure AI Provider

```bash
curl -X PUT https://your-domain.com/api/ai/providers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "provider-id",
    "apiKey": "your-api-key",
    "enabled": true
  }'
```

## SDKs and Libraries

We provide official SDKs for popular languages:

- **JavaScript/TypeScript**: `@tayyarai/sdk`
- **Python**: `tayyarai-python`
- **Go**: `tayyarai-go`

## Webhooks

TayyarAI supports webhooks for real-time notifications:

- User progress updates
- Conversation events
- System health alerts

See the [Webhooks Guide](./webhooks.md) for more details.
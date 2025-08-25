# Development Setup

This guide will help you set up TayyarAI for local development.

## Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- **AI Provider API Keys** (optional for basic setup)

## Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/tayyarai/tayyarai.git
cd tayyarai
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="file:./data/app.db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers (optional)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="AIza..."
```

4. **Initialize the database**

```bash
npm run db:push
npm run db:seed
```

5. **Start the development server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
tayyarai/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   ├── chat/           # Chat interface
│   │   ├── dashboard/      # User dashboard
│   │   └── admin/          # Admin interface
│   ├── components/         # React components
│   │   ├── base/          # Base UI components
│   │   ├── chat/          # Chat components
│   │   ├── onboarding/    # Onboarding flow
│   │   └── admin/         # Admin components
│   ├── lib/               # Utilities and services
│   │   ├── ai/            # AI provider integration
│   │   ├── auth/          # Authentication
│   │   ├── database/      # Database services
│   │   └── utils/         # Utility functions
│   └── styles/            # CSS styles
├── docs/                  # Documentation
├── data/                  # SQLite database files
└── public/               # Static assets
```

## Development Workflow

### 1. Database Changes

When making database schema changes:

```bash
# Generate migration
npm run db:generate

# Apply changes
npm run db:push

# Reset database (if needed)
npm run db:reset
```

### 2. Adding AI Providers

To add a new AI provider:

1. Create provider implementation in `src/lib/ai/providers/`
2. Add provider type to `src/lib/ai/types.ts`
3. Update health checker in `src/lib/ai/health.ts`
4. Add provider configuration in `AIProviderService`

### 3. Creating Components

Follow the component structure:

```typescript
// src/components/example/ExampleComponent.tsx
"use client";

import { useState } from 'react';
import { GlassCard } from '@/components/base/GlassCard';

interface ExampleComponentProps {
  title: string;
  onAction: () => void;
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        {title}
      </h2>
      {/* Component content */}
    </GlassCard>
  );
}
```

### 4. API Route Development

API routes follow this pattern:

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleAPIError, ValidationError } from '@/lib/utils/errorHandler';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Your logic here
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      { success: false, ...errorResponse },
      { status: errorResponse.statusCode }
    );
  }
}
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific test suite
npm run test src/test/integration/chat.test.ts
```

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --grep "onboarding flow"
```

## Debugging

### Database Debugging

```bash
# Open database in browser
npm run db:studio

# View database schema
npm run db:introspect
```

### AI Provider Debugging

Use the built-in debug tools:

- Visit `/test-providers` to test all providers
- Visit `/debug-gemini` for Gemini-specific debugging
- Check provider health in admin dashboard

### Logging

Enable debug logging:

```env
DEBUG=tayyarai:*
LOG_LEVEL=debug
```

## Common Issues

### Database Connection Issues

```bash
# Reset database
rm -rf data/app.db*
npm run db:push
npm run db:seed
```

### AI Provider Issues

1. Check API keys in `.env.local`
2. Verify provider health in admin dashboard
3. Use debug tools to test connections

### Build Issues

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## Getting Help

- **Documentation**: Check the docs for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Discord**: Join our community Discord
- **Email**: Contact us at dev@tayyarai.com
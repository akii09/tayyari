# Multi-AI Context System Testing Suite

This comprehensive testing suite validates all aspects of the multi-AI context system, from individual components to complete user journeys and system performance.

## Test Categories

### 1. Unit Tests (`src/**/*.test.ts`)
- **Purpose**: Test individual components, services, and utilities
- **Scope**: Isolated functionality testing
- **Examples**: AI provider services, context management, database operations
- **Run**: `npm run test:unit`

### 2. Integration Tests (`src/test/integration/`)
- **Purpose**: Test interactions between multiple components
- **Scope**: Multi-component workflows and data flow
- **Examples**: Complete learning flows, concept switching, provider failover
- **Run**: `npm run test:integration`

### 3. Performance Tests (`src/test/performance/`)
- **Purpose**: Validate system performance under various loads
- **Scope**: Response times, memory usage, scalability
- **Examples**: Context retrieval speed, AI routing performance, embedding operations
- **Run**: `npm run test:performance`

### 4. End-to-End Tests (`src/test/e2e/`)
- **Purpose**: Test complete user journeys from start to finish
- **Scope**: Full user workflows and scenarios
- **Examples**: Onboarding to learning, multi-concept learning, plan adaptation
- **Run**: `npm run test:e2e`

### 5. Load Tests (`src/test/load/`)
- **Purpose**: Test system behavior under concurrent usage
- **Scope**: Concurrent users, high-volume operations, resource management
- **Examples**: Multiple users learning simultaneously, provider failover under load
- **Run**: `npm run test:load`

### 6. System Validation (`src/test/system/`)
- **Purpose**: Validate all system requirements from the specification
- **Scope**: Requirements compliance, feature completeness
- **Examples**: Multi-AI provider support, context management, learning plan generation
- **Run**: `npm run test:system`

## Quick Start

### Run All Tests
```bash
npm run test:comprehensive
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Performance tests only
npm run test:performance

# End-to-end tests only
npm run test:e2e

# Load tests only
npm run test:load

# System validation only
npm run test:system
```

### Run Test Groups
```bash
# Validation tests (integration + e2e + system)
npm run test:validation

# Performance tests (performance + load)
npm run test:perf-only

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Structure

### File Naming Conventions
- Unit tests: `*.test.ts` (alongside source files)
- Integration tests: `*.integration.test.ts`
- Performance tests: `*.performance.test.ts`
- End-to-end tests: `*.e2e.test.ts`
- Load tests: `*.load.test.ts`
- System tests: `*.test.ts` (in system directory)

### Test Organization
```
src/
├── lib/
│   ├── ai/
│   │   ├── services/
│   │   │   ├── __tests__/
│   │   │   │   ├── AIProviderRouter.test.ts
│   │   │   │   └── AIProviderService.test.ts
│   │   │   └── ...
│   │   └── ...
│   └── database/
│       ├── services/
│       │   ├── __tests__/
│       │   │   ├── chatService.test.ts
│       │   │   └── contextManager.test.ts
│       │   └── ...
│       └── ...
├── components/
│   ├── chat/
│   │   ├── __tests__/
│   │   │   ├── AIProviderSelector.test.tsx
│   │   │   └── ConceptSwitcher.test.tsx
│   │   └── ...
│   └── ...
└── test/
    ├── integration/
    │   └── multi-concept-learning.integration.test.ts
    ├── performance/
    │   ├── context-retrieval.performance.test.ts
    │   └── ai-routing.performance.test.ts
    ├── e2e/
    │   └── onboarding-learning.e2e.test.ts
    ├── load/
    │   └── concurrent-usage.load.test.ts
    ├── system/
    │   └── requirements-validation.test.ts
    ├── test-runner.ts
    └── README.md
```

## Test Data Management

### Database Setup
- Tests use isolated test database instances
- Automatic cleanup before and after each test
- Test data factories for consistent test scenarios

### Mocking Strategy
- AI services are mocked for consistent, fast testing
- External dependencies are mocked to avoid network calls
- Database operations use real database for integration tests

### Test User Management
- Unique test user IDs for each test suite
- Automatic cleanup of test users and associated data
- Isolated test environments prevent data conflicts

## Performance Benchmarks

### Expected Performance Targets
- **Context Retrieval**: < 1 second for standard queries
- **AI Response Generation**: < 3 seconds including context building
- **Concurrent Users**: Support 50+ concurrent learning sessions
- **Memory Usage**: < 50KB per operation average
- **Database Operations**: < 200ms for standard CRUD operations

### Performance Monitoring
- Response time tracking for all major operations
- Memory usage monitoring during load tests
- Database connection pooling validation
- AI provider failover timing

## Requirements Coverage

The test suite validates all requirements from the specification:

### Requirement 1: Multi-AI Provider Integration
- ✅ Support for multiple AI providers (OpenAI, Claude, Gemini, etc.)
- ✅ AI-SDK integration for unified provider management
- ✅ Automatic failover between providers
- ✅ Rate limiting and error handling
- ✅ Secure credential management

### Requirement 2: Multiple Learning Concept Support
- ✅ Multiple concept selection and management
- ✅ Separate progress tracking per concept
- ✅ Context switching between concepts
- ✅ Customized learning plans per concept
- ✅ Dynamic concept addition

### Requirement 3: Advanced Context and Memory Management
- ✅ Complete learning history access
- ✅ Learning style and pace consideration
- ✅ Intelligent context compression
- ✅ Session recap functionality
- ✅ Historical conversation referencing

### Requirement 4: Enhanced Onboarding Experience
- ✅ Flexible concept selection (including skip option)
- ✅ Personalized plan generation
- ✅ User preference consideration
- ✅ Plan customization capabilities
- ✅ Prior knowledge assessment

### Additional System Requirements
- ✅ Context storage and retrieval efficiency
- ✅ AI provider configuration management
- ✅ Learning plan adaptation
- ✅ Cross-concept knowledge integration

## Continuous Integration

### Pre-commit Hooks
```bash
# Run unit tests before commit
npm run test:unit

# Run linting and formatting
npm run lint
npm run format
```

### CI Pipeline
1. **Unit Tests**: Fast feedback on individual components
2. **Integration Tests**: Validate component interactions
3. **Performance Tests**: Ensure performance standards
4. **System Validation**: Verify requirements compliance
5. **Load Tests**: Validate scalability (on staging)

### Test Reporting
- Detailed test results with timing information
- Performance metrics and benchmarks
- Requirements coverage reports
- Failed test analysis and debugging information

## Debugging Tests

### Common Issues
1. **Database Connection**: Ensure test database is initialized
2. **Mock Configuration**: Verify AI service mocks are properly set up
3. **Test Isolation**: Check for data leakage between tests
4. **Timeout Issues**: Increase timeout for slow operations

### Debug Commands
```bash
# Run specific test file
npx vitest run src/test/integration/multi-concept-learning.integration.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Run single test case
npx vitest run -t "should handle multi-concept learning"

# Debug mode
npx vitest run --inspect-brk
```

### Test Environment Variables
```bash
# Test database configuration
TEST_DB_PATH=./data/test.db

# AI service mocking
MOCK_AI_SERVICES=true

# Performance test settings
PERF_TEST_TIMEOUT=120000
LOAD_TEST_USERS=50
```

## Contributing

### Adding New Tests
1. Follow the naming conventions
2. Include proper test documentation
3. Add cleanup procedures for test data
4. Update this README if adding new test categories

### Test Quality Guidelines
- Each test should be independent and isolated
- Use descriptive test names that explain the scenario
- Include both positive and negative test cases
- Add performance assertions where relevant
- Mock external dependencies appropriately

### Performance Test Guidelines
- Set realistic performance targets
- Include memory usage monitoring
- Test with various data sizes
- Validate concurrent operation handling
- Document performance expectations

## Troubleshooting

### Common Test Failures
1. **Database Lock**: Multiple tests accessing database simultaneously
2. **Memory Leaks**: Improper cleanup of test data or mocks
3. **Timeout Issues**: Tests taking longer than expected
4. **Mock Conflicts**: Conflicting mock configurations

### Solutions
1. Ensure proper test isolation and cleanup
2. Use unique test identifiers
3. Increase timeouts for complex operations
4. Reset mocks between test suites

For more detailed information about specific test implementations, see the individual test files and their documentation.
# AI Provider Health Check Fixes - Complete Analysis

## Current Provider Status

Based on database analysis, here are the enabled providers:

1. **Simple Test Provider** (OpenAI) - ❌ No API Key
2. **Google Gemini** - ✅ Has API Key (`AIzaSyCGhRQSYv20yKukJaR7-o9k-QYnRKSUKMI`)
3. **Ollama Local** - ⚠️ No API Key needed (uses local server)
4. **Groq** - ✅ Has API Key (`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`)

## Root Cause Analysis

The providers are showing as "unhealthy" because:

1. **Ollama**: Server is not running locally
2. **Google Gemini**: API key may be invalid or have quota/permission issues
3. **Groq**: API key may be invalid or rate limited
4. **Simple Test Provider**: No API key configured

## Fixes Applied

### 1. Enhanced Health Check Logic (`src/lib/ai/health.ts`)

#### Ollama Health Check Improvements:

- ✅ Added 5-second timeout to prevent hanging
- ✅ Better error messages for common issues
- ✅ Specific guidance for starting Ollama server
- ✅ Check for installed models

#### Google Health Check Improvements:

- ✅ Direct API validation instead of AI SDK
- ✅ Better error categorization (403, 429, etc.)
- ✅ Specific error messages for permissions and quota

#### Groq Health Check Improvements:

- ✅ Added 10-second timeout
- ✅ Better HTTP status code handling
- ✅ More detailed error messages

### 2. Enhanced Health Check API (`src/app/api/ai/providers/test-health/route.ts`)

- ✅ Check if provider is enabled before testing
- ✅ Update database with health status
- ✅ Better error response structure
- ✅ More detailed provider information in response

### 3. Fixed Missing Import (`src/lib/ai/services/AIProviderService.ts`)

- ✅ Added missing `aiRequestLogs` import

## Expected Results After Fixes

### For Ollama:

- **If not running**: "Ollama server is not running. Start it with: ollama serve"
- **If running but no models**: "Ollama is running but no models are installed. Run: ollama pull llama3.1:8b"
- **If healthy**: Shows list of available models

### For Google Gemini:

- **If API key invalid**: "Invalid Google API key or insufficient permissions"
- **If quota exceeded**: "Google API quota exceeded"
- **If healthy**: Shows number of available models

### For Groq:

- **If API key invalid**: "Invalid Groq API key"
- **If rate limited**: "Groq API rate limit exceeded"
- **If healthy**: Shows list of available models

## How to Test the Fixes

### Option 1: Using the Web Interface

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Visit: `http://localhost:3000/test-providers`
3. Click "Test Health" for each provider
4. You should now see specific, actionable error messages

### Option 2: Using the API Directly

```bash
# Test Google Gemini
curl -X POST http://localhost:3000/api/ai/providers/test-health \
  -H "Content-Type: application/json" \
  -d '{"providerId": "google-provider-id"}'

# Test Groq
curl -X POST http://localhost:3000/api/ai/providers/test-health \
  -H "Content-Type: application/json" \
  -d '{"providerId": "groq-provider-id"}'

# Test Ollama
curl -X POST http://localhost:3000/api/ai/providers/test-health \
  -H "Content-Type: application/json" \
  -d '{"providerId": "ollama-provider-id"}'
```

## Quick Solutions for Each Provider

### 1. Fix Ollama (Local AI)

```bash
# Install Ollama (if not installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve

# In another terminal, install a model
ollama pull llama3.1:8b

# Verify it's working
curl http://localhost:11434/api/tags
```

### 2. Fix Google Gemini

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Verify the API key: `AIzaSyCGhRQSYv20yKukJaR7-o9k-QYnRKSUKMI`
3. Check if it has proper permissions for Generative AI
4. Verify quota limits

### 3. Fix Groq

1. Go to [Groq Console](https://console.groq.com/keys)
2. Verify the API key: `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`
3. Check rate limits and usage

### 4. Fix Simple Test Provider

This provider has no API key configured. Either:

- Add an OpenAI API key to its configuration
- Disable this provider

## Verification Steps

After applying fixes, you should see:

1. **Ollama**: Either shows available models or clear instructions to start it
2. **Google Gemini**: Either shows "healthy" status or specific API key/quota errors
3. **Groq**: Either shows available models or specific API key/rate limit errors
4. **All providers**: No more generic "unhealthy" status without explanation

## Files Modified

1. `src/lib/ai/health.ts` - Enhanced health check logic
2. `src/app/api/ai/providers/test-health/route.ts` - Better API responses
3. `src/lib/ai/services/AIProviderService.ts` - Fixed missing import

## Next Steps

1. **Test the fixes** by starting the dev server and visiting `/test-providers`
2. **Start Ollama** if you want to use local AI models
3. **Verify API keys** for cloud providers if needed
4. **Check the health status** - should now show specific, actionable error messages

The health check system should now provide clear, actionable feedback instead of generic "unhealthy" status messages.

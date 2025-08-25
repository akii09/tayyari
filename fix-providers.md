# AI Provider Health Issues - Troubleshooting Guide

## Current Issues Identified

Based on the database analysis, here are the current provider configurations and issues:

### 1. **Ollama Local** (Enabled)
- **Status**: Enabled but likely unhealthy
- **Issue**: Ollama server not running
- **Solution**: 
  ```bash
  # Install Ollama if not installed
  curl -fsSL https://ollama.ai/install.sh | sh
  
  # Start Ollama server
  ollama serve
  
  # Install a model (in another terminal)
  ollama pull llama3.1:8b
  ```

### 2. **Google Gemini** (Enabled)
- **Status**: Enabled with API key configured
- **API Key**: `AIzaSyCGhRQSYv20yKukJaR7-o9k-QYnRKSUKMI`
- **Issue**: Possible API key validation or quota issues
- **Solution**: Verify API key permissions and quota

### 3. **Groq** (Enabled)
- **Status**: Enabled with API key configured  
- **API Key**: `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`
- **Issue**: Possible API key validation or rate limiting
- **Solution**: Verify API key and check rate limits

## Fixes Applied

### 1. **Improved Health Check Logic**
- Added better error handling for each provider type
- Added timeouts to prevent hanging requests
- More specific error messages for common issues
- Direct API validation instead of relying on AI SDK

### 2. **Enhanced Ollama Health Check**
- Added connection timeout (5 seconds)
- Better error messages for common issues
- Check for installed models
- Guidance on starting Ollama server

### 3. **Enhanced Google Health Check**
- Direct API call to validate key
- Better error categorization
- Quota and permission error handling

### 4. **Enhanced Groq Health Check**
- Added request timeout
- Better error handling for different HTTP status codes
- More detailed error messages

## Testing the Fixes

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Visit the test page**:
   ```
   http://localhost:3000/test-providers
   ```

3. **Test each provider individually**:
   - Click "Test Health" for each enabled provider
   - Check the detailed error messages

## Expected Results After Fixes

### Ollama
- If not running: Clear message "Ollama server is not running. Start it with: ollama serve"
- If running but no models: "Ollama is running but no models are installed. Run: ollama pull llama3.1:8b"
- If working: Shows available models

### Google Gemini
- If API key invalid: "Invalid Google API key or insufficient permissions"
- If quota exceeded: "Google API quota exceeded"
- If working: Shows available models

### Groq
- If API key invalid: "Invalid Groq API key"
- If rate limited: "Groq API rate limit exceeded"
- If working: Shows available models

## Next Steps

1. **Start Ollama** (if you want to use local models):
   ```bash
   ./start-ollama.sh
   ```

2. **Verify API Keys** (if you want to use cloud providers):
   - Check Google AI Studio for Gemini API key status
   - Check Groq Console for API key status

3. **Test Again**:
   - Refresh the test providers page
   - Test health for each provider
   - Should now see specific, actionable error messages

## Quick Fix Commands

```bash
# Fix Ollama (if installed)
ollama serve &
ollama pull llama3.1:8b

# Test health checks
npm run dev
# Then visit http://localhost:3000/test-providers
```
#!/bin/bash

echo "🦙 Starting Ollama..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed"
    echo "💡 Install it from: https://ollama.ai"
    exit 1
fi

# Check if Ollama is already running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is already running"
    echo "📦 Available models:"
    curl -s http://localhost:11434/api/tags | jq -r '.models[]?.name // "No models installed"'
else
    echo "🚀 Starting Ollama server..."
    ollama serve &
    
    # Wait for server to start
    echo "⏳ Waiting for Ollama to start..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama is now running"
            break
        fi
        sleep 1
    done
    
    # Check if any models are installed
    models=$(curl -s http://localhost:11434/api/tags | jq -r '.models[]?.name // empty')
    if [ -z "$models" ]; then
        echo "📦 No models installed. Installing llama3.1:8b..."
        ollama pull llama3.1:8b
    else
        echo "📦 Available models:"
        echo "$models"
    fi
fi

echo "🎉 Ollama setup complete!"
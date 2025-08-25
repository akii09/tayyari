// Simple test script to check AI provider health
const fetch = require('node-fetch');

async function testProviderHealth() {
  try {
    console.log('🔍 Testing AI provider health...');
    
    // Test the health check endpoint
    const response = await fetch('http://localhost:3000/api/ai/providers/test-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'google',
        apiKey: process.env.GOOGLE_API_KEY || 'test-key',
      }),
    });
    
    const data = await response.json();
    console.log('Health check response:', JSON.stringify(data, null, 2));
    
    // Test getting all providers
    const providersResponse = await fetch('http://localhost:3000/api/ai/providers');
    const providersData = await providersResponse.json();
    console.log('Providers:', JSON.stringify(providersData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProviderHealth();
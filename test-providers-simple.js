// Simple test to check provider health
async function testProviders() {
  console.log('🔍 Testing AI provider health...\n');
  
  try {
    // Test the health check API
    const response = await fetch('http://localhost:3000/api/ai/providers/test-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerId: 'google-provider-id' // This would need to be the actual ID
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check API working');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Health check API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing health check:', error.message);
  }
  
  // Test providers API
  try {
    const response = await fetch('http://localhost:3000/api/ai/providers');
    if (response.ok) {
      const data = await response.json();
      console.log('\n📋 Available providers:');
      if (data.success && data.providers) {
        data.providers.forEach(provider => {
          console.log(`  - ${provider.name} (${provider.type}) - ${provider.enabled ? 'Enabled' : 'Disabled'}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Error fetching providers:', error.message);
  }
}

// Run if this is the main module
if (typeof window === 'undefined') {
  testProviders();
}
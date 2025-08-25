#!/usr/bin/env node

/**
 * Simple script to test API endpoints
 */

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test 1: Get all providers
    console.log('1. Testing GET /api/ai/providers');
    const providersResponse = await fetch(`${baseUrl}/api/ai/providers`);
    console.log('Status:', providersResponse.status);
    console.log('Headers:', Object.fromEntries(providersResponse.headers.entries()));
    
    const providersText = await providersResponse.text();
    console.log('Response text length:', providersText.length);
    console.log('Response text preview:', providersText.substring(0, 200));
    
    if (providersText) {
      try {
        const providersData = JSON.parse(providersText);
        console.log('✅ Providers API working, found', providersData.providers?.length || 0, 'providers');
      } catch (e) {
        console.log('❌ Invalid JSON in providers response');
      }
    } else {
      console.log('❌ Empty response from providers API');
    }
    
    console.log('\n---\n');
    
    // Test 2: Seed providers
    console.log('2. Testing POST /api/ai/providers/seed');
    const seedResponse = await fetch(`${baseUrl}/api/ai/providers/seed`, {
      method: 'POST',
    });
    console.log('Status:', seedResponse.status);
    
    const seedText = await seedResponse.text();
    console.log('Response text length:', seedText.length);
    console.log('Response text preview:', seedText.substring(0, 200));
    
    if (seedText) {
      try {
        const seedData = JSON.parse(seedText);
        console.log('✅ Seed API working:', seedData.message);
      } catch (e) {
        console.log('❌ Invalid JSON in seed response');
      }
    } else {
      console.log('❌ Empty response from seed API');
    }
    
    console.log('\n---\n');
    
    // Test 3: Get providers again after seeding
    console.log('3. Testing GET /api/ai/providers (after seeding)');
    const providersResponse2 = await fetch(`${baseUrl}/api/ai/providers`);
    const providersText2 = await providersResponse2.text();
    
    if (providersText2) {
      try {
        const providersData2 = JSON.parse(providersText2);
        console.log('✅ Providers API working, found', providersData2.providers?.length || 0, 'providers');
        
        // Test connection to first provider if available
        if (providersData2.providers && providersData2.providers.length > 0) {
          const firstProvider = providersData2.providers[0];
          console.log('\n4. Testing connection to first provider:', firstProvider.name);
          
          const testResponse = await fetch(`${baseUrl}/api/ai/providers/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: firstProvider.id }),
          });
          
          const testText = await testResponse.text();
          console.log('Test response status:', testResponse.status);
          console.log('Test response text:', testText.substring(0, 200));
          
          if (testText) {
            try {
              const testData = JSON.parse(testText);
              console.log('✅ Test API working:', testData.message);
              console.log('Health status:', testData.healthStatus?.status);
            } catch (e) {
              console.log('❌ Invalid JSON in test response');
            }
          }
        }
      } catch (e) {
        console.log('❌ Invalid JSON in providers response');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEndpoints();
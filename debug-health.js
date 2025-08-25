const fetch = require('node-fetch');

async function testProviders() {
  console.log('🔍 Testing AI providers...\n');
  
  // Test Ollama
  console.log('1. Testing Ollama...');
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Ollama is running');
      console.log('   📦 Models:', data.models?.map(m => m.name).join(', ') || 'None');
    } else {
      console.log('   ❌ Ollama returned:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('   ❌ Ollama not accessible:', error.message);
    console.log('   💡 Try: ollama serve');
  }
  
  // Test Google
  console.log('\n2. Testing Google Gemini...');
  const googleApiKey = 'AIzaSyCGhRQSYv20yKukJaR7-o9k-QYnRKSUKMI';
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': googleApiKey,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Google API accessible');
      console.log('   📦 Models available:', data.models?.length || 0);
    } else {
      console.log('   ❌ Google API returned:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   📝 Error details:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('   ❌ Google API error:', error.message);
  }
  
  // Test Groq
  console.log('\n3. Testing Groq...');
  const groqApiKey = process.env.GROQ_API_KEY || '[CONFIGURED]';
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Groq API accessible');
      console.log('   📦 Models:', data.data?.map(m => m.id).join(', ') || 'None');
    } else {
      console.log('   ❌ Groq API returned:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   📝 Error details:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('   ❌ Groq API error:', error.message);
  }
}

testProviders().catch(console.error);
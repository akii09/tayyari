"use client";

import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { GlassCard } from '@/components/base/GlassCard';

export default function DebugGeminiPage() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testGeminiDirect = async () => {
    setIsLoading(true);
    setResult('Testing Gemini API directly...\n');
    
    try {
      // Test with a direct API call to Google's Gemini API
      const apiKey = prompt('Enter your Google API key:');
      if (!apiKey) {
        setResult('No API key provided');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello, how are you?'
            }]
          }]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(prev => prev + `✅ Success!\nResponse: ${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(prev => prev + `❌ Error: ${response.status} ${response.statusText}\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Exception: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGeminiViaHealthCheck = async () => {
    setIsLoading(true);
    setResult('Testing Gemini via health check...\n');
    
    try {
      // First get all providers
      const providersResponse = await fetch('/api/ai/providers');
      const providersData = await providersResponse.json();
      
      const geminiProvider = providersData.providers.find((p: any) => p.type === 'google');
      
      if (!geminiProvider) {
        setResult(prev => prev + '❌ No Google/Gemini provider found');
        setIsLoading(false);
        return;
      }

      setResult(prev => prev + `Found Gemini provider: ${geminiProvider.name}\n`);
      setResult(prev => prev + `Has API Key: ${geminiProvider.hasApiKey}\n`);
      setResult(prev => prev + `Models: ${geminiProvider.models.join(', ')}\n\n`);

      // Test health check
      const healthResponse = await fetch('/api/ai/providers/test-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: geminiProvider.id }),
      });

      const healthData = await healthResponse.json();
      
      if (healthData.success) {
        setResult(prev => prev + `✅ Health Check Success!\n`);
        setResult(prev => prev + `Status: ${healthData.healthStatus.status}\n`);
        setResult(prev => prev + `Response Time: ${healthData.healthStatus.responseTime}ms\n`);
        if (healthData.healthStatus.errorMessage) {
          setResult(prev => prev + `Error: ${healthData.healthStatus.errorMessage}\n`);
        }
      } else {
        setResult(prev => prev + `❌ Health Check Failed!\n`);
        setResult(prev => prev + `Error: ${healthData.error}\n`);
        setResult(prev => prev + `Details: ${healthData.details}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Exception: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            🔍 Gemini Debug Tool
          </h1>
          <p className="text-text-secondary">
            Debug and test Google Gemini API integration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Direct API Test
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Test Gemini API directly with your API key
            </p>
            <Button onClick={testGeminiDirect} disabled={isLoading} className="w-full">
              Test Direct API
            </Button>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Health Check Test
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Test via our health check system
            </p>
            <Button onClick={testGeminiViaHealthCheck} disabled={isLoading} className="w-full">
              Test Health Check
            </Button>
          </GlassCard>
        </div>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Test Results
          </h3>
          <div className="bg-dark-800 rounded-lg p-4 min-h-[300px]">
            <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
              {result || 'Click a test button to see results...'}
            </pre>
          </div>
          {result && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResult('')}
              className="mt-4"
            >
              Clear Results
            </Button>
          )}
        </GlassCard>

        <div className="mt-8 text-center">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h4 className="text-yellow-400 font-semibold mb-2">💡 Troubleshooting Tips</h4>
            <ul className="text-sm text-text-secondary text-left space-y-1">
              <li>• Make sure your Google API key is valid and has Generative AI API enabled</li>
              <li>• Check that you have billing enabled on your Google Cloud project</li>
              <li>• Verify the API key has the correct permissions</li>
              <li>• Try using 'gemini-1.5-flash' model first (it's more reliable)</li>
              <li>• Check the Google Cloud Console for any quota or billing issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
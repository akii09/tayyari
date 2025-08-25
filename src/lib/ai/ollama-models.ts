/**
 * Ollama Model Discovery
 * Dynamically fetch available models from local Ollama instance
 */

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

/**
 * Fetch available models from Ollama instance
 */
export async function fetchOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch Ollama models: ${response.status}`);
      return getDefaultOllamaModels();
    }

    const data: OllamaListResponse = await response.json();
    
    // Extract model names
    const modelNames = data.models.map(model => model.name);
    
    console.log(`✅ Found ${modelNames.length} Ollama models:`, modelNames);
    return modelNames;
  } catch (error) {
    console.warn('Failed to connect to Ollama:', error);
    return getDefaultOllamaModels();
  }
}

/**
 * Get default Ollama models as fallback
 */
export function getDefaultOllamaModels(): string[] {
  return [
    'gpt-oss:20b',
    'llama3.1:8b', 
    'llama3:latest',
    'deepseek-r1:latest',
    'phi3:latest',
    'gemma3:latest',
    'llama3.2:latest'
  ];
}

/**
 * Check if Ollama is running
 */
export async function isOllamaRunning(baseUrl: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get Ollama version info
 */
export async function getOllamaVersion(baseUrl: string = 'http://localhost:11434'): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.version || null;
  } catch (error) {
    return null;
  }
}
/**
 * Ollama Provider for AI SDK
 * Custom provider implementation for local Ollama models
 */

import { LanguageModelV1, LanguageModelV1CallWarning, LanguageModelV1FinishReason, LanguageModelV1StreamPart } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';

export interface OllamaConfig {
  baseUrl?: string;
  fetch?: FetchFunction;
}

export interface OllamaModelConfig {
  model: string;
  baseUrl?: string;
}

class OllamaLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly provider = 'ollama';
  readonly modelId: string;
  readonly baseUrl: string;

  constructor(
    modelId: string,
    config: OllamaConfig = {}
  ) {
    this.modelId = modelId;
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]) {
    const { prompt, mode, ...settings } = options;

    if (mode.type !== 'regular') {
      throw new Error('Ollama provider only supports regular mode');
    }

    const messages = prompt.map((message) => ({
      role: message.role,
      content: message.content.map(part => {
        if (part.type === 'text') {
          return part.text;
        }
        throw new Error('Ollama provider only supports text content');
      }).join(''),
    }));

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: false,
        options: {
          temperature: settings.temperature,
          top_p: settings.topP,
          num_predict: settings.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      text: data.message?.content || '',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
      },
      finishReason: 'stop' as LanguageModelV1FinishReason,
      warnings: [] as LanguageModelV1CallWarning[],
    };
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]) {
    const { prompt, mode, ...settings } = options;

    if (mode.type !== 'regular') {
      throw new Error('Ollama provider only supports regular mode');
    }

    const messages = prompt.map((message) => ({
      role: message.role,
      content: message.content.map(part => {
        if (part.type === 'text') {
          return part.text;
        }
        throw new Error('Ollama provider only supports text content');
      }).join(''),
    }));

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: true,
        options: {
          temperature: settings.temperature,
          top_p: settings.topP,
          num_predict: settings.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line);
                    
                    if (data.message?.content) {
                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: data.message.content,
                      });
                    }

                    if (data.done) {
                      controller.enqueue({
                        type: 'finish',
                        finishReason: 'stop',
                        usage: {
                          promptTokens: data.prompt_eval_count || 0,
                          completionTokens: data.eval_count || 0,
                        },
                      });
                      controller.close();
                      return;
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }
            }
          } catch (error) {
            controller.error(error);
          }
        },
      }),
    };
  }
}

export function createOllama(config: OllamaConfig = {}) {
  return (modelId: string) => new OllamaLanguageModel(modelId, config);
}

export const ollama = createOllama();
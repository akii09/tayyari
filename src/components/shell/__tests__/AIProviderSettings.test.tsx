/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIProviderSettings } from '../AIProviderSettings';

// Mock fetch
global.fetch = vi.fn();

const mockProviders = [
  {
    id: 'openai-provider',
    name: 'OpenAI GPT-4o',
    type: 'openai',
    enabled: false,
    priority: 1,
    models: ['gpt-4o', 'gpt-4o-mini'],
    hasApiKey: false,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10,
  },
  {
    id: 'anthropic-provider',
    name: 'Claude 3.5 Sonnet',
    type: 'anthropic',
    enabled: true,
    priority: 2,
    models: ['claude-3-5-sonnet-20241022'],
    hasApiKey: true,
    apiKey: '••••••••',
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10,
  },
  {
    id: 'ollama-provider',
    name: 'Ollama Local',
    type: 'ollama',
    enabled: false,
    priority: 5,
    models: ['llama3.1', 'codellama'],
    hasApiKey: false,
    baseUrl: 'http://localhost:11434',
    maxRequestsPerMinute: 120,
    maxCostPerDay: 0,
  },
];

describe('AIProviderSettings', () => {
  const mockOnClose = vi.fn();
  const mockOnProviderUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/ai/providers' && !options?.method) {
        // GET request
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            providers: mockProviders,
          }),
        });
      } else if (url === '/api/ai/providers' && options?.method === 'PUT') {
        // PUT request
        const body = JSON.parse(options.body);
        const updatedProvider = mockProviders.find(p => p.id === body.id);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Provider updated successfully',
            provider: { ...updatedProvider, ...body },
          }),
        });
      } else if (url === '/api/ai/providers/test' && options?.method === 'POST') {
        // POST test request
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Connection test completed',
            healthStatus: {
              status: 'healthy',
              lastChecked: new Date(),
              responseTime: 150,
            },
          }),
        });
      }
      
      return Promise.reject(new Error('Unknown request'));
    });
  });

  it('should not render when closed', () => {
    render(
      <AIProviderSettings
        isOpen={false}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    expect(screen.queryByText('AI Provider Settings')).not.toBeInTheDocument();
  });

  it('should render settings modal when open', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('AI Provider Settings')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Configure API keys and settings for AI providers')).toBeInTheDocument();
  });

  it('should display all providers', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4o')).toBeInTheDocument();
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
      expect(screen.getByText('Ollama Local')).toBeInTheDocument();
    });
  });

  it('should show correct status for each provider', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument(); // OpenAI
      expect(screen.getByText('Active')).toBeInTheDocument(); // Claude
    });
  });

  it('should allow API key input for non-Ollama providers', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      const apiKeyInputs = screen.getAllByPlaceholderText(/sk-/);
      expect(apiKeyInputs.length).toBeGreaterThan(0);
    });
  });

  it('should show base URL input for Ollama provider', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('http://localhost:11434')).toBeInTheDocument();
    });
  });

  it('should allow enabling/disabling providers', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      const checkboxes = screen.getAllByText('Enable this provider');
      expect(checkboxes.length).toBe(3);
    });
  });

  it('should save provider configuration', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      const saveButtons = screen.getAllByText('Save Changes');
      expect(saveButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(saveButtons[0]);
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"id":"openai-provider"'),
      });
    });
    
    expect(mockOnProviderUpdated).toHaveBeenCalled();
  });

  it('should test provider connection', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    // Enable a provider first
    await waitFor(() => {
      const enableCheckbox = screen.getAllByRole('checkbox')[1]; // Claude provider
      fireEvent.click(enableCheckbox);
    });
    
    await waitFor(() => {
      const testButtons = screen.getAllByText('Test Connection');
      const enabledTestButton = testButtons.find(button => 
        !(button as HTMLButtonElement).disabled
      );
      
      if (enabledTestButton) {
        fireEvent.click(enabledTestButton);
      }
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"id"'),
      });
    });
  });

  it('should close modal when close button is clicked', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);
    });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display provider models', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4o')).toBeInTheDocument();
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
      expect(screen.getByText('llama3.1')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch providers:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('should show loading state initially', () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    expect(screen.getByText('Loading providers...')).toBeInTheDocument();
  });

  it('should clear API key field after successful save', async () => {
    render(
      <AIProviderSettings
        isOpen={true}
        onClose={mockOnClose}
        onProviderUpdated={mockOnProviderUpdated}
      />
    );
    
    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
      expect((apiKeyInput as HTMLInputElement).value).toBe('test-api-key');
    });
    
    const saveButton = screen.getAllByText('Save Changes')[0];
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText('sk-...');
      expect((apiKeyInput as HTMLInputElement).value).toBe('');
    });
  });
});
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIModelSwitcher } from '../AIModelSwitcher';
import { AIModelProvider } from '@/lib/ai/AIModelContext';

// Mock fetch
global.fetch = vi.fn();

const mockModels = [
  {
    id: 'openai-gpt-4',
    name: 'gpt-4',
    provider: 'OpenAI',
    providerType: 'openai',
    isActive: true,
    isHealthy: true,
    priority: 1,
  },
  {
    id: 'anthropic-claude',
    name: 'claude-3-5-sonnet-20241022',
    provider: 'Claude',
    providerType: 'anthropic',
    isActive: true,
    isHealthy: false,
    priority: 2,
    errorMessage: 'API key not configured',
  },
  {
    id: 'ollama-llama',
    name: 'llama3.1',
    provider: 'Ollama Local',
    providerType: 'ollama',
    isActive: false,
    isHealthy: false,
    priority: 3,
  },
];

const MockedAIModelSwitcher = () => (
  <AIModelProvider>
    <AIModelSwitcher />
  </AIModelProvider>
);

describe('AIModelSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        models: mockModels,
        summary: {
          total: 3,
          active: 2,
          healthy: 1,
        },
      }),
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('should render loading state initially', () => {
    render(<MockedAIModelSwitcher />);
    
    expect(screen.getByText('Loading models...')).toBeInTheDocument();
  });

  it('should display model switcher after loading', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    expect(screen.getByText('1/2 active')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      expect(screen.getByText('AI Models')).toBeInTheDocument();
    });
    
    expect(screen.getByText('1 healthy • 2 active • 3 total')).toBeInTheDocument();
  });

  it('should display all models in dropdown', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Ollama Local')).toBeInTheDocument();
    });
  });

  it('should show settings button in dropdown', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      expect(screen.getByTitle('Configure AI providers')).toBeInTheDocument();
    });
  });

  it('should show correct status for each model', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument(); // OpenAI
      expect(screen.getByText('Unhealthy')).toBeInTheDocument(); // Claude
      expect(screen.getByText('Inactive')).toBeInTheDocument(); // Ollama
    });
  });

  it('should allow model selection', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      const claudeButton = screen.getByText('claude-3-5-sonnet-20241022').closest('button');
      expect(claudeButton).toBeInTheDocument();
      
      if (claudeButton) {
        fireEvent.click(claudeButton);
      }
    });
    
    // Should save to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('selectedAIModel', 'anthropic-claude');
  });

  it('should trigger health check when refresh button is clicked', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh health status');
      fireEvent.click(refreshButton);
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/ai/models/health-check', { method: 'POST' });
  });

  it('should display error message for unhealthy models', async () => {
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });
    
    const switcherButton = screen.getByRole('button');
    fireEvent.click(switcherButton);
    
    // Select the Claude model (which has an error)
    await waitFor(() => {
      const claudeButton = screen.getByText('claude-3-5-sonnet-20241022').closest('button');
      if (claudeButton) {
        fireEvent.click(claudeButton);
      }
    });
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('API key not configured')).toBeInTheDocument();
    });
  });

  it('should handle empty models list', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        models: [],
        summary: { total: 0, active: 0, healthy: 0 },
      }),
    });
    
    render(<MockedAIModelSwitcher />);
    
    await waitFor(() => {
      const switcherButton = screen.getByRole('button');
      fireEvent.click(switcherButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No AI models configured')).toBeInTheDocument();
      expect(screen.getByText('Configure providers in admin settings')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('API Error'));
    
    render(<MockedAIModelSwitcher />);
    
    // Should still render but with no models
    await waitFor(() => {
      expect(screen.getByText('No Model')).toBeInTheDocument();
    });
  });
});
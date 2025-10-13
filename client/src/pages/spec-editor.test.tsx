import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SpecEditorPage from './spec-editor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('SpecEditorPage', () => {
  const createClient = () => new QueryClient();

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { getByText } = render(
      <QueryClientProvider client={createClient()}>
        <SpecEditorPage />
      </QueryClientProvider>
    );

    // Assert the main heading is present
    const heading = getByText('Create Living Specification');
    expect(heading).toBeTruthy();
  });

  it('shows edit mode by default', () => {
    const { getByRole } = render(
      <QueryClientProvider client={createClient()}>
        <SpecEditorPage />
      </QueryClientProvider>
    );

    // Save button should be visible in edit mode
    const saveButton = getByRole('button', { name: /save/i });
    expect(saveButton).toBeTruthy();
  });
});

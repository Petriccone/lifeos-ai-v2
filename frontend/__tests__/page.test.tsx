import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

// Mock the api module BEFORE importing the page under test.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(public status: number, public body: unknown, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    ApiError,
    api: {
      mood: {
        summary: vi.fn().mockResolvedValue({
          anxiety: 15,
          happiness: 85,
          wellness: 82,
          sleep: 90,
          recovery: 78,
          energy: 70,
          count: 7,
        }),
        create: vi.fn().mockResolvedValue({}),
        list: vi.fn().mockResolvedValue([]),
      },
      tasks: {
        list: vi.fn().mockResolvedValue([
          {
            id: 't1',
            title: 'Review UI feedback',
            status: 'pending',
            priority: 'high',
          },
          {
            id: 't2',
            title: 'Upper Body Workout',
            status: 'pending',
            priority: 'medium',
          },
        ]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workouts: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
      chat: {
        send: vi.fn().mockResolvedValue({ response: 'ok' }),
      },
    },
  };
});

import DashboardPage from '@/app/page';

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows a loading state initially', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Syncing LifeOS/i)).toBeTruthy();
  });

  it('renders the computed health score after data loads', async () => {
    render(<DashboardPage />);
    // Expected: round((85 + 82 + 90 + 78) / 4) = round(83.75) = 84
    await waitFor(
      () => {
        expect(screen.getByText('84')).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it('renders tasks from the mocked api', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Review UI feedback')).toBeTruthy();
      expect(screen.getByText('Upper Body Workout')).toBeTruthy();
    });
  });

  it('renders the Log Entry button', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log Entry/i })).toBeTruthy();
    });
  });
});

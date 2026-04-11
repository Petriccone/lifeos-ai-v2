import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { TOKEN_STORAGE_KEY } from '@/lib/api';

// Mock next/navigation since AuthProvider uses useRouter/usePathname
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: pushMock, prefetch: vi.fn() }),
  usePathname: () => '/login',
}));

function Consumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.email : 'anon'}</div>
      <button
        data-testid="login-btn"
        onClick={() => {
          void login('a@b.com', 'pw');
        }}
      >
        login
      </button>
      <button
        data-testid="logout-btn"
        onClick={() => {
          logout();
        }}
      >
        logout
      </button>
    </div>
  );
}

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('AuthContext', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    pushMock.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state with no token: user null, loading resolves to false', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Should quickly flip loading → ready because there's no token to hydrate
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });
    expect(screen.getByTestId('user').textContent).toBe('anon');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hydrates user from stored token via api.auth.me', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ id: '1', email: 'stored@user.com' })
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('stored@user.com');
    });
    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('login persists token and sets user', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({
        access_token: 'new-token',
        token_type: 'bearer',
        user: { id: '2', email: 'a@b.com' },
      })
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('a@b.com');
    });
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-token');
  });

  it('logout clears token and user', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse({ id: '1', email: 'stored@user.com' })
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('stored@user.com');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('anon');
    });
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

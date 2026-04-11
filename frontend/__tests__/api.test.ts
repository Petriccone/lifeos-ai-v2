import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, TOKEN_STORAGE_KEY } from '@/lib/api';

type MockResponseInit = {
  ok?: boolean;
  status?: number;
  body?: unknown;
};

function mockResponse({ ok = true, status = 200, body = {} }: MockResponseInit) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST with JSON body for auth.login', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        body: {
          access_token: 'tok',
          token_type: 'bearer',
          user: { id: '1', email: 'a@b.com' },
        },
      })
    );

    const result = await api.auth.login({
      email: 'a@b.com',
      password: 'secret',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({ email: 'a@b.com', password: 'secret' })
    );
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(result.access_token).toBe('tok');
  });

  it('appends days query to mood.list', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ body: [] }));

    await api.mood.list(14);

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/mood?days=14');
  });

  it('defaults mood.list days to 7', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ body: [] }));

    await api.mood.list();

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/mood?days=7');
  });

  it('throws ApiError on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 500, body: { detail: 'boom' } })
    );

    await expect(api.tasks.list()).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError carries status and body', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 404, body: { detail: 'not found' } })
    );

    try {
      await api.tasks.list();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.body).toEqual({ detail: 'not found' });
    }
  });

  it('attaches Authorization header when token exists in localStorage', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'my-token');
    fetchMock.mockResolvedValueOnce(
      mockResponse({ body: { id: '1', email: 'a@b.com' } })
    );

    await api.auth.me();

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('does not attach Authorization header when no token', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ body: [] }));

    await api.tasks.list();

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });
});

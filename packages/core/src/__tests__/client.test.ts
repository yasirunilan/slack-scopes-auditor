import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlackClient } from '../api/client.js';
import { SlackApiError } from '../errors/index.js';

// Mock ky
vi.mock('ky', () => {
  const mockPost = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({
        post: mockPost,
      })),
    },
    HTTPError: class HTTPError extends Error {
      name = 'HTTPError';
    },
    TimeoutError: class TimeoutError extends Error {
      name = 'TimeoutError';
    },
  };
});

import ky from 'ky';

describe('SlackClient', () => {
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost = (ky.create as ReturnType<typeof vi.fn>)().post;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates client with default base URL', () => {
      new SlackClient({ token: 'xoxp-test-token' });
      expect(ky.create).toHaveBeenCalledWith({
        prefixUrl: 'https://slack.com/api',
      });
    });

    it('creates client with custom base URL', () => {
      new SlackClient({
        token: 'xoxp-test-token',
        baseUrl: 'https://custom.slack.com/api',
      });
      expect(ky.create).toHaveBeenCalledWith({
        prefixUrl: 'https://custom.slack.com/api',
      });
    });
  });

  describe('getIntegrationLogs', () => {
    it('makes POST request with Authorization header', async () => {
      const mockResponse = {
        ok: true,
        logs: [],
        paging: { count: 100, total: 0, page: 1, pages: 1 },
      };
      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      await client.getIntegrationLogs();

      expect(mockPost).toHaveBeenCalledWith('team.integrationLogs', {
        body: expect.any(URLSearchParams),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer xoxp-test-token',
        },
      });
    });

    it('passes parameters correctly', async () => {
      const mockResponse = {
        ok: true,
        logs: [],
        paging: { count: 50, total: 0, page: 2, pages: 3 },
      };
      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      await client.getIntegrationLogs({
        app_id: 'A123',
        change_type: 'added',
        count: 50,
        page: 2,
        user: 'U456',
        team_id: 'T789',
        service_id: 'S012',
      });

      const [, options] = mockPost.mock.calls[0];
      const searchParams = options.body as URLSearchParams;
      expect(searchParams.get('app_id')).toBe('A123');
      expect(searchParams.get('change_type')).toBe('added');
      expect(searchParams.get('count')).toBe('50');
      expect(searchParams.get('page')).toBe('2');
      expect(searchParams.get('user')).toBe('U456');
      expect(searchParams.get('team_id')).toBe('T789');
      expect(searchParams.get('service_id')).toBe('S012');
    });

    it('returns response on success', async () => {
      const mockResponse = {
        ok: true,
        logs: [
          {
            app_id: 'A123',
            user_id: 'U1',
            user_name: 'user1',
            date: '1700000000',
            change_type: 'added',
            scope: 'channels:read',
          },
        ],
        paging: { count: 100, total: 1, page: 1, pages: 1 },
      };
      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      const result = await client.getIntegrationLogs();

      expect(result).toEqual(mockResponse);
    });

    it('throws SlackApiError on API error response', async () => {
      const mockResponse = {
        ok: false,
        logs: [],
        paging: { count: 100, total: 0, page: 1, pages: 1 },
        error: 'invalid_auth',
      };
      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = new SlackClient({ token: 'bad-token' });
      await expect(client.getIntegrationLogs()).rejects.toThrow(SlackApiError);
      await expect(client.getIntegrationLogs()).rejects.toThrow(
        'Invalid authentication token'
      );
    });

    it('throws SlackApiError on HTTP error', async () => {
      const httpError = Object.assign(new Error('HTTP Error'), { name: 'HTTPError' });
      mockPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(httpError),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      await expect(client.getIntegrationLogs()).rejects.toThrow(SlackApiError);
      await expect(client.getIntegrationLogs()).rejects.toThrow(
        'HTTP request failed'
      );
    });

    it('throws SlackApiError on timeout', async () => {
      const timeoutError = Object.assign(new Error('Timeout'), { name: 'TimeoutError' });
      mockPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(timeoutError),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      await expect(client.getIntegrationLogs()).rejects.toThrow(SlackApiError);
      await expect(client.getIntegrationLogs()).rejects.toThrow('timed out');
    });

    it('rethrows unknown errors', async () => {
      const unknownError = new Error('Unknown network error');
      mockPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(unknownError),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      await expect(client.getIntegrationLogs()).rejects.toThrow(
        'Unknown network error'
      );
    });
  });

  describe('getAllIntegrationLogs', () => {
    it('fetches all pages', async () => {
      const page1Response = {
        ok: true,
        logs: [{ app_id: 'A1', user_id: 'U1', user_name: 'u1', date: '1', change_type: 'added' }],
        paging: { count: 1, total: 2, page: 1, pages: 2 },
      };
      const page2Response = {
        ok: true,
        logs: [{ app_id: 'A2', user_id: 'U2', user_name: 'u2', date: '2', change_type: 'added' }],
        paging: { count: 1, total: 2, page: 2, pages: 2 },
      };

      mockPost
        .mockReturnValueOnce({ json: vi.fn().mockResolvedValue(page1Response) })
        .mockReturnValueOnce({ json: vi.fn().mockResolvedValue(page2Response) });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      const logs = await client.getAllIntegrationLogs();

      expect(logs).toHaveLength(2);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('stops at limit', async () => {
      const page1Response = {
        ok: true,
        logs: [
          { app_id: 'A1', user_id: 'U1', user_name: 'u1', date: '1', change_type: 'added' },
          { app_id: 'A2', user_id: 'U2', user_name: 'u2', date: '2', change_type: 'added' },
        ],
        paging: { count: 2, total: 5, page: 1, pages: 3 },
      };

      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(page1Response),
      });

      const client = new SlackClient({ token: 'xoxp-test-token' });
      const logs = await client.getAllIntegrationLogs({ limit: 1 });

      expect(logs).toHaveLength(1);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('calls onProgress callback', async () => {
      const page1Response = {
        ok: true,
        logs: [{ app_id: 'A1', user_id: 'U1', user_name: 'u1', date: '1', change_type: 'added' }],
        paging: { count: 1, total: 1, page: 1, pages: 1 },
      };

      mockPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(page1Response),
      });

      const onProgress = vi.fn();
      const client = new SlackClient({ token: 'xoxp-test-token' });
      await client.getAllIntegrationLogs({ onProgress });

      expect(onProgress).toHaveBeenCalledWith({
        currentPage: 1,
        totalPages: 1,
        recordsFetched: 1,
      });
    });
  });
});

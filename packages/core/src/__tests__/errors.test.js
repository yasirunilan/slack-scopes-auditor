import { describe, it, expect } from 'vitest';
import { SlackApiError, ConfigurationError } from '../errors/index.js';
describe('SlackApiError', () => {
    it('creates error with known error code', () => {
        const error = new SlackApiError('invalid_auth', undefined);
        expect(error.code).toBe('invalid_auth');
        expect(error.message).toBe('Invalid authentication token. Please check your SLACK_TOKEN.');
        expect(error.name).toBe('SlackApiError');
    });
    it('creates error with unknown error code', () => {
        const error = new SlackApiError('some_unknown_error', undefined);
        expect(error.code).toBe('some_unknown_error');
        expect(error.message).toBe('Slack API error: some_unknown_error');
    });
    it('creates error with http_error code', () => {
        const error = new SlackApiError('http_error', undefined);
        expect(error.code).toBe('http_error');
        expect(error.message).toBe('HTTP request failed. Please check your network connection.');
    });
    it('creates error with timeout code', () => {
        const error = new SlackApiError('timeout', undefined);
        expect(error.code).toBe('timeout');
        expect(error.message).toBe('Request timed out. Please try again.');
    });
    it('creates error from response with ok: false', () => {
        const response = {
            ok: false,
            logs: [],
            paging: { count: 0, total: 0, page: 1, pages: 1 },
            error: 'not_admin',
        };
        const error = SlackApiError.fromResponse(response);
        expect(error.code).toBe('not_admin');
        expect(error.message).toBe('User must be an admin to access this API.');
        expect(error.response).toBe(response);
    });
    it('creates error from response without error field', () => {
        const response = {
            ok: false,
            logs: [],
            paging: { count: 0, total: 0, page: 1, pages: 1 },
            error: '',
        };
        // Force an undefined error to test fallback
        const error = SlackApiError.fromResponse({ ...response, error: undefined });
        expect(error.code).toBe('unknown_error');
    });
});
describe('ConfigurationError', () => {
    it('creates error with custom message', () => {
        const error = new ConfigurationError('Missing token');
        expect(error.message).toBe('Missing token');
        expect(error.name).toBe('ConfigurationError');
    });
});
//# sourceMappingURL=errors.test.js.map
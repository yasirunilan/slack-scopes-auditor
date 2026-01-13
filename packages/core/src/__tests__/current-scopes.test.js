import { describe, it, expect } from 'vitest';
import { computeCurrentScopes, computeAllAppScopes } from '../transformers/current-scopes.js';
describe('computeCurrentScopes', () => {
    it('returns empty scopes for no logs', () => {
        const result = computeCurrentScopes([], 'A123');
        expect(result.appId).toBe('A123');
        expect(result.activeScopes).toEqual([]);
        expect(result.totalGrants).toBe(0);
        expect(result.totalRevokes).toBe(0);
        expect(result.lastActivity).toBeNull();
    });
    it('computes scopes from added events', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read,users:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read', 'users:read']);
        expect(result.totalGrants).toBe(2);
        expect(result.totalRevokes).toBe(0);
    });
    it('removes scopes from removed events', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read,users:read,chat:write',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100',
                change_type: 'removed',
                scope: 'chat:write',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read', 'users:read']);
        expect(result.totalGrants).toBe(3);
        expect(result.totalRevokes).toBe(1);
    });
    it('handles expanded events', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100',
                change_type: 'expanded',
                scope: 'users:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read', 'users:read']);
        expect(result.totalGrants).toBe(2);
    });
    it('handles updated events', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'updated',
                scope: 'channels:read,users:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read', 'users:read']);
    });
    it('ignores enabled/disabled events for scope calculation', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100',
                change_type: 'disabled',
                reason: 'user',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read']);
    });
    it('filters logs by app_id', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A456',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'users:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read']);
    });
    it('handles service_id for service integrations', () => {
        const logs = [
            {
                service_id: 'S123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'S123');
        expect(result.activeScopes).toEqual(['channels:read']);
    });
    it('processes logs in chronological order', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000200', // Later
                change_type: 'removed',
                scope: 'channels:read',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100', // Earlier
                change_type: 'added',
                scope: 'channels:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        // Should be empty because removed comes after added
        expect(result.activeScopes).toEqual([]);
    });
    it('deduplicates scopes', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100',
                change_type: 'added',
                scope: 'channels:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.activeScopes).toEqual(['channels:read']);
        expect(result.totalGrants).toBe(2); // Both events counted
    });
    it('tracks lastActivity correctly', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000100',
                change_type: 'added',
                scope: 'users:read',
            },
        ];
        const result = computeCurrentScopes(logs, 'A123');
        expect(result.lastActivity).toEqual(new Date(1700000100 * 1000));
    });
});
describe('computeAllAppScopes', () => {
    it('returns empty map for no logs', () => {
        const result = computeAllAppScopes([]);
        expect(result.size).toBe(0);
    });
    it('computes scopes for multiple apps', () => {
        const logs = [
            {
                app_id: 'A123',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'channels:read',
            },
            {
                app_id: 'A456',
                user_id: 'U1',
                user_name: 'user1',
                date: '1700000000',
                change_type: 'added',
                scope: 'users:read',
            },
        ];
        const result = computeAllAppScopes(logs);
        expect(result.size).toBe(2);
        expect(result.get('A123')?.activeScopes).toEqual(['channels:read']);
        expect(result.get('A456')?.activeScopes).toEqual(['users:read']);
    });
});
//# sourceMappingURL=current-scopes.test.js.map
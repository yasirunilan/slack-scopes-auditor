import type { IntegrationLog, ChangeType } from '../api/types.js';
import { parseScopes } from './categorize.js';

/**
 * A single scope grant/revoke action by a user
 */
export interface UserScopeAction {
  appId: string;
  scopes: string[];
  changeType: ChangeType;
  timestamp: Date;
}

/**
 * Summary of scope changes by user
 */
export interface UserScopeSummary {
  userId: string;
  userName: string;
  actions: UserScopeAction[];
  totalScopesGranted: number;
  totalScopesRevoked: number;
  lastActivity: Date;
}

/**
 * Transform integration logs to user-wise scope summary
 * Shows what each user has granted/revoked
 */
export function transformToUserScopes(
  logs: IntegrationLog[]
): UserScopeSummary[] {
  const userMap = new Map<string, UserScopeSummary>();

  for (const log of logs) {
    const scopes = parseScopes(log.scope);
    const appId = log.app_id ?? log.service_id ?? 'unknown';
    const timestamp = new Date(parseInt(log.date) * 1000);

    let user = userMap.get(log.user_id);
    if (!user) {
      user = {
        userId: log.user_id,
        userName: log.user_name,
        actions: [],
        totalScopesGranted: 0,
        totalScopesRevoked: 0,
        lastActivity: timestamp,
      };
      userMap.set(log.user_id, user);
    }

    // Add action
    user.actions.push({
      appId,
      scopes,
      changeType: log.change_type,
      timestamp,
    });

    // Update counters
    if (log.change_type === 'added' || log.change_type === 'expanded') {
      user.totalScopesGranted += scopes.length;
    } else if (log.change_type === 'removed') {
      user.totalScopesRevoked += scopes.length;
    }

    // Update last activity
    if (timestamp > user.lastActivity) {
      user.lastActivity = timestamp;
    }
  }

  // Sort by last activity descending
  return Array.from(userMap.values()).sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  );
}

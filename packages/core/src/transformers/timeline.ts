import type { IntegrationLog, ChangeType, DisabledReason } from '../api/types.js';
import { parseScopes } from './categorize.js';

/**
 * A single event in the timeline view
 */
export interface TimelineEvent {
  /** Event timestamp */
  timestamp: Date;
  /** User ID who performed the action */
  userId: string;
  /** Username who performed the action */
  userName: string;
  /** App or service ID */
  appId: string;
  /** Type of change */
  changeType: ChangeType;
  /** Scopes affected */
  scopes: string[];
  /** Human-readable description */
  description: string;
  /** Reason (for disabled events) */
  reason?: DisabledReason;
}

/**
 * Transform integration logs to a timeline view
 * Sorted by date descending (most recent first)
 */
export function transformToTimeline(logs: IntegrationLog[]): TimelineEvent[] {
  return logs
    .map((log) => {
      const scopes = parseScopes(log.scope);
      const appId = log.app_id ?? log.service_id ?? 'unknown';

      return {
        timestamp: new Date(parseInt(log.date) * 1000),
        userId: log.user_id,
        userName: log.user_name,
        appId,
        changeType: log.change_type,
        scopes,
        description: formatEventDescription(log, scopes),
        reason: log.reason,
      };
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function formatEventDescription(
  log: IntegrationLog,
  scopes: string[]
): string {
  const scopeCount = scopes.length;
  const scopeText =
    scopeCount === 0
      ? ''
      : scopeCount === 1
        ? `scope: ${scopes[0]}`
        : `${scopeCount} scopes`;

  switch (log.change_type) {
    case 'added':
      return `Added ${scopeText || 'app'}`;
    case 'removed':
      return `Removed ${scopeText || 'app'}`;
    case 'enabled':
      return 'Enabled app';
    case 'disabled':
      return `Disabled app${log.reason ? ` (${log.reason})` : ''}`;
    case 'expanded':
      return `Expanded ${scopeText}`;
    case 'updated':
      return `Updated ${scopeText || 'app'}`;
    default:
      return log.change_type;
  }
}

/**
 * Filter timeline events by date range
 */
export function filterTimelineByDays(
  events: TimelineEvent[],
  days: number
): TimelineEvent[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return events.filter((event) => event.timestamp >= cutoff);
}

/**
 * Filter timeline events by app ID
 */
export function filterTimelineByApp(
  events: TimelineEvent[],
  appId: string
): TimelineEvent[] {
  return events.filter((event) => event.appId === appId);
}

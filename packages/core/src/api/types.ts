/**
 * Types for Slack team.integrationLogs API
 * @see https://api.slack.com/methods/team.integrationLogs
 */

export type ChangeType =
  | 'added'
  | 'removed'
  | 'enabled'
  | 'disabled'
  | 'expanded'
  | 'updated';

export type DisabledReason =
  | 'user'
  | 'rate_limits'
  | 'slack'
  | 'errors'
  | 'system'
  | 'admin'
  | 'api_decline'
  | 'deauth';

export interface IntegrationLog {
  /** App ID (for API applications) */
  app_id?: string;
  /** App type (for API applications) */
  app_type?: string;
  /** Service ID (for service integrations) */
  service_id?: string;
  /** Service type (for service integrations) */
  service_type?: string;
  /** User ID who performed the action */
  user_id: string;
  /** Username who performed the action */
  user_name: string;
  /** Channel ID (if applicable) */
  channel?: string;
  /** Unix timestamp as string */
  date: string;
  /** Type of change */
  change_type: ChangeType;
  /** Comma-separated list of scopes */
  scope?: string;
  /** Reason for disabling (only for disabled events) */
  reason?: DisabledReason;
  /** RSS feed indicator */
  rss_feed?: boolean;
  /** RSS feed change type */
  rss_feed_change_type?: string;
  /** RSS feed title */
  rss_feed_title?: string;
  /** RSS feed URL */
  rss_feed_url?: string;
}

export interface PagingInfo {
  count: number;
  total: number;
  page: number;
  pages: number;
}

export interface IntegrationLogsRequest {
  /** Filter logs to a specific app */
  app_id?: string;
  /** Filter by change type */
  change_type?: ChangeType;
  /** Number of results per page (default 100, max 1000) */
  count?: number;
  /** Page number */
  page?: number;
  /** Filter by user ID */
  user?: string;
  /** Team ID (for org-level tokens) */
  team_id?: string;
  /** Filter by service ID */
  service_id?: string;
}

export type IntegrationLogsResponse =
  | { ok: true; logs: IntegrationLog[]; paging: PagingInfo; error?: never }
  | { ok: false; logs: IntegrationLog[]; paging: PagingInfo; error: string };

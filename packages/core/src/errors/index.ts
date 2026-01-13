import type { IntegrationLogsResponse } from '../api/types.js';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_auth: 'Invalid authentication token. Please check your SLACK_TOKEN.',
  not_admin: 'User must be an admin to access this API.',
  paid_only: 'This API is only available on paid Slack plans.',
  not_allowed_token_type: 'Token type not permitted for this API. Use a user token with admin scope.',
  org_login_required: 'Org-level token required for this operation.',
  missing_scope: 'Token is missing required scope. Ensure you have the "admin" scope.',
  account_inactive: 'Account is inactive or has been deactivated.',
  token_revoked: 'Token has been revoked.',
  no_permission: 'User does not have permission to access this resource.',
  team_not_found: 'Team not found.',
  app_not_installed: 'App is not installed in this workspace.',
  http_error: 'HTTP request failed. Please check your network connection.',
  timeout: 'Request timed out. Please try again.',
};

export class SlackApiError extends Error {
  public readonly code: string;
  public readonly response?: IntegrationLogsResponse;

  constructor(code: string, response?: IntegrationLogsResponse) {
    const message = ERROR_MESSAGES[code] ?? `Slack API error: ${code}`;
    super(message);
    this.name = 'SlackApiError';
    this.code = code;
    this.response = response;
  }

  static fromResponse(response: IntegrationLogsResponse): SlackApiError {
    return new SlackApiError(response.error ?? 'unknown_error', response);
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

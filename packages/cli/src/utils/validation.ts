import { ConfigurationError } from '@slack-scopes-auditor/core';

/**
 * Validate Slack App ID format
 * App IDs start with 'A' followed by alphanumeric characters
 */
export function validateAppId(appId: string): void {
  if (!/^A[A-Z0-9]+$/.test(appId)) {
    throw new ConfigurationError(
      `Invalid App ID format: "${appId}". App IDs should start with 'A' followed by uppercase letters and numbers (e.g., A01234ABCDE).`
    );
  }
}

/**
 * Parse and validate a positive integer from string
 */
export function parsePositiveInt(value: string, name: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new ConfigurationError(`${name} must be a positive number, got: "${value}"`);
  }
  return parsed;
}

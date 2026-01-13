import { cosmiconfig } from 'cosmiconfig';
import * as dotenv from 'dotenv';
import { ConfigurationError } from '@slack-scopes-auditor/core';

export interface AppConfig {
  token: string;
  defaultOutput?: 'table' | 'json';
  defaultAppId?: string;
  teamId?: string;
}

export interface CliOptions {
  token?: string;
  output?: 'table' | 'json';
  teamId?: string;
}

/**
 * Load configuration from CLI args, environment variables, or config file
 * Priority: CLI args > env vars > config file
 */
export async function getConfig(cliOptions: CliOptions): Promise<AppConfig> {
  // Load .env file if present
  dotenv.config();

  // Load cosmiconfig
  const explorer = cosmiconfig('slack-scopes');
  let fileConfig: Partial<AppConfig> = {};
  try {
    const result = await explorer.search();
    fileConfig = (result?.config as Partial<AppConfig>) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Failed to parse configuration file: ${message}\n\n` +
        'Please check your .slack-scopesrc.json or slack-scopes.config.js file for syntax errors.'
    );
  }

  // Resolve token with priority
  const token =
    cliOptions.token ?? process.env.SLACK_TOKEN ?? fileConfig.token;

  if (!token) {
    throw new ConfigurationError(
      'No Slack token provided.\n\n' +
        'Provide a token using one of these methods:\n' +
        '  1. CLI flag: --token <your-token>\n' +
        '  2. Environment variable: SLACK_TOKEN=<your-token>\n' +
        '  3. Config file: .slack-scopesrc.json with {"token": "<your-token>"}\n\n' +
        'Run "scope-auditor manifest" to see how to create a Slack app and get a token.'
    );
  }

  return {
    token,
    defaultOutput:
      (cliOptions.output as 'table' | 'json') ??
      (process.env.SLACK_SCOPES_OUTPUT as 'table' | 'json') ??
      fileConfig.defaultOutput ??
      'table',
    defaultAppId: fileConfig.defaultAppId,
    teamId:
      cliOptions.teamId ?? process.env.SLACK_TEAM_ID ?? fileConfig.teamId,
  };
}

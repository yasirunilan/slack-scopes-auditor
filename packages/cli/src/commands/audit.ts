import { Command } from 'commander';
import ora from 'ora';
import {
  SlackClient,
  computeCurrentScopes,
  categorizeScopes,
} from '@slack-scopes-auditor/core';
import { getConfig } from '../utils/config.js';
import { handleError } from '../utils/error-handler.js';
import { validateAppId, parsePositiveInt } from '../utils/validation.js';
import { formatCurrentScopesTable, formatJson } from '../formatters/index.js';

export function createAuditCommand(): Command {
  return new Command('audit')
    .description('Show current active scopes for a Slack app (categorized)')
    .requiredOption('-a, --app-id <appId>', 'App ID to audit')
    .option('--raw', 'Show raw scope list without categorization')
    .option('-l, --limit <limit>', 'Maximum number of log entries to fetch')
    .action(async (options, cmd) => {
      const spinner = ora('Fetching integration logs...').start();
      try {
        validateAppId(options.appId);
        const limit = options.limit ? parsePositiveInt(options.limit, 'Limit') : undefined;

        const globalOpts = cmd.optsWithGlobals();
        const config = await getConfig(globalOpts);

        const client = new SlackClient({ token: config.token });
        const logs = await client.getAllIntegrationLogs({
          app_id: options.appId,
          team_id: config.teamId,
          limit,
          onProgress: (progress) => {
            spinner.text = `Fetching page ${progress.currentPage}/${progress.totalPages} (${progress.recordsFetched} records)...`;
          },
        });

        const limitNote = limit && logs.length >= limit ? ` (limited to ${limit})` : '';
        spinner.succeed(`Fetched ${logs.length} log entries${limitNote}`);

        // Compute current scopes
        const result = computeCurrentScopes(logs, options.appId);

        if (globalOpts.output === 'json') {
          if (options.raw) {
            console.log(formatJson(result));
          } else {
            const categorized = categorizeScopes(result.activeScopes);
            console.log(
              formatJson({
                ...result,
                categorized,
              })
            );
          }
        } else {
          if (options.raw) {
            console.log('\nActive Scopes:');
            for (const scope of result.activeScopes) {
              console.log(`  ${scope}`);
            }
            console.log(`\nTotal: ${result.activeScopes.length} scopes`);
          } else {
            const categorized = categorizeScopes(result.activeScopes);
            console.log(formatCurrentScopesTable(result, categorized));
          }
        }
      } catch (error) {
        spinner.fail('Failed to audit app');
        handleError(error);
      }
    });
}

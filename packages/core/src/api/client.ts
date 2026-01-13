import ky, { type KyInstance, HTTPError, TimeoutError } from 'ky';
import type {
  IntegrationLog,
  IntegrationLogsRequest,
  IntegrationLogsResponse,
} from './types.js';
import { SlackApiError } from '../errors/index.js';

export interface SlackClientConfig {
  /** Slack user token with admin scope */
  token: string;
  /** Base URL for Slack API (defaults to https://slack.com/api) */
  baseUrl?: string;
}

export interface PaginationProgress {
  /** Current page being fetched */
  currentPage: number;
  /** Total number of pages (if known) */
  totalPages: number;
  /** Total records fetched so far */
  recordsFetched: number;
}

export interface GetAllLogsOptions extends IntegrationLogsRequest {
  /** Maximum number of records to fetch (stops pagination when reached) */
  limit?: number;
  /** Progress callback called after each page is fetched */
  onProgress?: (progress: PaginationProgress) => void;
}

export class SlackClient {
  private client: KyInstance;
  private token: string;

  constructor(config: SlackClientConfig) {
    this.token = config.token;
    this.client = ky.create({
      prefixUrl: config.baseUrl ?? 'https://slack.com/api',
    });
  }

  /**
   * Fetch a single page of integration logs
   */
  async getIntegrationLogs(
    params: IntegrationLogsRequest = {}
  ): Promise<IntegrationLogsResponse> {
    const searchParams = new URLSearchParams();

    if (params.app_id) searchParams.set('app_id', params.app_id);
    if (params.change_type) searchParams.set('change_type', params.change_type);
    if (params.count) searchParams.set('count', params.count.toString());
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.user) searchParams.set('user', params.user);
    if (params.team_id) searchParams.set('team_id', params.team_id);
    if (params.service_id) searchParams.set('service_id', params.service_id);

    try {
      const response = await this.client
        .post('team.integrationLogs', {
          body: searchParams,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${this.token}`,
          },
        })
        .json<IntegrationLogsResponse>();

      if (!response.ok) {
        throw SlackApiError.fromResponse(response);
      }

      return response;
    } catch (error) {
      if (error instanceof SlackApiError) {
        throw error;
      }
      if (error instanceof HTTPError || (error instanceof Error && error.name === 'HTTPError')) {
        throw new SlackApiError('http_error', undefined);
      }
      if (error instanceof TimeoutError || (error instanceof Error && error.name === 'TimeoutError')) {
        throw new SlackApiError('timeout', undefined);
      }
      throw error;
    }
  }

  /**
   * Fetch all pages of integration logs
   */
  async getAllIntegrationLogs(
    params: GetAllLogsOptions = {}
  ): Promise<IntegrationLog[]> {
    const { limit, onProgress, ...requestParams } = params;
    const allLogs: IntegrationLog[] = [];
    let page = 1;
    let totalPages = 1;
    const count = requestParams.count ?? 100;

    do {
      const response = await this.getIntegrationLogs({
        ...requestParams,
        page,
        count,
      });

      allLogs.push(...response.logs);
      totalPages = response.paging.pages;

      // Call progress callback if provided
      if (onProgress) {
        onProgress({
          currentPage: page,
          totalPages,
          recordsFetched: allLogs.length,
        });
      }

      // Check if we've reached the limit
      if (limit && allLogs.length >= limit) {
        // Trim to exact limit
        return allLogs.slice(0, limit);
      }

      page++;
    } while (page <= totalPages);

    return allLogs;
  }
}

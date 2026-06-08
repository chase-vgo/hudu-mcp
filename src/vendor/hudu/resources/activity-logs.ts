/**
 * Activity Logs resource operations
 */

import type { HttpClient } from '../http.js';
import type {
  ActivityLog,
  ActivityLogListParams,
} from '../types/activity-logs.js';

export class ActivityLogsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async list(params?: ActivityLogListParams): Promise<ActivityLog[]> {
    const response = await this.httpClient.request<{ activity_logs: ActivityLog[] }>('/api/v1/activity_logs', {
      params: this.buildParams(params),
    });
    return response.activity_logs;
  }

  async listAll(params?: ActivityLogListParams): Promise<ActivityLog[]> {
    const allItems: ActivityLog[] = [];
    let page = 1;
    const pageSize = params?.page_size ?? 25;

    while (true) {
      const items = await this.list({ ...params, page, page_size: pageSize });
      allItems.push(...items);
      if (items.length < pageSize) break;
      page++;
    }
    return allItems;
  }

  private buildParams(params?: object): Record<string, string | number | boolean | undefined> {
    if (!params) return {};
    const result: Record<string, string | number | boolean | undefined> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        result[key] = value as string | number | boolean;
      }
    }
    return result;
  }
}

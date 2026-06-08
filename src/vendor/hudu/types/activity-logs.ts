import type { BaseEntity, BaseListParams } from './common.js';

export interface ActivityLog extends BaseEntity {
  user_id?: number;
  user_email?: string;
  action?: string;
  record_type?: string;
  record_id?: number;
  record_name?: string;
  ip_address?: string;
  source?: string;
  created_at?: string;
}

export interface ActivityLogListParams extends BaseListParams {
  user_id?: number;
  user_email?: string;
  resource_id?: number;
  resource_type?: string;
  action_message?: string;
  start_date?: string;
}

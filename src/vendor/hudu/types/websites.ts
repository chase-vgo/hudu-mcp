import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Website extends BaseEntity, TimestampFields {
  name: string;
  url?: string;
  notes?: string;
  paused?: boolean;
  company_id?: number;
  disable_dns?: boolean;
  disable_ssl?: boolean;
  disable_whois?: boolean;
  slug?: string;
  object_type?: string;
  monitoring_status?: string;
}

export interface WebsiteListParams extends BaseListParams {
  name?: string;
  company_id?: number;
}

export interface WebsiteCreateData {
  name: string;
  url?: string;
  notes?: string;
  paused?: boolean;
  company_id?: number;
  disable_dns?: boolean;
  disable_ssl?: boolean;
  disable_whois?: boolean;
}

export interface WebsiteUpdateData extends Partial<WebsiteCreateData> {}

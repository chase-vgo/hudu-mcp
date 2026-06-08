import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface MagicDash extends BaseEntity, TimestampFields {
  title: string;
  company_name?: string;
  company_id?: number;
  content?: string;
  content_link?: string;
  icon?: string;
  image_url?: string;
  shade?: string;
  message?: string;
}

export interface MagicDashListParams extends BaseListParams {
  company_id?: number;
  title?: string;
}

export interface MagicDashCreateData {
  title: string;
  company_name?: string;
  content?: string;
  content_link?: string;
  icon?: string;
  image_url?: string;
  shade?: string;
  message?: string;
}

export interface MagicDashUpdateData extends Partial<MagicDashCreateData> {}

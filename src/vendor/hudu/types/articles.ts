import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Article extends BaseEntity, TimestampFields {
  name: string;
  content?: string;
  folder_id?: number;
  company_id?: number;
  enable_sharing?: boolean;
  slug?: string;
  draft?: boolean;
  share_url?: string;
  object_type?: string;
}

export interface ArticleListParams extends BaseListParams {
  company_id?: number;
  name?: string;
  draft?: boolean;
}

export interface ArticleCreateData {
  name: string;
  content?: string;
  folder_id?: number;
  company_id?: number;
  enable_sharing?: boolean;
  draft?: boolean;
}

export interface ArticleUpdateData extends Partial<ArticleCreateData> {}

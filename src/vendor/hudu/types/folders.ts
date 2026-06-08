import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Folder extends BaseEntity, TimestampFields {
  name: string;
  icon?: string;
  description?: string;
  parent_folder_id?: number;
  company_id?: number;
  slug?: string;
  object_type?: string;
}

export interface FolderListParams extends BaseListParams {
  company_id?: number;
  name?: string;
}

export interface FolderCreateData {
  name: string;
  icon?: string;
  description?: string;
  parent_folder_id?: number;
  company_id?: number;
}

export interface FolderUpdateData extends Partial<FolderCreateData> {}

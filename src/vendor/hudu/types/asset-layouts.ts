import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface AssetLayout extends BaseEntity, TimestampFields {
  name: string;
  icon?: string;
  color?: string;
  icon_color?: string;
  include_passwords?: boolean;
  include_photos?: boolean;
  include_comments?: boolean;
  include_files?: boolean;
  active?: boolean;
  slug?: string;
  fields?: AssetLayoutField[];
}

export interface AssetLayoutField {
  id?: number;
  label: string;
  field_type: string;
  required?: boolean;
  hint?: string;
  show_in_list?: boolean;
  position?: number;
  is_destroyed?: boolean;
  options?: string;
  linkable_id?: number;
  expiration?: boolean;
}

export interface AssetLayoutListParams extends BaseListParams {
  name?: string;
}

export interface AssetLayoutCreateData {
  name: string;
  icon?: string;
  color?: string;
  icon_color?: string;
  include_passwords?: boolean;
  include_photos?: boolean;
  include_comments?: boolean;
  include_files?: boolean;
  active?: boolean;
  fields?: Omit<AssetLayoutField, 'id'>[];
}

export interface AssetLayoutUpdateData extends Partial<AssetLayoutCreateData> {}

import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Asset extends BaseEntity, TimestampFields {
  company_id: number;
  asset_layout_id: number;
  slug?: string;
  name: string;
  primary_serial?: string;
  primary_model?: string;
  primary_manufacturer?: string;
  primary_mail?: string;
  archived?: boolean;
  object_type?: string;
  asset_type?: string;
  url?: string;
  fields?: AssetField[];
  cards?: AssetCard[];
}

export interface AssetField {
  id?: number;
  label: string;
  value: string | number | boolean | null;
  field_type?: string;
  position?: number;
}

export interface AssetCard {
  id?: number;
  integrator_id?: number;
  integrator_name?: string;
  sync_id?: number;
  identifier?: string;
  data?: Record<string, unknown>;
}

export interface AssetListParams extends BaseListParams {
  company_id?: number;
  asset_layout_id?: number;
  name?: string;
  primary_serial?: string;
  archived?: boolean;
  id?: number;
}

export interface AssetCreateData {
  company_id: number;
  asset_layout_id: number;
  name: string;
  primary_serial?: string;
  primary_model?: string;
  primary_manufacturer?: string;
  primary_mail?: string;
  custom_fields?: Record<string, unknown>;
}

export interface AssetUpdateData extends Partial<AssetCreateData> {}

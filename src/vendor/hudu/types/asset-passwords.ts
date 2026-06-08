import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface AssetPassword extends BaseEntity, TimestampFields {
  company_id: number;
  name: string;
  username?: string;
  password?: string;
  otp_secret?: string;
  url?: string;
  password_type?: string;
  description?: string;
  passwordable_type?: string;
  passwordable_id?: number;
  slug?: string;
  in_portal?: boolean;
  login_url?: string;
  password_folder_id?: number;
  cached_resource_name?: string;
}

export interface AssetPasswordListParams extends BaseListParams {
  company_id?: number;
  name?: string;
  search?: string;
}

export interface AssetPasswordCreateData {
  company_id: number;
  name: string;
  username?: string;
  password?: string;
  otp_secret?: string;
  url?: string;
  password_type?: string;
  description?: string;
  passwordable_type?: string;
  passwordable_id?: number;
  in_portal?: boolean;
  password_folder_id?: number;
}

export interface AssetPasswordUpdateData extends Partial<AssetPasswordCreateData> {}

import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Company extends BaseEntity, TimestampFields {
  name: string;
  nickname?: string;
  company_type?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country_name?: string;
  phone_number?: string;
  fax_number?: string;
  website?: string;
  id_number?: string;
  notes?: string;
  parent_company_id?: number;
  parent_company_name?: string;
  archived?: boolean;
  slug?: string;
  object_type?: string;
  full_url?: string;
}

export interface CompanyListParams extends BaseListParams {
  name?: string;
  id_number?: string;
  website?: string;
  phone_number?: string;
  city?: string;
  state?: string;
  archived?: boolean;
}

export interface CompanyCreateData {
  name: string;
  nickname?: string;
  company_type?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country_name?: string;
  phone_number?: string;
  fax_number?: string;
  website?: string;
  id_number?: string;
  notes?: string;
  parent_company_id?: number;
}

export interface CompanyUpdateData extends Partial<CompanyCreateData> {}

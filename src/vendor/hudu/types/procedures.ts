import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

export interface Procedure extends BaseEntity, TimestampFields {
  name: string;
  description?: string;
  company_id?: number;
  slug?: string;
  object_type?: string;
}

export interface ProcedureListParams extends BaseListParams {
  company_id?: number;
  name?: string;
}

export interface ProcedureCreateData {
  name: string;
  description?: string;
  company_id?: number;
}

export interface ProcedureUpdateData extends Partial<ProcedureCreateData> {}

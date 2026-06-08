import type { BaseEntity } from './common.js';

export interface Relation extends BaseEntity {
  fromable_type: string;
  fromable_id: number;
  toable_type: string;
  toable_id: number;
  description?: string;
  is_inverse?: boolean;
  name?: string;
}

export interface RelationListParams {
  page?: number;
  page_size?: number;
}

export interface RelationCreateData {
  fromable_type: string;
  fromable_id: number;
  toable_type: string;
  toable_id: number;
  description?: string;
}

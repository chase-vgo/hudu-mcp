/**
 * Common types shared across Hudu resources
 */

export interface BaseListParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 25) */
  page_size?: number;
}

export interface BaseEntity {
  id: number;
}

export interface TimestampFields {
  created_at?: string;
  updated_at?: string;
}

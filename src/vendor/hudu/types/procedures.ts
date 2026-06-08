import type { BaseEntity, BaseListParams, TimestampFields } from './common.js';

/**
 * A Hudu "process" or "run". Since Hudu's process revamp, `/procedures` returns
 * both templates (`run: false`) and active instances/runs (`run: true`).
 */
export interface Procedure extends BaseEntity, TimestampFields {
  name: string;
  description?: string;
  company_id?: number;
  company_name?: string;
  slug?: string;
  object_type?: string;
  /** True for a run (active instance), false for a process (template). */
  run?: boolean;
  /** The parent process this run was kicked off from. Null for processes. */
  parent_process_id?: number | null;
  /** Scope of a process: 'global' or 'company'. Null for runs. */
  process_type?: 'global' | 'company' | null;
  /** 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled'. */
  status?: string;
  /** Total number of tasks. */
  total?: number;
  /** Number of completed tasks. */
  completed?: number;
  completion_percentage?: string;
  url?: string;
  share_url?: string;
}

export interface ProcedureListParams extends BaseListParams {
  /**
   * Filter by type: 'process' (templates only), 'run' (active instances only),
   * or 'all' (both). Hudu defaults to 'all' when omitted.
   */
  type?: 'process' | 'run' | 'all';
  /** Filter processes by scope: 'global' or 'company'. */
  process_scope?: 'global' | 'company';
  /** Return only runs created from this parent process. */
  parent_process_id?: number;
  company_id?: number;
  name?: string;
  slug?: string;
  /** Creation date: exact ('2024-01-15') or range ('2024-01-01,2024-01-31'). */
  created_at?: string;
  /** Update date: exact ('2024-01-15') or range ('2024-01-01,2024-01-31'). */
  updated_at?: string;
  /** 'true'/'1' for archived only, 'false'/'0' for non-archived (default). */
  archived?: 'true' | 'false' | '1' | '0';
}

export interface ProcedureCreateData {
  name: string;
  description?: string;
  company_id?: number;
}

export interface ProcedureUpdateData extends Partial<ProcedureCreateData> {}

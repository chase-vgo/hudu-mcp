// Client
export { HuduClient } from './client.js';

// Config
export type { HuduConfig, ResolvedConfig, RateLimitConfig } from './config.js';
export { resolveConfig, DEFAULT_RATE_LIMIT_CONFIG } from './config.js';

// Auth
export { AuthManager } from './auth.js';

// Errors
export {
  HuduError,
  HuduAuthenticationError,
  HuduForbiddenError,
  HuduNotFoundError,
  HuduValidationError,
  HuduRateLimitError,
  HuduServerError,
} from './errors.js';

// Types
export type * from './types/index.js';

// Resources
export { CompaniesResource } from './resources/companies.js';
export { AssetsResource } from './resources/assets.js';
export { AssetLayoutsResource } from './resources/asset-layouts.js';
export { AssetPasswordsResource } from './resources/asset-passwords.js';
export { ArticlesResource } from './resources/articles.js';
export { WebsitesResource } from './resources/websites.js';
export { FoldersResource } from './resources/folders.js';
export { ProceduresResource } from './resources/procedures.js';
export { ActivityLogsResource } from './resources/activity-logs.js';
export { RelationsResource } from './resources/relations.js';
export { MagicDashResource } from './resources/magic-dash.js';

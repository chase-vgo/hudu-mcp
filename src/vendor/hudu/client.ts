import type { HuduConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { AuthManager } from './auth.js';
import { HttpClient } from './http.js';
import { RateLimiter } from './rate-limiter.js';
import { CompaniesResource } from './resources/companies.js';
import { AssetsResource } from './resources/assets.js';
import { AssetLayoutsResource } from './resources/asset-layouts.js';
import { AssetPasswordsResource } from './resources/asset-passwords.js';
import { ArticlesResource } from './resources/articles.js';
import { WebsitesResource } from './resources/websites.js';
import { FoldersResource } from './resources/folders.js';
import { ProceduresResource } from './resources/procedures.js';
import { ActivityLogsResource } from './resources/activity-logs.js';
import { RelationsResource } from './resources/relations.js';
import { MagicDashResource } from './resources/magic-dash.js';

export class HuduClient {
  private readonly config: ResolvedConfig;
  private readonly authManager: AuthManager;
  private readonly rateLimiter: RateLimiter;
  private readonly httpClient: HttpClient;

  readonly companies: CompaniesResource;
  readonly assets: AssetsResource;
  readonly assetLayouts: AssetLayoutsResource;
  readonly assetPasswords: AssetPasswordsResource;
  readonly articles: ArticlesResource;
  readonly websites: WebsitesResource;
  readonly folders: FoldersResource;
  readonly procedures: ProceduresResource;
  readonly activityLogs: ActivityLogsResource;
  readonly relations: RelationsResource;
  readonly magicDash: MagicDashResource;

  constructor(config: HuduConfig) {
    this.config = resolveConfig(config);
    this.authManager = new AuthManager(this.config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.httpClient = new HttpClient(this.config, this.authManager, this.rateLimiter);

    this.companies = new CompaniesResource(this.httpClient);
    this.assets = new AssetsResource(this.httpClient);
    this.assetLayouts = new AssetLayoutsResource(this.httpClient);
    this.assetPasswords = new AssetPasswordsResource(this.httpClient);
    this.articles = new ArticlesResource(this.httpClient);
    this.websites = new WebsitesResource(this.httpClient);
    this.folders = new FoldersResource(this.httpClient);
    this.procedures = new ProceduresResource(this.httpClient);
    this.activityLogs = new ActivityLogsResource(this.httpClient);
    this.relations = new RelationsResource(this.httpClient);
    this.magicDash = new MagicDashResource(this.httpClient);
  }

  getConfig(): Readonly<ResolvedConfig> {
    return this.config;
  }

  getRateLimitStatus(): { remaining: number; rate: number } {
    return {
      remaining: this.rateLimiter.getRemainingRequests(),
      rate: this.rateLimiter.getCurrentRate(),
    };
  }
}

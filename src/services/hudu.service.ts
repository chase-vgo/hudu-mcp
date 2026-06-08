import { HuduClient } from '../vendor/hudu/index.js';
import { McpServerConfig } from '../types/mcp.js';
import { Logger } from '../utils/logger.js';

export class HuduService {
  private client: HuduClient | null = null;
  private retryingClient: HuduClient | null = null;
  private logger: Logger;
  private config: McpServerConfig;
  private initializationPromise: Promise<void> | null = null;
  private disallowedCompanyIds: Set<number>;

  // Pre-connection failures: the request was never sent to Hudu, so retrying is
  // safe even for non-idempotent writes (create/delete/archive). EAI_AGAIN is the
  // transient DNS hiccup seen inside containers; the others are flaky-resolver/host kin.
  private static readonly RETRYABLE_CODES = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED']);

  constructor(config: McpServerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.disallowedCompanyIds = new Set(config.hudu.disallowedCompanyIds ?? []);
  }

  // --- Company access control (HUDU_DISALLOWED_COMPANY_IDS) ---

  private isDisallowed(id?: number | string | null): boolean {
    return id != null && this.disallowedCompanyIds.has(Number(id));
  }

  /** Throw if the given company id is on the disallow list. */
  private assertCompanyAllowed(id?: number | string | null): void {
    if (this.isDisallowed(id)) {
      throw new Error(`Company ${id} is not accessible (excluded via HUDU_DISALLOWED_COMPANY_IDS)`);
    }
  }

  /** Drop records belonging to a disallowed company, keyed by `id` (companies) or `company_id` (children). */
  private filterByCompany<T>(records: T[], key: 'id' | 'company_id'): T[] {
    if (this.disallowedCompanyIds.size === 0 || !Array.isArray(records)) return records;
    return records.filter(r => !this.isDisallowed((r as any)?.[key]));
  }

  private async ensureClient(): Promise<HuduClient> {
    if (!this.client) {
      await this.ensureInitialized();
    }
    return this.retryingClient ?? this.client!;
  }

  /** Is this a transient, pre-connection error worth retrying? (DNS / connection-refused.) */
  private isRetryable(error: unknown): boolean {
    const cause: any = (error as any)?.cause ?? error;
    if (typeof cause?.code === 'string' && HuduService.RETRYABLE_CODES.has(cause.code)) return true;
    // Fall back to message matching in case the code isn't propagated.
    return /\b(EAI_AGAIN|ENOTFOUND|ECONNREFUSED)\b/.test(String(cause?.message ?? ''));
  }

  /** Run an API call, retrying transient pre-connection failures with short backoff. */
  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === attempts || !this.isRetryable(error)) throw error;
        const delayMs = 250 * attempt;
        this.logger.warn(`Transient network error from Hudu API (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  /**
   * Wrap the SDK client so every resource method (client.companies.list, etc.)
   * is run through withRetry — one place, no per-method changes. Non-function
   * properties pass through untouched.
   */
  private createRetryingProxy(client: HuduClient): HuduClient {
    const runWithRetry = (fn: (...a: any[]) => any, ctx: any) =>
      (...args: any[]) => this.withRetry(() => fn.apply(ctx, args));

    const wrapResource = <T extends object>(resource: T): T => new Proxy(resource, {
      get: (target, prop, receiver) => {
        const value: any = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? runWithRetry(value, target) : value;
      },
    });

    return new Proxy(client, {
      get: (target, prop, receiver) => {
        const value: any = Reflect.get(target, prop, receiver);
        if (value && typeof value === 'object') return wrapResource(value);
        return typeof value === 'function' ? runWithRetry(value, target) : value;
      },
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }
    if (this.client) return;

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    const { baseUrl, apiKey } = this.config.hudu;
    if (!baseUrl || !apiKey) {
      throw new Error('Missing required Hudu credentials: HUDU_BASE_URL and HUDU_API_KEY are required');
    }

    this.logger.info('Initializing Hudu client...');
    this.client = new HuduClient({ baseUrl, apiKey });
    this.retryingClient = this.createRetryingProxy(this.client);
    this.logger.info('Hudu client initialized successfully');
  }

  // Companies
  async listCompanies(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.companies.list(params), 'id');
  }

  async getCompany(id: number): Promise<any> {
    this.assertCompanyAllowed(id);
    const client = await this.ensureClient();
    return client.companies.get(id);
  }

  async createCompany(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.id);
    const client = await this.ensureClient();
    return client.companies.create(data);
  }

  async updateCompany(id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(id);
    const client = await this.ensureClient();
    return client.companies.update(id, data);
  }

  async deleteCompany(id: number): Promise<void> {
    this.assertCompanyAllowed(id);
    const client = await this.ensureClient();
    await client.companies.delete(id);
  }

  async archiveCompany(id: number): Promise<void> {
    this.assertCompanyAllowed(id);
    const client = await this.ensureClient();
    await client.companies.archive(id);
  }

  async unarchiveCompany(id: number): Promise<void> {
    this.assertCompanyAllowed(id);
    const client = await this.ensureClient();
    await client.companies.unarchive(id);
  }

  // Assets
  async listAssets(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.assets.list(params), 'company_id');
  }

  async getAsset(id: number): Promise<any> {
    const client = await this.ensureClient();
    const asset = await client.assets.get(id);
    this.assertCompanyAllowed(asset?.company_id);
    return asset;
  }

  async createAsset(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.assets.create(data);
  }

  async updateAsset(companyId: number, id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(companyId);
    const client = await this.ensureClient();
    return client.assets.update(companyId, id, data);
  }

  async deleteAsset(companyId: number, id: number): Promise<void> {
    this.assertCompanyAllowed(companyId);
    const client = await this.ensureClient();
    await client.assets.delete(companyId, id);
  }

  async archiveAsset(companyId: number, id: number): Promise<void> {
    this.assertCompanyAllowed(companyId);
    const client = await this.ensureClient();
    await client.assets.archive(companyId, id);
  }

  // Asset Layouts
  async listAssetLayouts(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return client.assetLayouts.list(params);
  }

  async getAssetLayout(id: number): Promise<any> {
    const client = await this.ensureClient();
    return client.assetLayouts.get(id);
  }

  async createAssetLayout(data: any): Promise<any> {
    const client = await this.ensureClient();
    return client.assetLayouts.create(data);
  }

  async updateAssetLayout(id: number, data: any): Promise<any> {
    const client = await this.ensureClient();
    return client.assetLayouts.update(id, data);
  }

  // Asset Passwords
  async listAssetPasswords(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.assetPasswords.list(params), 'company_id');
  }

  async getAssetPassword(id: number): Promise<any> {
    const client = await this.ensureClient();
    const password = await client.assetPasswords.get(id);
    this.assertCompanyAllowed(password?.company_id);
    return password;
  }

  async createAssetPassword(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.assetPasswords.create(data);
  }

  async updateAssetPassword(id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.assetPasswords.update(id, data);
  }

  async deleteAssetPassword(id: number): Promise<void> {
    const client = await this.ensureClient();
    await client.assetPasswords.delete(id);
  }

  // Articles
  async listArticles(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.articles.list(params), 'company_id');
  }

  async getArticle(id: number): Promise<any> {
    const client = await this.ensureClient();
    const article = await client.articles.get(id);
    this.assertCompanyAllowed(article?.company_id);
    return article;
  }

  async createArticle(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.articles.create(data);
  }

  async updateArticle(id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.articles.update(id, data);
  }

  async deleteArticle(id: number): Promise<void> {
    const client = await this.ensureClient();
    await client.articles.delete(id);
  }

  async archiveArticle(id: number): Promise<void> {
    const client = await this.ensureClient();
    await client.articles.archive(id);
  }

  // Websites
  async listWebsites(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.websites.list(params), 'company_id');
  }

  async getWebsite(id: number): Promise<any> {
    const client = await this.ensureClient();
    const website = await client.websites.get(id);
    this.assertCompanyAllowed(website?.company_id);
    return website;
  }

  async createWebsite(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.websites.create(data);
  }

  async updateWebsite(id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return client.websites.update(id, data);
  }

  async deleteWebsite(id: number): Promise<void> {
    const client = await this.ensureClient();
    await client.websites.delete(id);
  }

  // Folders
  async listFolders(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.folders.list(params), 'company_id');
  }

  // Procedures
  async listProcedures(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.procedures.list(params), 'company_id');
  }

  // Activity Logs
  async listActivityLogs(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.activityLogs.list(params), 'company_id');
  }

  // Relations
  async listRelations(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.relations.list(params), 'company_id');
  }

  // Magic Dash
  async listMagicDash(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    return this.filterByCompany(await client.magicDash.list(params), 'company_id');
  }

  /**
   * Reinitialize the Hudu client with new credentials.
   * Used in gateway mode where credentials come from request headers.
   */
  updateCredentials(baseUrl: string, apiKey: string): void {
    this.client = new HuduClient({ baseUrl, apiKey });
    this.retryingClient = this.createRetryingProxy(this.client);
    this.initializationPromise = null;
    this.logger.debug('Hudu client reinitialized with new credentials');
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      await client.companies.list({ page: 1, page_size: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

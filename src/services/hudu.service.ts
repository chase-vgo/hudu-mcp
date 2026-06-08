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

  // --- Client-side keyword search (Hudu's `name` filter is exact-match only) ---

  /** Lowercased blob of the given values for case-insensitive substring matching. */
  private buildHaystack(parts: Array<unknown>): string {
    const out: string[] = [];
    for (const v of parts) {
      if (v == null) continue;
      out.push(typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    return out.join('\n').toLowerCase();
  }

  /** Text blob for an asset: name + identity fields + every custom field label/value. */
  private assetHaystack(asset: any): string {
    const parts: unknown[] = [
      asset?.name, asset?.primary_serial, asset?.primary_model,
      asset?.primary_manufacturer, asset?.primary_mail,
    ];
    if (Array.isArray(asset?.fields)) {
      for (const f of asset.fields) parts.push(f?.label, f?.value);
    }
    return this.buildHaystack(parts);
  }

  // Asset custom fields can be password/OTP-type — never return their values.
  private static readonly SECRET_FIELD_TYPE = /password|otp|secret|confidential/i;

  /** Replace the value of any secret-type custom field on an asset with a placeholder. */
  private redactAssetSecrets<T extends Record<string, any>>(asset: T): T {
    if (!asset || typeof asset !== 'object' || !Array.isArray((asset as any).fields)) return asset;
    const fields = (asset as any).fields.map((f: any) => {
      if (
        f && typeof f === 'object' &&
        typeof f.field_type === 'string' &&
        HuduService.SECRET_FIELD_TYPE.test(f.field_type) &&
        f.value != null && f.value !== ''
      ) {
        return { ...f, value: '[redacted]' };
      }
      return f;
    });
    return { ...asset, fields };
  }

  /**
   * Map folder id -> full path name (e.g. "Cloudflare setup / SSO") for the given
   * company, walking parent_folder_id so a search can match a parent folder's name.
   */
  private async buildFolderPathMap(companyId?: number): Promise<Map<number, string>> {
    const client = await this.ensureClient();
    const folders = await client.folders.listAll(companyId != null ? { company_id: companyId } : undefined);
    const byId = new Map<number, any>();
    for (const f of folders) byId.set(Number(f.id), f);

    const pathOf = (id: number | null | undefined, seen: Set<number>): string => {
      if (id == null) return '';
      const f = byId.get(Number(id));
      if (!f || seen.has(Number(f.id))) return '';
      seen.add(Number(f.id));
      const name = String(f.name ?? '');
      const parent = pathOf(f.parent_folder_id, seen);
      return parent ? `${parent} / ${name}` : name;
    };

    const paths = new Map<number, string>();
    for (const f of folders) paths.set(Number(f.id), pathOf(Number(f.id), new Set<number>()));
    return paths;
  }

  /** Text blob for an article: name + body content + its folder's full path name. */
  private articleHaystack(article: any, folderPaths: Map<number, string>): string {
    const parts: unknown[] = [article?.name, article?.content];
    if (article?.folder_id != null) parts.push(folderPaths.get(Number(article.folder_id)));
    return this.buildHaystack(parts);
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
    const { name, ...serverParams } = params ?? {};

    // Hudu's `name` filter is an exact match, which surprises callers searching
    // for a keyword (e.g. "VPN" won't match "OpenVPN"). When `name` is given,
    // fetch the server-filtered set (across pages) and substring-match it
    // case-insensitively across the asset's name, identity fields, and custom
    // field labels/values.
    if (name != null && String(name).trim() !== '') {
      const needle = String(name).toLowerCase();
      // Redact first so secret field values are neither searchable nor returned.
      const all = (await client.assets.listAll(serverParams)).map((a: any) => this.redactAssetSecrets(a));
      const matched = all.filter((a: any) => this.assetHaystack(a).includes(needle));
      return this.filterByCompany(matched, 'company_id');
    }

    const assets = (await client.assets.list(serverParams)).map((a: any) => this.redactAssetSecrets(a));
    return this.filterByCompany(assets, 'company_id');
  }

  async getAsset(id: number): Promise<any> {
    const client = await this.ensureClient();
    const asset = await client.assets.get(id);
    this.assertCompanyAllowed(asset?.company_id);
    return this.redactAssetSecrets(asset);
  }

  async createAsset(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return this.redactAssetSecrets(await client.assets.create(data));
  }

  /**
   * Hudu addresses single assets under their company. Callers that already know
   * the company id pass it; otherwise resolve it from the asset itself (the
   * top-level get works without a company) so the MCP tool only needs an asset id.
   * Also enforces the disallow list on the resolved company.
   */
  private async resolveAssetCompanyId(companyId: number | undefined | null, id: number): Promise<number> {
    if (companyId != null) {
      this.assertCompanyAllowed(companyId);
      return Number(companyId);
    }
    const asset = await this.getAsset(id); // works via /api/v1/assets?id=; also runs the disallow check
    if (asset?.company_id == null) {
      throw new Error(`Could not resolve company_id for asset ${id}`);
    }
    return Number(asset.company_id);
  }

  async updateAsset(companyId: number | undefined, id: number, data: any): Promise<any> {
    const cid = await this.resolveAssetCompanyId(companyId, id);
    const client = await this.ensureClient();
    return this.redactAssetSecrets(await client.assets.update(cid, id, data));
  }

  async archiveAsset(companyId: number | undefined, id: number): Promise<void> {
    const cid = await this.resolveAssetCompanyId(companyId, id);
    const client = await this.ensureClient();
    await client.assets.archive(cid, id);
  }
  // (asset deletion intentionally not exposed)

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
  // Reads never expose secret material: `password` and `otp_secret` are stripped
  // before any record leaves the service. Name, username, url, type, and notes
  // (description) are preserved.
  private redactAssetPassword<T extends Record<string, any>>(record: T): T {
    if (!record || typeof record !== 'object') return record;
    const { password: _password, otp_secret: _otpSecret, ...safe } = record as any;
    return safe as T;
  }

  async listAssetPasswords(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    const records = this.filterByCompany(await client.assetPasswords.list(params), 'company_id');
    return records.map((r: any) => this.redactAssetPassword(r));
  }

  async getAssetPassword(id: number): Promise<any> {
    const client = await this.ensureClient();
    const password = await client.assetPasswords.get(id);
    this.assertCompanyAllowed(password?.company_id);
    return this.redactAssetPassword(password);
  }

  async createAssetPassword(data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return this.redactAssetPassword(await client.assetPasswords.create(data));
  }

  async updateAssetPassword(id: number, data: any): Promise<any> {
    this.assertCompanyAllowed(data?.company_id);
    const client = await this.ensureClient();
    return this.redactAssetPassword(await client.assetPasswords.update(id, data));
  }

  // Articles
  async listArticles(params?: any): Promise<any[]> {
    const client = await this.ensureClient();
    const { name, ...serverParams } = params ?? {};

    // `name` is a case-insensitive keyword search across the article's name, body
    // content, and its folder's full path name (so e.g. "Cloudflare" finds an
    // article in the "Cloudflare setup" folder). Hudu's own `name` filter is exact,
    // so we fetch the server-filtered set across pages and match client-side.
    if (name != null && String(name).trim() !== '') {
      const needle = String(name).toLowerCase();
      const [articles, folderPaths] = await Promise.all([
        client.articles.listAll(serverParams),
        // Folder names are an enhancement — if the lookup fails, still match name/content.
        this.buildFolderPathMap(serverParams.company_id).catch((error) => {
          this.logger.warn('Folder lookup for article search failed; matching name/content only', error);
          return new Map<number, string>();
        }),
      ]);
      const matched = articles.filter((a: any) => this.articleHaystack(a, folderPaths).includes(needle));
      return this.filterByCompany(matched, 'company_id');
    }

    return this.filterByCompany(await client.articles.list(serverParams), 'company_id');
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

  async archiveArticle(id: number): Promise<void> {
    const client = await this.ensureClient();
    await client.articles.archive(id);
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

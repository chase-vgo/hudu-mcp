# hudu-mcp

[![CI](https://github.com/wyre-technology/hudu-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/wyre-technology/hudu-mcp/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

MCP (Model Context Protocol) server for [Hudu](https://www.huduapp.com/) IT documentation platform. Provides 29 tools and 6 resources for managing companies, assets, articles, passwords, and more through any MCP-compatible client.

## Features

- **29 MCP tools** covering the major Hudu resources (no delete tools — see below)
- **6 MCP resources** (3 list resources + 3 by-ID resource templates) for direct data access
- **Dual transport** support: stdio (default) and HTTP Streamable
- **Vendored Hudu API client** (`src/vendor/hudu`) — no private registry / token to build
- **Read-safe secrets** — password tools and password/OTP-type asset fields never return secret values
- **No destructive deletes** — delete tools are intentionally not exposed
- **Company access control** via `HUDU_DISALLOWED_COMPANY_IDS`
- **Transient-DNS retry** on Hudu API calls (handles container `EAI_AGAIN` blips)
- **Lazy initialization** - SDK client created on first tool call
- **Connection testing** built-in
- **All logging to stderr** to avoid polluting MCP stdio transport

## One-Click Deployment

> [!NOTE]
> The Hudu API client is vendored in-repo (`src/vendor/hudu`), so builds need **no
> registry token** — every dependency is public on npmjs. Just deploy; the cloud
> builder runs `npm install` with no extra credentials.

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/wyre-technology/hudu-mcp/tree/main)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wyre-technology/hudu-mcp)

> [!NOTE]
> The DigitalOcean target builds the full Docker image and runs the complete MCP
> server over HTTP — this is the recommended path for operators. This repo does not
> ship a `wrangler.json`/Workers entrypoint, so for a self-hosted server prefer
> DigitalOcean or the prebuilt container image (`ghcr.io/wyre-technology/hudu-mcp`).

## Installation

All dependencies are public on npmjs (the Hudu API client is vendored under
`src/vendor/hudu`), so no registry auth or token is required:

```bash
git clone https://github.com/wyre-technology/hudu-mcp.git
cd hudu-mcp

npm install
npm run build
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `HUDU_BASE_URL` | Yes | - | Your Hudu instance URL (e.g., `https://docs.example.com`) |
| `HUDU_API_KEY` | Yes | - | Your Hudu API key |
| `HUDU_DISALLOWED_COMPANY_IDS` | No | - | Comma-separated company IDs to hide from all tools and resources (companies + their assets, articles, passwords). See [Restricting companies](#restricting-companies). |
| `MCP_TRANSPORT` | No | `stdio` | Transport type: `stdio` or `http` |
| `MCP_HTTP_PORT` | No | `8080` | HTTP server port (when using `http` transport) |
| `MCP_HTTP_HOST` | No | `0.0.0.0` | HTTP server host |
| `MCP_SERVER_NAME` | No | `hudu-mcp` | Server name reported to MCP clients |
| `MCP_SERVER_VERSION` | No | `1.0.0` | Server version reported to MCP clients |
| `LOG_LEVEL` | No | `info` | Log level: `error`, `warn`, `info`, `debug` |
| `LOG_FORMAT` | No | `simple` | Log format: `json` or `simple` |

### Restricting companies

Set `HUDU_DISALLOWED_COMPANY_IDS` to a comma-separated list of company IDs to make the
server behave as if those companies — and everything filed under them — do not exist:

```bash
HUDU_DISALLOWED_COMPANY_IDS=123,456
```

The filter is enforced for both tools and resources:

- `hudu_list_companies` (and the `hudu://companies` resource) omit the listed IDs.
- `hudu_get_company` and the mutating company tools reject a disallowed ID with an error.
- List endpoints for assets, articles, passwords, folders, procedures, relations, and
  Magic Dash drop rows whose `company_id` is disallowed — this is the primary guard, since
  it's what hides those records (and their IDs) from a client.
- Getting a child record whose `company_id` is disallowed, or creating/updating one with a
  disallowed `company_id` in the payload, is rejected. Records with no company (global
  articles, asset layouts) are unaffected.

> Note: `hudu_archive_article` by raw ID is **not** pre-checked against the disallow list
> (an article isn't fetched first to resolve its company). Asset archive *is* checked, since
> it resolves the owning company first. In practice a client can't reach a disallowed
> company's record IDs anyway — list and get already hide them.

## Run with Docker Compose

The repo ships a `docker-compose.yml` that builds the image and runs the server as an
HTTP service on port 3100 — no local Node/npm and no registry token required (the Hudu
SDK is vendored in-repo, and Docker runs the install during the build).

```bash
cp .env.example .env        # then edit: HUDU_BASE_URL, HUDU_API_KEY, HUDU_DISALLOWED_COMPANY_IDS

docker compose build
docker compose up -d

curl http://localhost:3100/health   # verify it's running
```

Docker Compose auto-loads `.env` for variable substitution. Point your reverse proxy /
MCP client at the `/mcp` endpoint on port 3100.

## Usage

### Claude Desktop (stdio)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hudu": {
      "command": "node",
      "args": ["/path/to/hudu-mcp/dist/entry.js"],
      "env": {
        "HUDU_BASE_URL": "https://docs.example.com",
        "HUDU_API_KEY": "your-api-key"
      }
    }
  }
}
```

### HTTP Transport

```bash
HUDU_BASE_URL=https://docs.example.com \
HUDU_API_KEY=your-api-key \
MCP_TRANSPORT=http \
MCP_HTTP_PORT=8080 \
npm start
```

The HTTP server exposes two endpoints: **`POST /mcp`** (the MCP Streamable HTTP endpoint —
stateless JSON, no session affinity) and **`GET /health`** (liveness). Front it with a reverse
proxy for TLS/auth and point your MCP client at `/mcp`.

## Tools (29)

> **No delete tools.** Deleting companies, assets, passwords, and articles is intentionally
> not exposed by this server. The most destructive available action is archive (reversible).

### Companies (7 tools)

| Tool | Description |
|---|---|
| `hudu_list_companies` | List companies with optional filters |
| `hudu_get_company` | Get a company by ID |
| `hudu_create_company` | Create a new company |
| `hudu_update_company` | Update an existing company |
| `hudu_archive_company` | Archive a company |
| `hudu_unarchive_company` | Unarchive a company |
| `hudu_test_connection` | Test the connection to Hudu API |

### Assets (5 tools)

| Tool | Description |
|---|---|
| `hudu_list_assets` | List/search assets — `name` keyword-matches name, identity fields & custom fields |
| `hudu_get_asset` | Get an asset by ID |
| `hudu_create_asset` | Create a new asset (requires `company_id`) |
| `hudu_update_asset` | Update an existing asset (`company_id` optional — auto-resolved) |
| `hudu_archive_asset` | Archive an asset (`company_id` optional — auto-resolved) |

> Hudu addresses a single asset under its owning company
> (`/api/v1/companies/{company_id}/assets/{id}`). For `update`/`archive` you may pass
> `company_id` explicitly, but if you omit it the server resolves it from the asset
> automatically — so `{ "id": 333 }` is enough.
>
> **Keyword search.** Hudu's own `name` filter is exact-match, so `hudu_list_assets` and
> `hudu_list_articles` implement `name` as a **case-insensitive keyword search** instead: when
> `name` is set the server fetches the (server-filtered) set across all pages and matches locally.
> Assets match on name, identity fields (serial/model/manufacturer) and custom field
> labels/values; articles match on name, body content, and the article's full folder path
> (e.g. "Cloudflare" finds an article in the "Cloudflare setup" folder). Scope with `company_id`
> to keep these searches fast.

### Asset Layouts (4 tools)

| Tool | Description |
|---|---|
| `hudu_list_asset_layouts` | List asset layouts |
| `hudu_get_asset_layout` | Get an asset layout by ID |
| `hudu_create_asset_layout` | Create a new asset layout |
| `hudu_update_asset_layout` | Update an existing asset layout |

### Asset Passwords (4 tools)

| Tool | Description |
|---|---|
| `hudu_list_asset_passwords` | List asset passwords (secret/OTP values omitted) |
| `hudu_get_asset_password` | Get an asset password by ID (secret/OTP values omitted) |
| `hudu_create_asset_password` | Create a new asset password |
| `hudu_update_asset_password` | Update an existing asset password |

> **Secrets are never returned.** The read/create/update password tools strip the
> `password` and `otp_secret` fields before responding — callers see name, username,
> url, type, and notes, but never the secret value or OTP seed. (Create/update still
> *accept* a password to store; they just don't echo it back.) Likewise, password/OTP-type
> **custom fields on assets** have their values replaced with `[redacted]` in every asset
> response (`hudu_get_asset`, `hudu_list_assets`, create/update), and such values are not
> searchable.

### Articles (5 tools)

| Tool | Description |
|---|---|
| `hudu_list_articles` | List/search articles — `name` keyword-matches name, body & folder path |
| `hudu_get_article` | Get an article by ID |
| `hudu_create_article` | Create a new article |
| `hudu_update_article` | Update an existing article |
| `hudu_archive_article` | Archive an article |

### Other Resources (4 tools)

| Tool | Description |
|---|---|
| `hudu_list_folders` | List folders |
| `hudu_list_procedures` | List procedures |
| `hudu_list_relations` | List relations |
| `hudu_list_magic_dash` | List Magic Dash items |

## Resources

List resources (returned by `resources/list`):

| URI | Description |
|---|---|
| `hudu://companies` | List of all companies |
| `hudu://assets` | List of all assets |
| `hudu://articles` | List of all articles |

By-ID resource templates (returned by `resources/templates/list`):

| URI Template | Description |
|---|---|
| `hudu://companies/{id}` | Company details by ID |
| `hudu://assets/{id}` | Asset details by ID |
| `hudu://articles/{id}` | Article details by ID |

## Implementation notes

### Vendored Hudu API client

The Hudu API client lives in-repo at `src/vendor/hudu` (forked from `@wyre-technology/node-hudu`)
rather than being pulled from a private registry. This removes the GitHub Packages dependency and
the build-time token entirely, and lets us correct Hudu's routing where the upstream client was
wrong. Notably, **single-asset operations are nested under the company**
(`/api/v1/companies/{company_id}/assets/{id}[/archive]`); only the asset *list* endpoint is
top-level (and supports an `id` filter, which is how `get_asset` resolves a single asset without a
company). No-body mutations (archive/unarchive/delete) are sent **without** a `Content-Type: application/json`
header, since Hudu's backend 500s trying to parse an empty JSON body. Asset `custom_fields` are
normalized to Hudu's required array-of-objects shape (a single `{ }` object is wrapped into `[ { } ]`).

### Transient-DNS retry

Hudu API calls are wrapped with a short retry that fires only on pre-connection failures
(`EAI_AGAIN` / `ENOTFOUND` / `ECONNREFUSED`) — common as intermittent DNS blips inside containers.
These are safe to retry even for writes because the request never reached Hudu. Other errors
(4xx/5xx, timeouts mid-flight) are not retried.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Clean build output
npm run clean
```

## License

[Apache-2.0](LICENSE)

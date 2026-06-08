export interface McpTool {
  name: string;
  description: string;
  annotations?: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS: McpTool[] = [
  // Test connection
  {
    name: 'hudu_test_connection',
    description: 'Test the connection to Hudu API',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },

  // Companies
  {
    name: 'hudu_list_companies',
    description: 'List companies in Hudu with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' },
        name: { type: 'string', description: 'Filter by company name' },
        id_number: { type: 'string', description: 'Filter by ID number' },
        website: { type: 'string', description: 'Filter by website' },
        phone_number: { type: 'string', description: 'Filter by phone number' },
        city: { type: 'string', description: 'Filter by city' },
        state: { type: 'string', description: 'Filter by state' },
        archived: { type: 'boolean', description: 'Filter by archived status' }
      },
      required: []
    }
  },
  {
    name: 'hudu_get_company',
    description: 'Get a company by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Company ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_create_company',
    description: 'Create a new company in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company name (required)' },
        nickname: { type: 'string', description: 'Company nickname' },
        company_type: { type: 'string', description: 'Company type' },
        address_line_1: { type: 'string', description: 'Address line 1' },
        address_line_2: { type: 'string', description: 'Address line 2' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State' },
        zip: { type: 'string', description: 'ZIP code' },
        country_name: { type: 'string', description: 'Country name' },
        phone_number: { type: 'string', description: 'Phone number' },
        fax_number: { type: 'string', description: 'Fax number' },
        website: { type: 'string', description: 'Website URL' },
        id_number: { type: 'string', description: 'ID number' },
        notes: { type: 'string', description: 'Notes' },
        parent_company_id: { type: 'number', description: 'Parent company ID' }
      },
      required: ['name']
    }
  },
  {
    name: 'hudu_update_company',
    description: 'Update an existing company in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Company ID' },
        name: { type: 'string', description: 'Company name' },
        nickname: { type: 'string', description: 'Company nickname' },
        company_type: { type: 'string', description: 'Company type' },
        address_line_1: { type: 'string', description: 'Address line 1' },
        address_line_2: { type: 'string', description: 'Address line 2' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State' },
        zip: { type: 'string', description: 'ZIP code' },
        country_name: { type: 'string', description: 'Country' },
        phone_number: { type: 'string', description: 'Phone number' },
        fax_number: { type: 'string', description: 'Fax number' },
        website: { type: 'string', description: 'Website URL' },
        id_number: { type: 'string', description: 'ID number' },
        notes: { type: 'string', description: 'Notes' },
        parent_company_id: { type: 'number', description: 'Parent company ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'hudu_archive_company',
    description:
      '⚠ HIGH-IMPACT. Archives a company, removing it from active use and hiding ' +
      'associated assets, passwords, and articles from normal operations. Reversible by unarchiving. ' +
      'Confirm with the user before invoking.',
    annotations: {
      title: 'Archive company (reversible)',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Company ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_unarchive_company',
    description:
      '⚠ HIGH-IMPACT. Restores an archived company back to active use, making ' +
      'it and all associated assets, passwords, and articles visible again in normal operations. ' +
      'Confirm with the user before invoking.',
    annotations: {
      title: 'Unarchive company (reversible)',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Company ID' } },
      required: ['id']
    }
  },

  // Assets
  {
    name: 'hudu_list_assets',
    description:
      'List/search assets in Hudu. `name` is a case-insensitive keyword search across the ' +
      'asset name, identity fields (serial/model/manufacturer), and all custom field ' +
      'labels/values (e.g. "VPN" matches "OpenVPN" or an asset whose notes mention VPN). ' +
      'Pass `company_id` to scope the search to one company.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (ignored when `name` is set — keyword search spans all pages)' },
        page_size: { type: 'number', description: 'Results per page' },
        company_id: { type: 'number', description: 'Filter by company ID (recommended when searching by name)' },
        asset_layout_id: { type: 'number', description: 'Filter by asset layout ID' },
        name: { type: 'string', description: 'Case-insensitive keyword search over name, identity fields, and custom fields' },
        primary_serial: { type: 'string', description: 'Filter by serial number' },
        archived: { type: 'boolean', description: 'Filter by archived status' }
      },
      required: []
    }
  },
  {
    name: 'hudu_get_asset',
    description: 'Get an asset by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Asset ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_create_asset',
    description: 'Create a new asset in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID (required)' },
        asset_layout_id: { type: 'number', description: 'Asset layout ID (required)' },
        name: { type: 'string', description: 'Asset name (required)' },
        primary_serial: { type: 'string', description: 'Serial number' },
        primary_model: { type: 'string', description: 'Model' },
        primary_manufacturer: { type: 'string', description: 'Manufacturer' },
        primary_mail: { type: 'string', description: 'Email' },
        custom_fields: {
          type: 'array',
          description:
            'Custom field values as an array of objects keyed by the field LABEL ' +
            '(lowercased, spaces → underscores), e.g. [{ "approval_notes": "..." }]. ' +
            'A single { } object is also accepted and wrapped automatically.',
          items: { type: 'object' }
        }
      },
      required: ['company_id', 'asset_layout_id', 'name']
    }
  },
  {
    name: 'hudu_update_asset',
    description: 'Update an existing asset in Hudu. company_id is optional — if omitted it is resolved from the asset automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Asset ID' },
        company_id: { type: 'number', description: 'Owning company ID (optional; auto-resolved from the asset if omitted)' },
        name: { type: 'string', description: 'Asset name' },
        asset_layout_id: { type: 'number', description: 'Asset layout ID' },
        primary_serial: { type: 'string', description: 'Serial number' },
        primary_model: { type: 'string', description: 'Model' },
        primary_manufacturer: { type: 'string', description: 'Manufacturer' },
        primary_mail: { type: 'string', description: 'Email' },
        custom_fields: {
          type: 'array',
          description:
            'Custom field values as an array of objects keyed by the field LABEL ' +
            '(lowercased, spaces → underscores), e.g. [{ "approval_notes": "..." }]. ' +
            'A single { } object is also accepted and wrapped automatically.',
          items: { type: 'object' }
        }
      },
      required: ['id']
    }
  },
  {
    name: 'hudu_archive_asset',
    description:
      '⚠ HIGH-IMPACT. Archives an asset, removing it from active use and hiding ' +
      'it from normal asset listings and operations. Reversible by unarchiving. ' +
      'Confirm with the user before invoking.',
    annotations: {
      title: 'Archive asset (reversible)',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Asset ID' },
        company_id: { type: 'number', description: 'Owning company ID (optional; auto-resolved from the asset if omitted)' }
      },
      required: ['id']
    }
  },

  // Asset Layouts
  {
    name: 'hudu_list_asset_layouts',
    description: 'List asset layouts in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' },
        name: { type: 'string', description: 'Filter by name' }
      },
      required: []
    }
  },
  {
    name: 'hudu_get_asset_layout',
    description: 'Get an asset layout by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Asset layout ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_create_asset_layout',
    description: 'Create a new asset layout in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layout name (required)' },
        icon: { type: 'string', description: 'Icon' },
        color: { type: 'string', description: 'Color' },
        icon_color: { type: 'string', description: 'Icon color' },
        include_passwords: { type: 'boolean', description: 'Include passwords' },
        include_photos: { type: 'boolean', description: 'Include photos' },
        include_comments: { type: 'boolean', description: 'Include comments' },
        include_files: { type: 'boolean', description: 'Include files' },
        active: { type: 'boolean', description: 'Active status' },
        fields: { type: 'array', description: 'Layout fields', items: { type: 'object' } }
      },
      required: ['name']
    }
  },
  {
    name: 'hudu_update_asset_layout',
    description: 'Update an existing asset layout in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Asset layout ID' },
        name: { type: 'string', description: 'Layout name' },
        icon: { type: 'string', description: 'Icon' },
        color: { type: 'string', description: 'Color' },
        icon_color: { type: 'string', description: 'Icon color' },
        include_passwords: { type: 'boolean', description: 'Include passwords' },
        include_photos: { type: 'boolean', description: 'Include photos' },
        include_comments: { type: 'boolean', description: 'Include comments' },
        include_files: { type: 'boolean', description: 'Include files' },
        active: { type: 'boolean', description: 'Active status' },
        fields: { type: 'array', description: 'Layout fields', items: { type: 'object' } }
      },
      required: ['id']
    }
  },

  // Asset Passwords
  {
    name: 'hudu_list_asset_passwords',
    description: 'List asset passwords in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' },
        company_id: { type: 'number', description: 'Filter by company ID' },
        name: { type: 'string', description: 'Filter by name' },
        search: { type: 'string', description: 'Search term' }
      },
      required: []
    }
  },
  {
    name: 'hudu_get_asset_password',
    description: 'Get an asset password by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Asset password ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_create_asset_password',
    description: 'Create a new asset password in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID (required)' },
        name: { type: 'string', description: 'Password name (required)' },
        username: { type: 'string', description: 'Username' },
        password: { type: 'string', description: 'Password value' },
        otp_secret: { type: 'string', description: 'OTP secret' },
        url: { type: 'string', description: 'URL' },
        password_type: { type: 'string', description: 'Password type' },
        description: { type: 'string', description: 'Description' },
        passwordable_type: { type: 'string', description: 'Passwordable type' },
        passwordable_id: { type: 'number', description: 'Passwordable ID' },
        in_portal: { type: 'boolean', description: 'Show in portal' },
        password_folder_id: { type: 'number', description: 'Password folder ID' }
      },
      required: ['company_id', 'name']
    }
  },
  {
    name: 'hudu_update_asset_password',
    description: 'Update an existing asset password in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Asset password ID' },
        name: { type: 'string', description: 'Password name' },
        username: { type: 'string', description: 'Username' },
        password: { type: 'string', description: 'Password value' },
        otp_secret: { type: 'string', description: 'OTP secret' },
        url: { type: 'string', description: 'URL' },
        password_type: { type: 'string', description: 'Password type' },
        description: { type: 'string', description: 'Description' }
      },
      required: ['id']
    }
  },

  // Articles
  {
    name: 'hudu_list_articles',
    description:
      'List/search knowledge base articles in Hudu. `name` is a case-insensitive keyword ' +
      'search across the article name, body content, and its folder path (e.g. "Cloudflare" ' +
      'finds an article inside the "Cloudflare setup" folder). Pass `company_id` to scope it.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (ignored when `name` is set — keyword search spans all pages)' },
        page_size: { type: 'number', description: 'Results per page' },
        company_id: { type: 'number', description: 'Filter by company ID (recommended when searching by name)' },
        name: { type: 'string', description: 'Case-insensitive keyword search over article name, body content, and folder path' },
        draft: { type: 'boolean', description: 'Filter by draft status' }
      },
      required: []
    }
  },
  {
    name: 'hudu_get_article',
    description: 'Get a knowledge base article by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Article ID' } },
      required: ['id']
    }
  },
  {
    name: 'hudu_create_article',
    description: 'Create a new knowledge base article in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Article name (required)' },
        content: { type: 'string', description: 'Article content (HTML)' },
        folder_id: { type: 'number', description: 'Folder ID' },
        company_id: { type: 'number', description: 'Company ID' },
        enable_sharing: { type: 'boolean', description: 'Enable sharing' },
        draft: { type: 'boolean', description: 'Draft status' }
      },
      required: ['name']
    }
  },
  {
    name: 'hudu_update_article',
    description: 'Update an existing knowledge base article in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID' },
        name: { type: 'string', description: 'Article name' },
        content: { type: 'string', description: 'Article content (HTML)' },
        folder_id: { type: 'number', description: 'Folder ID' },
        company_id: { type: 'number', description: 'Company ID' },
        enable_sharing: { type: 'boolean', description: 'Enable sharing' },
        draft: { type: 'boolean', description: 'Draft status' }
      },
      required: ['id']
    }
  },
  {
    name: 'hudu_archive_article',
    description:
      '⚠ HIGH-IMPACT. Archives a knowledge base article, removing it from active use ' +
      'and hiding it from normal article listings and search results. Reversible by unarchiving. ' +
      'Confirm with the user before invoking.',
    annotations: {
      title: 'Archive article (reversible)',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Article ID' } },
      required: ['id']
    }
  },

  // Folders
  {
    name: 'hudu_list_folders',
    description: 'List folders in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' },
        company_id: { type: 'number', description: 'Filter by company ID' },
        name: { type: 'string', description: 'Filter by name' }
      },
      required: []
    }
  },

  // Procedures
  {
    name: 'hudu_list_procedures',
    description: 'List Hudu processes and runs. A "process" is a template (run=false); a "run" is an active instance kicked off from a process (run=true). Pass type="run" to list process runs, type="process" for templates, or omit for both.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['process', 'run', 'all'], description: 'Filter by type: "process" (templates only), "run" (active instances/runs only), or "all" (both, default)' },
        process_scope: { type: 'string', enum: ['global', 'company'], description: 'Filter processes by scope: "global" (all companies) or "company" (company-specific). Only applies to processes.' },
        parent_process_id: { type: 'number', description: 'Return only runs created from this parent process ID' },
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page (max 1000)' },
        company_id: { type: 'number', description: 'Filter by company ID' },
        name: { type: 'string', description: 'Filter by name (case-insensitive exact match)' },
        slug: { type: 'string', description: 'Filter by URL slug' },
        created_at: { type: 'string', description: 'Filter by creation date: exact ("2024-01-15") or range ("2024-01-01,2024-01-31")' },
        updated_at: { type: 'string', description: 'Filter by update date: exact ("2024-01-15") or range ("2024-01-01,2024-01-31")' },
        archived: { type: 'string', enum: ['true', 'false', '1', '0'], description: 'Show only archived ("true"/"1") or only non-archived ("false"/"0", default)' }
      },
      required: []
    }
  },

  // Relations
  {
    name: 'hudu_list_relations',
    description: 'List relations in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' }
      },
      required: []
    }
  },

  // Magic Dash
  {
    name: 'hudu_list_magic_dash',
    description: 'List Magic Dash items in Hudu',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number' },
        page_size: { type: 'number', description: 'Results per page' },
        company_id: { type: 'number', description: 'Filter by company ID' },
        title: { type: 'string', description: 'Filter by title' }
      },
      required: []
    }
  }
];

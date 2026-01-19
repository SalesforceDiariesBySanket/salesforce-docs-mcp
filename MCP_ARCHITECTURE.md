# Salesforce Documentation MCP Server Architecture

## Overview
This document outlines the architecture for a **local-first** MCP server for Salesforce documentation, designed to match the same pattern as the official Salesforce DX MCP server (stdio transport, Node.js runtime, no external dependencies).

**Current Stats (January 2026):**
- **360 PDF Documents** (291 developer docs + 69 release notes)
- **357 Indexed Documents** across 8 categories
- **~2 GB** total documentation size

**Design Principles:**
- **Local-first**: All processing happens locally, no external API calls
- **stdio transport**: Standard input/output communication (same as Salesforce DX MCP)
- **Intent-based search**: Detects query topic and searches relevant docs first
- **SQLite + sql.js**: Pure JavaScript SQLite with LIKE-based search (cross-platform)
- **Zero external dependencies**: No Redis, no ChromaDB, no embedding APIs
- **TypeScript/Node.js**: Same runtime as Salesforce DX MCP

---

## 📁 Document Hierarchy (Nested Categorization)

```
salesforce-docs/
├── 1_core_platform/
│   ├── apex/
│   │   ├── apex_reference_guide.pdf          # Language reference
│   │   ├── apex_developer_guide.pdf          # Developer guide
│   │   ├── apex_api.pdf                      # Apex API
│   │   └── apex_ajax.pdf                     # AJAX toolkit
│   ├── visualforce/
│   │   ├── pages_developers_guide.pdf
│   │   └── visualforce_cheatsheet.pdf
│   ├── lightning/
│   │   ├── lwc.pdf                           # Lightning Web Components
│   │   ├── lightning.pdf                     # Aura Components
│   │   └── lightning_cheatsheet.pdf
│   ├── soql_sosl/
│   │   ├── soql_sosl.pdf
│   │   └── query_search_optimization.pdf
│   └── formulas/
│       ├── formula_fields.pdf
│       └── validation_formulas.pdf
│
├── 2_apis/
│   ├── rest_api/
│   │   ├── api_rest.pdf                      # REST API Guide
│   │   ├── api_bulk_v2.pdf                   # Bulk API 2.0
│   │   ├── connect_rest_api.pdf              # Chatter REST
│   │   └── analytics_rest_api.pdf
│   ├── soap_api/
│   │   ├── api.pdf                           # SOAP API
│   │   └── api_meta.pdf                      # Metadata API
│   ├── streaming_api/
│   │   ├── api_streaming.pdf
│   │   ├── platform_events.pdf
│   │   └── change_data_capture.pdf
│   ├── tooling_api/
│   │   └── api_tooling.pdf
│   └── specialized_apis/
│       ├── api_action.pdf                    # Actions API
│       ├── api_ui.pdf                        # UI API
│       └── api_console.pdf                   # Console API
│
├── 3_development_tools/
│   ├── sfdx_cli/
│   │   ├── sfdx_dev.pdf
│   │   ├── sfdx_cli_reference.pdf
│   │   └── sfdx_setup.pdf
│   ├── packaging/
│   │   ├── packaging_guide.pdf
│   │   ├── pkg1_dev.pdf                      # 1GP
│   │   ├── pkg2_dev.pdf                      # 2GP
│   │   └── isv_pkg.pdf
│   ├── devops/
│   │   ├── devops_center_dev.pdf
│   │   └── migration_guide.pdf
│   └── mobile_sdk/
│       ├── mobile_sdk.pdf
│       ├── service_sdk_ios.pdf
│       └── service_sdk_android.pdf
│
├── 4_clouds_and_products/
│   ├── sales_cloud/
│   │   ├── sales_admins.pdf
│   │   ├── sales_users.pdf
│   │   └── cpq_developer_guide.pdf
│   ├── service_cloud/
│   │   ├── service_dev.pdf
│   │   ├── chat_dev_guide.pdf
│   │   ├── voice_dev_guide.pdf
│   │   ├── field_service_dev.pdf
│   │   └── knowledge_dev_guide.pdf
│   ├── experience_cloud/
│   │   ├── communities_dev.pdf
│   │   └── exp_cloud_lwr.pdf
│   ├── marketing_cloud/
│   │   ├── buddymedia_*.pdf
│   │   └── radian6_*.pdf
│   ├── analytics_cloud/
│   │   ├── bi_dev_guide_*.pdf                # CRM Analytics
│   │   └── tableau/
│   └── industry_clouds/
│       ├── health_cloud_dev_guide.pdf
│       ├── fsc_dev_guide.pdf                 # Financial Services
│       ├── automotive_cloud.pdf
│       ├── edu_cloud_dev_guide.pdf
│       ├── nonprofit_cloud.pdf
│       └── insurance_developer_guide.pdf
│
├── 5_security_and_identity/
│   ├── security_impl_guide.pdf
│   ├── secure_coding.pdf
│   ├── identity_implementation_guide.pdf
│   ├── external_identity_guide.pdf
│   ├── record_access_under_the_hood.pdf
│   └── restriction_rules.pdf
│
├── 6_integration/
│   ├── integration_patterns_and_practices.pdf
│   ├── canvas_framework.pdf
│   ├── federated_search.pdf
│   └── data_loader.pdf
│
├── 7_best_practices/
│   ├── large_data_volumes_bp.pdf
│   ├── limits_limitations.pdf
│   └── cheatsheets/
│       └── *.pdf                             # All cheatsheets
│
└── 8_release_notes/
    ├── current/                              # Last 2 years
    │   ├── ReleaseNotes_Winter_26.pdf
    │   ├── ReleaseNotes_Summer_25.pdf
    │   └── ...
    ├── historical/                           # 2015-2023
    │   └── ...
    └── legacy/                               # Pre-2015
        └── ...
```

---

## 🏗️ MCP Server Architecture

### High-Level Design (Local-First, stdio Transport)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VS CODE / CLAUDE DESKTOP                          │
│                      (MCP Client via stdio)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          stdin/stdout (JSON-RPC)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SALESFORCE DOCS MCP SERVER                        │
│                       (Node.js + TypeScript)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     MCP Protocol Handler                     │   │
│  │              (@modelcontextprotocol/sdk)                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                     │
│  ┌─────────────┐  ┌────────────┴────────────┐  ┌─────────────────┐ │
│  │   Intent    │  │      Tool Handlers       │  │    Response     │ │
│  │  Classifier │  │  (search, api, release)  │  │    Formatter    │ │
│  └─────────────┘  └─────────────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       LOCAL SEARCH ENGINE                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           SQLite + LIKE-based Search (sql.js)               │   │
│  │   • Tokenized content index    • Priority ranking           │   │
│  │   • Category filtering         • LRU cache for speed        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       LOCAL DOCUMENT STORE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │  360 PDFs   │  │  Metadata   │  │     Pre-indexed Content     │ │
│  │  (~2 GB)    │  │   (JSON)    │  │   (357 docs searchable)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Comparison with Salesforce DX MCP

| Aspect | Salesforce DX MCP | Our Docs MCP |
|--------|-------------------|--------------|
| Transport | stdio | stdio |
| Runtime | Node.js | Node.js |
| Language | TypeScript | TypeScript |
| SDK | @modelcontextprotocol/sdk | @modelcontextprotocol/sdk |
| External APIs | Salesforce Org | None (local only) |
| Data Source | Live org data | Local PDFs |

---

## 🔐 Security Considerations (Local-First)

### 1. No External Network Calls
```typescript
// All operations are local - no API keys, no external services
const SECURITY_CONFIG = {
    transport: "stdio",           // No HTTP server exposed
    externalAPIs: false,          // No outbound network calls
    dataStorage: "local-only",    // All data stays on machine
    sensitiveData: "none"         // No credentials stored
};
```

### 2. Input Validation
```typescript
// All tool inputs are validated using zod schemas
import { z } from "zod";

const SearchDocsSchema = z.object({
    query: z.string().min(1).max(500),
    category: z.enum([...validCategories]).optional(),
    maxResults: z.number().int().min(1).max(20).optional()
});

// Parameterized queries prevent SQL injection
const stmt = db.prepare(`SELECT * FROM documents WHERE category = ?`);
stmt.bind([category]);
```

### 3. Local-Only Guarantees
- ✅ No authentication needed (local access only)
- ✅ No rate limiting needed (single user)
- ✅ No data leaves the machine
- ✅ No API keys or secrets required
- ✅ Works completely offline

---

## ⚡ Search Strategy: Intent-Based Filtering + LIKE Search

### Search Flow
```
User Query: "How to create an Apex trigger"
                    │
                    ▼
┌─────────────────────────────────────────┐
│         1. INTENT DETECTION             │
│   Keywords: "apex", "trigger"           │
│   → Detected: Apex Development (high)   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         2. AUTO-FILTER                  │
│   category: core_platform              │
│   subcategory: apex                     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         3. SCOPED SEARCH                │
│   Search only in Apex docs (~15 docs)   │
│   Instead of all 357 docs               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         4. RANKED RESULTS               │
│   apex_developer_guide.pdf (Score: 12)  │
│   apex_api.pdf (Score: 11)              │
└─────────────────────────────────────────┘
```

### Intent Detection Patterns
```typescript
// Intent patterns mapped to documentation categories
const INTENT_PATTERNS = [
    // Apex Development
    { keywords: ['apex trigger', 'before insert', 'batch apex', 'queueable'], 
      → subcategory: 'apex' },
    
    // SOQL/SOSL
    { keywords: ['soql', 'sosl', 'select from', 'relationship query'], 
      → subcategory: 'soql_sosl' },
    
    // REST API
    { keywords: ['rest api', 'oauth', 'httpget', '@restresource'], 
      → subcategory: 'rest_api' },
    
    // Lightning/LWC
    { keywords: ['lwc', '@wire', '@api', 'lightning web component'], 
      → subcategory: 'lightning' },
    
    // Security
    { keywords: ['sharing rules', 'permission set', 'field level security'], 
      → subcategory: 'security' },
    // ... 30+ more patterns
];
```

### Fallback Strategy
```
1. Intent-filtered search (high confidence)
   ↓ If < 3 results
2. Category-only search (drop subcategory)
   ↓ If < 3 results
3. Unfiltered search (full corpus)
```

### SQLite via sql.js (Pure JavaScript, No Native Dependencies)
```typescript
// Single database file for everything - uses sql.js for cross-platform support
const DB_CONFIG = {
    dbPath: "./data/salesforce-docs.db",
    // Note: sql.js doesn't support FTS5, so we use LIKE-based search
    // with a lowercased content column for case-insensitive matching
    indexOptions: {
        contentLowerColumn: true,  // Pre-computed lowercase for faster search
        parameterizedQueries: true // Security: prevents SQL injection
    }
};
```

### 2. Database Schema
```sql
-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    file_name TEXT,
    file_path TEXT,
    category TEXT,
    subcategory TEXT,
    doc_type TEXT,
    title TEXT,
    description TEXT,
    keywords TEXT,
    api_version TEXT,
    priority INTEGER
);

-- Chunks table with pre-lowercased content for fast LIKE search
CREATE TABLE chunks (
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    content TEXT,
    content_lower TEXT,  -- Pre-computed lowercase for case-insensitive search
    section_title TEXT,
    page_number INTEGER,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Fast category-based filtering
CREATE INDEX idx_category ON documents(category);
CREATE INDEX idx_subcategory ON documents(subcategory);
CREATE INDEX idx_priority ON documents(priority DESC);
```

### 3. Query Performance Targets
| Operation | Target Latency | Method |
|-----------|----------------|--------|
| Intent-filtered search | < 50ms | Scoped LIKE search (90% fewer chunks) |
| Unfiltered search | < 500ms | Full corpus LIKE search |
| Cached search | < 10ms | LRU cache (500 queries, 5min TTL) |
| Category filter | < 100ms | Pre-indexed categories |
| Document fetch | < 50ms | Direct rowid lookup |

### 4. In-Memory Caching (Simple LRU)
```typescript
import { LRUCache } from 'lru-cache';

const searchCache = new LRUCache<string, SearchResult[]>({
    max: 500,           // 500 queries cached
    ttl: 1000 * 60 * 5, // 5 minute TTL
});
```

---

## 🎯 Accuracy Optimization

### 1. Semantic Chunking Strategy
```typescript
const CHUNKING_CONFIG = {
    strategy: "semantic_sections",  // Split by headings, not arbitrary
    maxChunkSize: 1500,             // Characters (not tokens)
    overlapSize: 200,               // Context preservation
    preserveCodeBlocks: true,       // Keep code intact
    preserveTables: true,           // Keep tables intact
};
```

### 2. Match Density Scoring
```typescript
// Search with intent-based filtering and match density scoring
async function searchDocuments(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const sanitizedQuery = sanitizeQuery(query);
    
    // Step 1: Detect intent from query
    const intent = detectIntent(sanitizedQuery);
    
    // Step 2: Apply intent filter if confident and no explicit filter
    let effectiveSubcategory = options?.subcategory;
    if (!options?.subcategory && intent.confidence !== 'low') {
        effectiveSubcategory = intent.subcategory;
    }
    
    // Step 3: Build LIKE query with parameterized search
    const searchTerms = sanitizedQuery.split(/\s+/).filter(w => w.length > 1);
    const likeConditions = searchTerms.map(() => 'c.content_lower LIKE ?').join(' OR ');
    
    // Step 4: Calculate match density for ranking
    // Match density = (terms found in chunk) / (total search terms)
    // Score = (matchDensity * 10) + (priority * 0.2) + occurrenceBonus
    
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
```

### 3. Intent Detection Patterns
```typescript
// 30+ keyword patterns mapped to documentation subcategories
const INTENT_PATTERNS = [
    // Apex Development (high confidence triggers)
    { keywords: ['apex trigger', 'before insert', 'batch apex', 'queueable', '@future'], 
      category: 'core_platform', subcategory: 'apex', weight: 10 },
    
    // SOQL/SOSL
    { keywords: ['soql', 'sosl', 'select from', 'relationship query'], 
      category: 'core_platform', subcategory: 'soql_sosl', weight: 10 },
    
    // REST API
    { keywords: ['rest api', 'oauth', 'httpget', '@restresource', 'access token'], 
      category: 'apis', subcategory: 'rest_api', weight: 10 },
    
    // Lightning/LWC
    { keywords: ['lwc', '@wire', '@api', '@track', 'lightning web component'], 
      category: 'core_platform', subcategory: 'lightning', weight: 10 },
    
    // Security
    { keywords: ['sharing rules', 'permission set', 'field level security', 'fls'], 
      category: 'security', subcategory: 'security', weight: 10 },
    
    // ... 25+ more patterns in src/utils/intent.ts
];

function detectIntent(query: string): DetectedIntent {
    // Match keywords, sum weights, return highest-scoring subcategory
    // Confidence: high (>= 15 weight), medium (>= 7), low (< 7)
}
```

---

## 📊 Document Metadata Schema (TypeScript)

```typescript
// Document category enum
enum DocCategory {
    CORE_PLATFORM = "core_platform",
    APIS = "apis",
    DEV_TOOLS = "dev_tools",
    CLOUDS = "clouds",
    SECURITY = "security",
    INTEGRATION = "integration",
    BEST_PRACTICES = "best_practices",
    RELEASE_NOTES = "release_notes"
}

// Document type enum
enum DocType {
    DEVELOPER_GUIDE = "developer_guide",
    API_REFERENCE = "api_reference",
    CHEATSHEET = "cheatsheet",
    IMPLEMENTATION_GUIDE = "implementation_guide",
    RELEASE_NOTES = "release_notes",
    WORKBOOK = "workbook"
}

// Document metadata interface
interface DocumentMetadata {
    id: number;
    fileName: string;
    filePath: string;
    category: DocCategory;
    subcategory: string;
    docType: DocType;
    title: string;
    description?: string;
    keywords: string[];
    apiVersion?: string;
    lastUpdated: string;
    pageCount: number;
    sizeBytes: number;
    priority: number;  // 1-10, for search ranking boost
}

// Search result interface
interface SearchResult {
    document: DocumentMetadata;
    chunk: string;
    score: number;
    highlights: string[];
}
```

### SQLite Schema
```sql
-- Main documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    doc_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    keywords TEXT,  -- JSON array
    api_version TEXT,
    last_updated TEXT,
    page_count INTEGER,
    size_bytes INTEGER,
    priority INTEGER DEFAULT 5
);

-- Document chunks for search
CREATE TABLE chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER REFERENCES documents(id),
    chunk_index INTEGER,
    content TEXT NOT NULL,
    section_title TEXT,
    page_number INTEGER
);

-- Pre-computed lowercase content for fast LIKE search
-- Note: sql.js doesn't support FTS5, so we use LIKE with content_lower
ALTER TABLE chunks ADD COLUMN content_lower TEXT;
CREATE INDEX idx_document_id ON chunks(document_id);
```

---

## 🛠️ MCP Tools Design (TypeScript)

### Tool 1: `search_salesforce_docs`
```typescript
server.tool(
    "search_salesforce_docs",
    "Search Salesforce documentation with intent detection and LIKE-based search",
    {
        query: z.string().describe("Natural language search query"),
        category: z.enum([
            "core_platform", "apis", "dev_tools", "clouds", 
            "security", "integration", "best_practices", "release_notes"
        ]).optional().describe("Filter by category"),
        maxResults: z.number().min(1).max(10).default(5).describe("Number of results")
    },
    async ({ query, category, maxResults }) => {
        const results = await searchDocuments(query, { category, maxResults });
        return {
            content: [{ type: "text", text: formatSearchResults(results) }]
        };
    }
);
```

### Tool 2: `get_api_reference`
```typescript
server.tool(
    "get_api_reference",
    "Get specific Salesforce API reference documentation",
    {
        apiName: z.string().describe("Name of API (e.g., 'REST API', 'Bulk API')"),
        endpoint: z.string().optional().describe("Specific endpoint or method")
    },
    async ({ apiName, endpoint }) => {
        const docs = await getApiReference(apiName, endpoint);
        return {
            content: [{ type: "text", text: docs }]
        };
    }
);
```

### Tool 3: `get_release_notes`
```typescript
server.tool(
    "get_release_notes",
    "Get Salesforce release notes for specific releases or features",
    {
        release: z.string().optional().describe("Release name (e.g., 'Winter 26', 'Summer 25')"),
        feature: z.string().optional().describe("Search for specific feature"),
        yearsBack: z.number().min(1).max(5).default(2).describe("How many years back to search")
    },
    async ({ release, feature, yearsBack }) => {
        const notes = await getReleaseNotes({ release, feature, yearsBack });
        return {
            content: [{ type: "text", text: notes }]
        };
    }
);
```

### Tool 4: `get_code_example`
```typescript
server.tool(
    "get_code_example",
    "Get code examples from Salesforce documentation",
    {
        topic: z.string().describe("What the code should demonstrate"),
        language: z.enum(["apex", "lwc", "visualforce", "soql", "javascript"])
            .default("apex").describe("Programming language")
    },
    async ({ topic, language }) => {
        const examples = await getCodeExamples(topic, language);
        return {
            content: [{ type: "text", text: examples }]
        };
    }
);
```

### Tool 5: `list_doc_categories`
```typescript
server.tool(
    "list_doc_categories",
    "List all documentation categories with document counts",
    {},
    async () => {
        const categories = await getCategories();
        return {
            content: [{ type: "text", text: formatCategories(categories) }]
        };
    }
);
```

### Tool 6: `get_document`
```typescript
server.tool(
    "get_document",
    "Get full content of a specific document by ID or name",
    {
        documentId: z.number().optional().describe("Document ID from search results"),
        documentName: z.string().optional().describe("Document filename"),
        section: z.string().optional().describe("Specific section to retrieve")
    },
    async ({ documentId, documentName, section }) => {
        const doc = documentId 
            ? await getDocumentById(documentId)
            : await getDocumentByFileName(documentName);
        const content = await getDocumentContent(doc.id, section);
        return { content: [{ type: "text", text: formatDocument(doc, content) }] };
    }
);
```

### Tool 7: `expand_search_query` (🧠 LLM-Powered)
```typescript
server.tool(
    "expand_search_query",
    "Expand a natural language query into optimal search keywords",
    {
        query: z.string().describe("Natural language query (vibe-style question)"),
        context: z.string().optional().describe("Additional context")
    },
    async ({ query, context }) => {
        const expansion = expandQueryToKeywords(query, context);
        return { content: [{ type: "text", text: formatQueryExpansion(query, expansion) }] };
    }
);
```

### Tool 8: `get_document_summaries`
```typescript
server.tool(
    "get_document_summaries",
    "Get lightweight catalog of available documents for browsing",
    {
        category: z.enum([...categories]).optional().describe("Filter by category"),
        limit: z.number().min(1).max(50).default(20).describe("Max documents")
    },
    async ({ category, limit }) => {
        const summaries = await getDocumentSummaries(category, limit);
        return { content: [{ type: "text", text: formatDocumentSummaries(summaries) }] };
    }
);
```

### Tool 9: `semantic_search_docs` (🧠 LLM-Powered)
```typescript
server.tool(
    "semantic_search_docs",
    "Search with LLM-expanded terms for better semantic matching",
    {
        query: z.string().describe("Original user query"),
        expandedTerms: z.array(z.string()).optional().describe("Terms from expand_search_query"),
        category: z.enum([...categories]).optional().describe("Filter by category"),
        maxResults: z.number().min(1).max(20).default(5).describe("Max results")
    },
    async ({ query, expandedTerms, category, maxResults }) => {
        const combinedQuery = expandedTerms?.length > 0
            ? `${query} ${expandedTerms.join(' ')}`
            : query;
        const results = await searchDocuments(combinedQuery, { category, maxResults });
        return { content: [{ type: "text", text: formatSearchResults(results) }] };
    }
);
```

---

## 📈 Performance Benchmarks (Local Targets)

| Metric | Target | Method |
|--------|--------|--------|
| Cold start | < 2s | Pre-built SQLite index |
| Intent-filtered query | < 50ms | Scoped LIKE search (90% fewer chunks) |
| Unfiltered query | < 500ms | Full corpus LIKE search |
| Cached query | < 10ms | LRU cache (500 queries, 5min TTL) |
| Index size | < 600MB | SQLite database |
| Memory usage | < 200MB | Node.js process |
| Offline support | 100% | No external dependencies |

---

## 🔄 Indexing Pipeline (One-Time Build)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PDF Files  │───▶│  PDF Parser  │───▶│   Chunker    │───▶│   SQLite     │
│   (360 PDFs) │    │  (pdf-parse) │    │  (Semantic)  │    │   Writer     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
                                                            ┌──────────────┐
                                                            │ LIKE Index   │
                                                            │ (content_lower) │
                                                            └──────────────┘
```

### Indexing Script
```typescript
// scripts/build-index.ts
import pdfParse from 'pdf-parse';
import Database from 'better-sqlite3';
import { glob } from 'glob';
import { DOCUMENT_MAPPING } from '../src/document-mapping';

async function buildIndex() {
    const db = new Database('./data/salesforce-docs.db');
    
    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS documents (...);
        CREATE TABLE IF NOT EXISTS chunks (...);
        -- Add content_lower column for LIKE search
    `);
    
    // Process all PDFs
    const pdfs = await glob('./docs/**/*.pdf');
    console.log(`Processing ${pdfs.length} PDFs...`);
    
    for (const pdfPath of pdfs) {
        const buffer = await fs.readFile(pdfPath);
        const data = await pdfParse(buffer);
        const chunks = chunkContent(data.text);
        const metadata = getMetadata(pdfPath);
        
        // Insert document and chunks
        const docId = insertDocument(db, metadata);
        insertChunks(db, docId, chunks);
    }
    
    // Rebuild FTS index
    db.exec(`INSERT INTO chunks_fts(chunks_fts) VALUES('rebuild')`);
    
    console.log('Index built successfully!');
}
```

### Estimated Build Time
- **360 PDFs** → ~5-10 minutes one-time build
- **Index size** → ~300-500 MB SQLite database
- **Rebuild** → Only needed when PDFs change

---

## 📦 Tech Stack (Local-First, No External APIs)

| Component | Technology | Reason |
|-----------|------------|--------|
| **Runtime** | Node.js 18+ | Same as Salesforce DX MCP |
| **Language** | TypeScript | Type safety, same as SF DX MCP |
| **MCP SDK** | @modelcontextprotocol/sdk | Official TypeScript SDK |
| **Transport** | stdio | Standard MCP pattern |
| **PDF Parsing** | pdf-parse | Pure JS, no native deps |
| **Database** | sql.js | Pure JS SQLite, cross-platform |
| **Full-Text Search** | LIKE + Intent | Intent-based filtering + LIKE queries |
| **Caching** | lru-cache | Simple in-memory cache |
| **Schema Validation** | Zod | MCP tool parameter validation |

### Dependencies (package.json)
```json
{
  "name": "salesforce-docs-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "salesforce-docs-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "build-index": "tsx scripts/build-index.ts",
    "test-search": "tsx scripts/test-search.ts",
    "test-llm-judge": "tsx scripts/test-llm-judge.ts",
    "test-all": "npm run test-search && npm run test-llm-judge"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "sql.js": "^1.10.0",
    "lru-cache": "^10.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "pdf-parse": "^1.1.1",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🚀 Implementation Status

### Phase 1: Foundation ✅
- [x] Download all PDFs (360 documents, ~2 GB)
- [x] Design architecture (local-first, stdio)
- [x] Create document categorization mapping
- [x] Set up TypeScript project structure
- [x] Create package.json with dependencies
- [x] Implement MCP server entry point

### Phase 2: Indexing ✅
- [x] Implement PDF parsing with pdf-parse
- [x] Create semantic chunking logic
- [x] Build SQLite database schema
- [x] Create LIKE-based search index
- [x] Test indexing pipeline

### Phase 3: Search & Tools ✅
- [x] Implement `search_salesforce_docs` tool
- [x] Implement `get_api_reference` tool
- [x] Implement `get_release_notes` tool
- [x] Implement `get_code_example` tool
- [x] Implement `list_doc_categories` tool
- [x] Implement `get_document` tool
- [x] Implement `expand_search_query` tool (🧠 LLM-powered semantic expansion)
- [x] Implement `get_document_summaries` tool (document catalog)
- [x] Implement `semantic_search_docs` tool (🧠 LLM-powered search)
- [x] Add category-based filtering
- [x] Add intent-based search with match density scoring

### Phase 4: Integration ✅
- [x] Add to VS Code mcp.json
- [x] Test with Copilot Chat
- [x] Documentation & README
- [x] Test suite (114 tests, 99%+ pass rate)

---

## 🔧 VS Code MCP Configuration

Add to `%APPDATA%\Code\User\mcp.json`:

```json
{
  "servers": {
    "salesforce-docs": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\Anket\\Downloads\\mcpdocsalesforce\\dist\\index.js"
      ]
    }
  }
}
```

---

## 📋 Project Structure

```
mcpdocsalesforce/
├── docs/
│   ├── pdfs/              # 291 developer docs (~2 GB)
│   └── release-notes/     # 69 release notes
├── data/
│   └── salesforce-docs.db # SQLite + LIKE index (357 indexed docs)
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── types.ts           # TypeScript type definitions
│   ├── db/
│   │   ├── database.ts    # SQLite connection (sql.js)
│   │   └── queries.ts     # Search queries with intent detection
│   └── utils/
│       ├── chunker.ts     # PDF text chunking
│       ├── intent.ts      # Intent detection (30+ patterns)
│       ├── formatter.ts   # Result formatting
│       └── classifier.ts  # Document classification
├── scripts/
│   ├── build-index.ts     # One-time PDF indexing
│   ├── test-search.ts     # Search testing (114 tests)
│   └── test-llm-judge.ts  # LLM-as-judge evaluation
├── package.json
├── tsconfig.json
└── MCP_ARCHITECTURE.md    # This file
```

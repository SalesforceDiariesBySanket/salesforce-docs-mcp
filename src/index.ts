#!/usr/bin/env node
/**
 * Salesforce Documentation MCP Server
 * 
 * A local-first MCP server for searching Salesforce documentation.
 * Uses SQLite with LIKE-based search for cross-platform compatibility.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { searchDocuments, getDocumentById, getDocumentByFileName, getDocumentContent, getDocumentSummaries } from "./db/queries.js";
import { formatSearchResults, formatDocument, formatCategories, formatCodeExamples, formatQueryExpansion, formatDocumentSummaries } from "./utils/formatter.js";
import { expandQueryToKeywords } from "./utils/intent.js";
import { getDatabase, initializeDatabase } from "./db/database.js";
import { 
    DocCategory, 
    CATEGORY_LABELS, 
    SUBCATEGORY_LABELS,
    SearchOptions 
} from "./types.js";

// Zod schemas for input validation
const SearchDocsSchema = z.object({
    query: z.string().min(1).max(500),
    category: z.enum(["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"]).optional(),
    maxResults: z.number().int().min(1).max(20).optional().default(5)
});

const ApiReferenceSchema = z.object({
    apiName: z.string().min(1).max(200),
    endpoint: z.string().max(500).optional()
});

const ReleaseNotesSchema = z.object({
    release: z.string().max(100).optional(),
    feature: z.string().max(200).optional()
}).refine(data => data.release || data.feature, {
    message: "Either release or feature is required"
});

const CodeExampleSchema = z.object({
    topic: z.string().min(1).max(500),
    language: z.enum(["apex", "lwc", "visualforce", "soql", "javascript", "formula"]).optional().default("apex")
});

const GetDocumentSchema = z.object({
    documentId: z.number().int().positive().optional(),
    documentName: z.string().max(500).optional(),
    section: z.string().max(200).optional()
}).refine(data => data.documentId || data.documentName, {
    message: "Either documentId or documentName is required"
});

// New semantic search schemas
const ExpandQuerySchema = z.object({
    query: z.string().min(1).max(1000),
    context: z.string().max(500).optional()
});

const DocumentSummariesSchema = z.object({
    category: z.enum(["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"]).optional(),
    limit: z.number().int().min(1).max(50).optional().default(20)
});

const SemanticSearchSchema = z.object({
    query: z.string().min(1).max(500),
    expandedTerms: z.array(z.string()).optional(),
    category: z.enum(["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"]).optional(),
    maxResults: z.number().int().min(1).max(20).optional().default(5)
});

// Server instance
const server = new Server(
    {
        name: "salesforce-docs-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Tool definitions
const TOOLS = [
    {
        name: "search_salesforce_docs",
        description: `Search Salesforce documentation with relevance-ranked results.
Searches across 360 official Salesforce PDF documents including:
- Apex Developer Guide & Reference
- REST API, SOAP API, Metadata API, Bulk API
- Lightning Web Components (LWC)
- Visualforce, SOQL/SOSL
- Integration patterns, Security guides
- Release notes (last 10 years)

Results are ranked by match density (how many search terms appear) combined with document priority.
Returns document ID, relevant excerpts, and source information.`,
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Natural language search query (e.g., 'How to create an Apex trigger', 'REST API authentication')"
                },
                category: {
                    type: "string",
                    enum: ["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"],
                    description: "Filter by documentation category (optional)"
                },
                maxResults: {
                    type: "number",
                    minimum: 1,
                    maximum: 20,
                    default: 5,
                    description: "Maximum number of results to return (default: 5)"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "get_api_reference",
        description: `Get specific Salesforce API reference documentation.
Supports: REST API, SOAP API, Metadata API, Bulk API 2.0, Tooling API, 
Streaming API, Chatter REST API, Analytics REST API, and more.

Provide the API name and optionally a specific endpoint or resource.`,
        inputSchema: {
            type: "object",
            properties: {
                apiName: {
                    type: "string",
                    description: "Name of the API (e.g., 'REST API', 'Metadata API', 'Bulk API 2.0', 'Tooling API')"
                },
                endpoint: {
                    type: "string",
                    description: "Specific endpoint, resource, or method to look up (optional)"
                }
            },
            required: ["apiName"]
        }
    },
    {
        name: "get_release_notes",
        description: `Get Salesforce release notes for specific releases or features.
Covers releases from 2015 to present (Winter '26, Summer '25, etc.)
Search by release name or by feature keyword.`,
        inputSchema: {
            type: "object",
            properties: {
                release: {
                    type: "string",
                    description: "Release name (e.g., 'Winter 26', 'Summer 25', 'Spring 24')"
                },
                feature: {
                    type: "string",
                    description: "Search for specific feature (e.g., 'Flow', 'Dynamic Forms', 'LWC')"
                }
            }
        }
    },
    {
        name: "get_code_example",
        description: `Get code examples from Salesforce documentation.
Returns code snippets demonstrating specific functionality.
Supports: Apex, LWC (JavaScript/HTML), Visualforce, SOQL, Formulas.`,
        inputSchema: {
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "What the code should demonstrate (e.g., 'trigger on Account', 'REST callout', 'LWC wire service')"
                },
                language: {
                    type: "string",
                    enum: ["apex", "lwc", "visualforce", "soql", "javascript", "formula"],
                    default: "apex",
                    description: "Programming language (default: apex)"
                }
            },
            required: ["topic"]
        }
    },
    {
        name: "list_doc_categories",
        description: `List all documentation categories with document counts and descriptions.
Useful for understanding what documentation is available.`,
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_document",
        description: `Get the full content of a specific Salesforce document by ID or name.
Use this after searching to get more detailed content from a specific document.`,
        inputSchema: {
            type: "object",
            properties: {
                documentId: {
                    type: "number",
                    description: "Document ID from search results"
                },
                documentName: {
                    type: "string",
                    description: "Document filename (e.g., 'apex_developer_guide.pdf')"
                },
                section: {
                    type: "string",
                    description: "Specific section to retrieve (optional)"
                }
            }
        }
    },
    // ============ SEMANTIC SEARCH TOOLS (LLM-Powered) ============
    {
        name: "expand_search_query",
        description: `🧠 LLM-POWERED: Expand a natural language query into optimal search keywords.
Use this FIRST when a user asks a vibe-style question that doesn't contain technical terms.

This tool analyzes the user's intent and returns:
- Expanded technical keywords for searching
- Detected Salesforce concepts
- Suggested documentation categories

Example:
  Input: "How do I make code run when someone updates a record?"
  Output: ["apex trigger", "before update", "after update", "DML", "database trigger"]

The LLM should use these expanded terms with search_salesforce_docs for better results.`,
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The natural language query from the user (vibe-style question)"
                },
                context: {
                    type: "string",
                    description: "Additional context about what the user is building (optional)"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "get_document_summaries",
        description: `Get a lightweight catalog of available Salesforce documents.
Returns document titles and brief descriptions for the LLM to scan.
Use this to understand what documentation is available before searching.

Useful for:
- Browsing available documentation
- Finding the right document when you know the topic but not the exact terms
- Understanding the documentation landscape`,
        inputSchema: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    enum: ["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"],
                    description: "Filter by documentation category (optional)"
                },
                limit: {
                    type: "number",
                    minimum: 1,
                    maximum: 50,
                    default: 20,
                    description: "Maximum number of documents to return (default: 20)"
                }
            }
        }
    },
    {
        name: "semantic_search_docs",
        description: `🧠 LLM-POWERED: Search with expanded terms for better semantic matching.
Use this after expand_search_query to search with both the original query AND expanded keywords.

This combines:
- Original user query
- LLM-generated expanded terms
- Category filtering

Returns more relevant results for vibe-style questions.`,
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The original user query"
                },
                expandedTerms: {
                    type: "array",
                    items: { type: "string" },
                    description: "Expanded search terms from expand_search_query"
                },
                category: {
                    type: "string",
                    enum: ["core_platform", "apis", "dev_tools", "clouds", "security", "integration", "best_practices", "release_notes"],
                    description: "Filter by documentation category (optional)"
                },
                maxResults: {
                    type: "number",
                    minimum: 1,
                    maximum: 20,
                    default: 5,
                    description: "Maximum number of results to return (default: 5)"
                }
            },
            required: ["query"]
        }
    }
];

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// Handler for executing tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "search_salesforce_docs": {
                // Validate input with zod
                const parseResult = SearchDocsSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { query, category, maxResults } = parseResult.data;

                // Intent detection is handled internally by searchDocuments
                const options: SearchOptions = {
                    category: category as DocCategory | undefined,
                    maxResults
                };

                const results = await searchDocuments(query, options);
                const formatted = formatSearchResults(results, query);

                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "get_api_reference": {
                // Validate input with zod
                const parseResult = ApiReferenceSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { apiName, endpoint } = parseResult.data;

                // Search in API category with specific terms
                const query = endpoint 
                    ? `${apiName} ${endpoint}` 
                    : apiName;

                const results = await searchDocuments(query, {
                    category: DocCategory.APIS,
                    maxResults: 5,
                    intent: "api_reference"
                });

                const formatted = formatSearchResults(results, query);
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "get_release_notes": {
                // Validate input with zod
                const parseResult = ReleaseNotesSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { release, feature } = parseResult.data;

                const query = [release, feature].filter(Boolean).join(" ");
                const results = await searchDocuments(query, {
                    category: DocCategory.RELEASE_NOTES,
                    maxResults: 5,
                    intent: "release_notes"
                });

                const formatted = formatSearchResults(results, query);
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "get_code_example": {
                // Validate input with zod
                const parseResult = CodeExampleSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { topic, language } = parseResult.data;

                // Map language to category
                const categoryMap: Record<string, DocCategory> = {
                    apex: DocCategory.CORE_PLATFORM,
                    lwc: DocCategory.CORE_PLATFORM,
                    visualforce: DocCategory.CORE_PLATFORM,
                    soql: DocCategory.CORE_PLATFORM,
                    javascript: DocCategory.CORE_PLATFORM,
                    formula: DocCategory.CORE_PLATFORM
                };

                const query = `${language} ${topic} example code`;
                const results = await searchDocuments(query, {
                    category: categoryMap[language],
                    maxResults: 5,
                    intent: "code_example"
                });

                const formatted = formatCodeExamples(results, topic, language);
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "list_doc_categories": {
                const db = await getDatabase();
                const catResult = db.exec(`
                    SELECT category, COUNT(*) as count
                    FROM documents
                    GROUP BY category
                    ORDER BY category
                `);

                const categories = catResult.length > 0 
                    ? catResult[0].values.map(row => ({
                        category: row[0] as string,
                        count: row[1] as number
                    }))
                    : [];

                const formatted = formatCategories(categories);
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "get_document": {
                // Validate input with zod
                const parseResult = GetDocumentSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { documentId, documentName, section } = parseResult.data;

                let doc;
                if (documentId) {
                    doc = await getDocumentById(documentId);
                } else if (documentName) {
                    // Query by filename directly instead of searching content
                    doc = await getDocumentByFileName(documentName);
                }

                if (!doc) {
                    return {
                        content: [{ type: "text", text: "Document not found" }],
                        isError: true
                    };
                }

                const content = await getDocumentContent(doc.id, section);
                const formatted = formatDocument(doc, content);
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            // ============ SEMANTIC SEARCH TOOL HANDLERS ============
            
            case "expand_search_query": {
                const parseResult = ExpandQuerySchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { query, context } = parseResult.data;

                // Use the LLM-friendly expansion logic
                const expansion = expandQueryToKeywords(query, context);
                const formatted = formatQueryExpansion(query, expansion);
                
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "get_document_summaries": {
                const parseResult = DocumentSummariesSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { category, limit } = parseResult.data;

                const summaries = await getDocumentSummaries(category as DocCategory | undefined, limit);
                const formatted = formatDocumentSummaries(summaries);
                
                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            case "semantic_search_docs": {
                const parseResult = SemanticSearchSchema.safeParse(args);
                if (!parseResult.success) {
                    return {
                        content: [{ type: "text", text: `Validation error: ${parseResult.error.errors.map(e => e.message).join(', ')}` }],
                        isError: true
                    };
                }
                const { query, expandedTerms, category, maxResults } = parseResult.data;

                // Combine original query with expanded terms for broader search
                const combinedQuery = expandedTerms && expandedTerms.length > 0
                    ? `${query} ${expandedTerms.join(' ')}`
                    : query;

                const options: SearchOptions = {
                    category: category as DocCategory | undefined,
                    maxResults,
                    intent: "semantic_search"
                };

                const results = await searchDocuments(combinedQuery, options);
                
                // Add semantic context to the output
                let formatted = formatSearchResults(results, query);
                if (expandedTerms && expandedTerms.length > 0) {
                    formatted = `🧠 **Semantic Search Active**\nExpanded terms: ${expandedTerms.join(', ')}\n\n${formatted}`;
                }

                return {
                    content: [{ type: "text", text: formatted }]
                };
            }

            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true
                };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true
        };
    }
});

// Main entry point
async function main() {
    try {
        // Initialize database
        await initializeDatabase();

        // Start the server with stdio transport
        const transport = new StdioServerTransport();
        await server.connect(transport);

        // Log to stderr (stdout is used for MCP protocol)
        console.error("Salesforce Docs MCP Server started successfully");
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

main();

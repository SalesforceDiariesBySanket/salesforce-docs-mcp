/**
 * Database query functions for search and retrieval
 * Uses sql.js for cross-platform compatibility
 * Note: sql.js doesn't support FTS5, so we use LIKE-based search with intent detection
 */

import { getDatabase } from "./database.js";
import { 
    DocumentMetadata, 
    SearchResult, 
    SearchOptions, 
    DocCategory 
} from "../types.js";
import { LRUCache } from "lru-cache";
import { detectIntent, describeIntent } from "../utils/intent.js";

// Search result cache
const searchCache = new LRUCache<string, SearchResult[]>({
    max: 500,
    ttl: 1000 * 60 * 5, // 5 minutes
});

// Maximum query length for security
const MAX_QUERY_LENGTH = 500;

/**
 * Sanitize search query
 */
function sanitizeQuery(query: string): string {
    if (query.length > MAX_QUERY_LENGTH) {
        query = query.substring(0, MAX_QUERY_LENGTH);
    }
    // Remove potentially dangerous characters
    query = query
        .replace(/[<>]/g, '')
        .replace(/[\x00-\x1f]/g, '')
        .trim();
    
    // Escape SQL special characters
    query = query.replace(/'/g, "''");
    
    return query;
}

/**
 * Build LIKE query patterns from search terms
 */
function buildSearchPatterns(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    return words.map(w => `%${w}%`);
}

/**
 * Search documents using intent-based filtering with LIKE-based text search
 * 
 * Strategy:
 * 1. Detect intent from query (e.g., "apex trigger" → Apex Development)
 * 2. If high/medium confidence and no explicit filter provided, auto-filter to relevant subcategory
 * 3. Search within filtered scope for highly relevant results
 * 4. If too few results, fall back to broader search
 */
export async function searchDocuments(
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult[]> {
    const db = await getDatabase();
    const sanitizedQuery = sanitizeQuery(query);
    
    // Detect intent from query
    const intent = detectIntent(sanitizedQuery);
    const intentDescription = describeIntent(intent);
    
    // Determine effective filters: user-provided > intent-detected
    let effectiveCategory = options.category;
    let effectiveSubcategory = options.subcategory;
    let usedIntentFilter = false;
    
    // Apply intent-based filtering if no explicit filter and confidence is sufficient
    if (!options.category && !options.subcategory && intent.confidence !== 'low' && intent.subcategory) {
        effectiveSubcategory = intent.subcategory;
        effectiveCategory = intent.category as DocCategory;
        usedIntentFilter = true;
    }
    
    // Check cache (include effective filters in cache key)
    const cacheKey = JSON.stringify({ 
        query: sanitizedQuery, 
        options,
        effectiveCategory,
        effectiveSubcategory
    });
    const cached = searchCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    
    const maxResults = options.maxResults || 5;
    const searchPatterns = buildSearchPatterns(sanitizedQuery);
    const searchTerms = sanitizedQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    
    if (searchPatterns.length === 0) {
        return [];
    }
    
    /**
     * Execute search with given filters and return scored results
     */
    const executeSearch = (
        category: string | undefined, 
        subcategory: string | undefined,
        sampleSize: number
    ): SearchResult[] => {
        const params: any[] = [];
        
        // Build WHERE clause with LIKE conditions
        const likeConditions = searchPatterns.map((pattern) => {
            params.push(pattern);
            return `c.content_lower LIKE ?`;
        }).join(' OR ');
        
        let sql = `
            SELECT 
                d.id, d.file_name, d.file_path, d.category, d.subcategory,
                d.doc_type, d.title, d.description, d.keywords, d.api_version, d.priority,
                c.content, c.content_lower, c.section_title, c.page_number
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE (${likeConditions})
        `;
        
        if (category) {
            sql += ` AND d.category = ?`;
            params.push(category);
        }
        if (subcategory) {
            sql += ` AND d.subcategory = ?`;
            params.push(subcategory);
        }
        
        // Order by priority before limiting to ensure high-priority docs are included
        sql += ` ORDER BY d.priority DESC LIMIT ?`;
        params.push(sampleSize);
        
        const stmt = db.prepare(sql);
        stmt.bind(params);
        
        const rows: any[][] = [];
        const columns = stmt.getColumnNames();
        while (stmt.step()) {
            rows.push(stmt.get());
        }
        stmt.free();
        
        if (rows.length === 0) return [];
        
        // Score and rank results
        const results: SearchResult[] = rows.map((row) => {
            const getValue = (col: string) => {
                const idx = columns.indexOf(col);
                return idx >= 0 ? row[idx] : null;
            };
            
            const contentLower = (getValue('content_lower') as string) || '';
            const priority = (getValue('priority') as number) || 1;
            
            // Match density: what fraction of search terms appear in this chunk
            let matchCount = 0;
            let totalOccurrences = 0;
            for (const term of searchTerms) {
                if (contentLower.includes(term)) {
                    matchCount++;
                    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    const matches = contentLower.match(regex);
                    totalOccurrences += matches ? matches.length : 0;
                }
            }
            
            const matchDensity = searchTerms.length > 0 ? matchCount / searchTerms.length : 0;
            const occurrenceBonus = Math.min(totalOccurrences * 0.1, 2);
            
            // Simple relevance: match density is primary (since we're already filtered by intent)
            const relevanceScore = (matchDensity * 10) + (priority * 0.2) + occurrenceBonus;
            
            return {
                document: {
                    id: getValue('id') as number,
                    fileName: getValue('file_name') as string,
                    filePath: getValue('file_path') as string,
                    category: getValue('category') as DocCategory,
                    subcategory: getValue('subcategory') as string,
                    docType: getValue('doc_type') as any,
                    title: getValue('title') as string,
                    description: getValue('description') as string,
                    keywords: getValue('keywords') ? JSON.parse(getValue('keywords') as string) : [],
                    apiVersion: getValue('api_version') as string,
                    priority
                },
                chunk: getValue('content') as string,
                score: relevanceScore,
                matchDensity,
                sectionTitle: getValue('section_title') as string,
                highlights: extractHighlights(getValue('content') as string, sanitizedQuery),
                detectedIntent: usedIntentFilter ? {
                    category: intent.category,
                    subcategory: intent.subcategory,
                    confidence: intent.confidence,
                    description: intentDescription
                } : undefined
            };
        });
        
        results.sort((a, b) => b.score - a.score);
        return results;
    };
    
    try {
        // Determine sample size based on filtering
        const isFiltered = effectiveCategory || effectiveSubcategory;
        const sampleSize = isFiltered ? Math.max(maxResults * 10, 100) : Math.max(maxResults * 50, 500);
        
        // First search: with intent-based or user-provided filters
        let results = executeSearch(effectiveCategory, effectiveSubcategory, sampleSize);
        
        // Fallback: if intent filter yielded too few results, try broader search
        if (usedIntentFilter && results.length < maxResults) {
            // Try category-only (drop subcategory)
            const categoryResults = executeSearch(effectiveCategory, undefined, sampleSize);
            if (categoryResults.length > results.length) {
                results = categoryResults;
            }
            
            // If still too few, try unfiltered
            if (results.length < maxResults) {
                const unfilteredResults = executeSearch(undefined, undefined, 500);
                if (unfilteredResults.length > results.length) {
                    results = unfilteredResults;
                }
            }
        }
        
        const topResults = results.slice(0, maxResults);
        searchCache.set(cacheKey, topResults);
        return topResults;
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Search error:", errorMessage);
        throw new Error(`Search failed: ${errorMessage}`);
    }
}

/**
 * Extract highlight snippets from content
 */
function extractHighlights(content: string, query: string): string[] {
    if (!content) return [];
    
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const highlights: string[] = [];
    const contentLower = content.toLowerCase();
    
    for (const word of words) {
        const index = contentLower.indexOf(word);
        if (index !== -1) {
            // Extract surrounding context (100 chars before and after)
            const start = Math.max(0, index - 100);
            const end = Math.min(content.length, index + word.length + 100);
            let snippet = content.substring(start, end);
            
            // Clean up snippet
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
            
            highlights.push(snippet);
            
            if (highlights.length >= 2) break;
        }
    }
    
    return highlights;
}

/**
 * Get document by filename
 */
export async function getDocumentByFileName(fileName: string): Promise<DocumentMetadata | null> {
    const db = await getDatabase();
    
    // Use prepared statement for parameterized query
    const stmt = db.prepare(`SELECT * FROM documents WHERE file_name LIKE ? OR file_name = ?`);
    stmt.bind([`%${fileName}%`, fileName]);
    
    const stmtColumns: string[] = stmt.getColumnNames();
    const stmtRows: any[][] = [];
    while (stmt.step()) {
        stmtRows.push(stmt.get());
    }
    stmt.free();
    
    if (stmtRows.length === 0) {
        return null;
    }
    
    const row = stmtRows[0];
    
    const getValue = (col: string) => {
        const idx = stmtColumns.indexOf(col);
        return idx >= 0 ? row[idx] : null;
    };
    
    return {
        id: getValue('id') as number,
        fileName: getValue('file_name') as string,
        filePath: getValue('file_path') as string,
        category: getValue('category') as DocCategory,
        subcategory: getValue('subcategory') as string,
        docType: getValue('doc_type') as any,
        title: getValue('title') as string,
        description: getValue('description') as string,
        keywords: getValue('keywords') ? JSON.parse(getValue('keywords') as string) : [],
        apiVersion: getValue('api_version') as string,
        lastUpdated: getValue('last_updated') as string,
        pageCount: getValue('page_count') as number,
        sizeBytes: getValue('size_bytes') as number,
        priority: getValue('priority') as number
    };
}

/**
 * Get document by ID
 */
export async function getDocumentById(id: number): Promise<DocumentMetadata | null> {
    const db = await getDatabase();
    
    // Use prepared statement for parameterized query
    const stmt = db.prepare(`SELECT * FROM documents WHERE id = ?`);
    stmt.bind([id]);
    
    const stmtColumns: string[] = stmt.getColumnNames();
    const stmtRows: any[][] = [];
    while (stmt.step()) {
        stmtRows.push(stmt.get());
    }
    stmt.free();
    
    if (stmtRows.length === 0) {
        return null;
    }
    
    const row = stmtRows[0];
    
    const getValue = (col: string) => {
        const idx = stmtColumns.indexOf(col);
        return idx >= 0 ? row[idx] : null;
    };
    
    return {
        id: getValue('id') as number,
        fileName: getValue('file_name') as string,
        filePath: getValue('file_path') as string,
        category: getValue('category') as DocCategory,
        subcategory: getValue('subcategory') as string,
        docType: getValue('doc_type') as any,
        title: getValue('title') as string,
        description: getValue('description') as string,
        keywords: getValue('keywords') ? JSON.parse(getValue('keywords') as string) : [],
        apiVersion: getValue('api_version') as string,
        lastUpdated: getValue('last_updated') as string,
        pageCount: getValue('page_count') as number,
        sizeBytes: getValue('size_bytes') as number,
        priority: getValue('priority') as number
    };
}

/**
 * Get document content (all chunks or specific section)
 */
export async function getDocumentContent(
    documentId: number,
    section?: string
): Promise<string> {
    const db = await getDatabase();
    
    // Build parameterized query
    const params: any[] = [documentId];
    let sql = `
        SELECT content, section_title
        FROM chunks
        WHERE document_id = ?
    `;
    
    if (section) {
        sql += ` AND section_title LIKE ?`;
        params.push(`%${section}%`);
    }
    
    sql += ` ORDER BY chunk_index`;
    
    // Use prepared statement for parameterized query
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const stmtColumns: string[] = stmt.getColumnNames();
    const stmtRows: any[][] = [];
    while (stmt.step()) {
        stmtRows.push(stmt.get());
    }
    stmt.free();
    
    if (stmtRows.length === 0) {
        return '';
    }
    
    return stmtRows.map(row => {
        const content = row[stmtColumns.indexOf('content')] as string;
        const sectionTitle = row[stmtColumns.indexOf('section_title')] as string;
        
        if (sectionTitle) {
            return `## ${sectionTitle}\n\n${content}`;
        }
        return content;
    }).join('\n\n');
}

/**
 * Get all categories with counts
 */
export async function getCategoryStats(): Promise<Array<{
    category: string;
    count: number;
    subcategories: Array<{ name: string; count: number }>;
}>> {
    const db = await getDatabase();
    
    const catResult = db.exec(`
        SELECT 
            category,
            COUNT(*) as count
        FROM documents
        GROUP BY category
        ORDER BY category
    `);
    
    if (catResult.length === 0) {
        return [];
    }
    
    const result = [];
    const catColumns = catResult[0].columns;
    
    for (const row of catResult[0].values) {
        const category = row[catColumns.indexOf('category')] as string;
        const count = row[catColumns.indexOf('count')] as number;
        
        // Use prepared statement for parameterized query
        const subStmt = db.prepare(`
            SELECT 
                subcategory as name,
                COUNT(*) as count
            FROM documents
            WHERE category = ?
            GROUP BY subcategory
            ORDER BY subcategory
        `);
        subStmt.bind([category]);
        
        const subRows: any[][] = [];
        while (subStmt.step()) {
            subRows.push(subStmt.get());
        }
        subStmt.free();
        
        const subResult = subRows.length > 0 ? [{ values: subRows }] : [];
        
        const subcategories = subResult.length > 0 
            ? subResult[0].values.map(subRow => ({
                name: subRow[0] as string,
                count: subRow[1] as number
            }))
            : [];
        
        result.push({
            category,
            count,
            subcategories
        });
    }
    
    return result;
}

/**
 * Get documents by category
 */
export async function getDocumentsByCategory(
    category: DocCategory,
    limit: number = 20
): Promise<DocumentMetadata[]> {
    const db = await getDatabase();
    
    // Use prepared statement for parameterized query
    const stmt = db.prepare(`
        SELECT * FROM documents
        WHERE category = ?
        ORDER BY priority DESC, title
        LIMIT ?
    `);
    stmt.bind([category, limit]);
    
    const stmtColumns: string[] = stmt.getColumnNames();
    const stmtRows: any[][] = [];
    while (stmt.step()) {
        stmtRows.push(stmt.get());
    }
    stmt.free();
    
    if (stmtRows.length === 0) {
        return [];
    }
    
    return stmtRows.map(row => {
        const getValue = (col: string) => {
            const idx = stmtColumns.indexOf(col);
            return idx >= 0 ? row[idx] : null;
        };
        
        return {
            id: getValue('id') as number,
            fileName: getValue('file_name') as string,
            filePath: getValue('file_path') as string,
            category: getValue('category') as DocCategory,
            subcategory: getValue('subcategory') as string,
            docType: getValue('doc_type') as any,
            title: getValue('title') as string,
            description: getValue('description') as string,
            keywords: getValue('keywords') ? JSON.parse(getValue('keywords') as string) : [],
            apiVersion: getValue('api_version') as string,
            lastUpdated: getValue('last_updated') as string,
            pageCount: getValue('page_count') as number,
            sizeBytes: getValue('size_bytes') as number,
            priority: getValue('priority') as number
        };
    });
}

/**
 * Document summary for LLM browsing
 */
export interface DocumentSummary {
    id: number;
    fileName: string;
    title: string;
    description: string;
    category: string;
    subcategory: string;
    keywords: string[];
}

/**
 * Get lightweight document summaries for LLM to browse
 * This enables the LLM to understand available documentation without reading full content
 */
export async function getDocumentSummaries(
    category?: DocCategory,
    limit: number = 20
): Promise<DocumentSummary[]> {
    const db = await getDatabase();
    
    let sql = `
        SELECT id, file_name, title, description, category, subcategory, keywords
        FROM documents
    `;
    
    const params: any[] = [];
    if (category) {
        sql += ` WHERE category = ?`;
        params.push(category);
    }
    
    sql += ` ORDER BY priority DESC, title LIMIT ?`;
    params.push(limit);
    
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const columns: string[] = stmt.getColumnNames();
    const rows: any[][] = [];
    while (stmt.step()) {
        rows.push(stmt.get());
    }
    stmt.free();
    
    return rows.map(row => {
        const getValue = (col: string) => {
            const idx = columns.indexOf(col);
            return idx >= 0 ? row[idx] : null;
        };
        
        return {
            id: getValue('id') as number,
            fileName: getValue('file_name') as string,
            title: (getValue('title') as string) || getValue('file_name') as string,
            description: (getValue('description') as string) || '',
            category: getValue('category') as string,
            subcategory: getValue('subcategory') as string || '',
            keywords: getValue('keywords') ? JSON.parse(getValue('keywords') as string) : []
        };
    });
}

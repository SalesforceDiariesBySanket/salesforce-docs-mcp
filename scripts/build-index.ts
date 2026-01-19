/**
 * Build Index Script
 * 
 * Parses all PDF files and builds the SQLite search index.
 * Uses LIKE-based queries for cross-platform compatibility (sql.js doesn't support FTS5).
 * Run once after downloading PDFs: npm run build-index
 */

/// <reference path="../src/types/sql.js.d.ts" />
/// <reference path="../src/types/pdf-parse.d.ts" />

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import initSqlJs, { Database } from "sql.js";
import pdfParse from "pdf-parse";

import { chunkText, cleanPdfText } from "../src/utils/chunker.js";
import { DocCategory, DocType } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const PDF_DIR = join(PROJECT_ROOT, "docs", "pdfs");
const RELEASE_NOTES_DIR = join(PROJECT_ROOT, "docs", "release-notes");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DB_PATH = join(DATA_DIR, "salesforce-docs.db");

// Document mapping based on filename patterns
const DOCUMENT_PATTERNS: Array<{
    pattern: RegExp;
    category: DocCategory;
    subcategory: string;
    docType: DocType;
    priority: number;
    keywords: string[];
}> = [
    { pattern: /apex/i, category: DocCategory.CORE_PLATFORM, subcategory: "apex", docType: DocType.DEVELOPER_GUIDE, priority: 9, keywords: ["apex", "class", "trigger", "dml"] },
    { pattern: /lwc|lightning/i, category: DocCategory.CORE_PLATFORM, subcategory: "lightning", docType: DocType.DEVELOPER_GUIDE, priority: 9, keywords: ["lwc", "lightning", "component", "aura"] },
    { pattern: /visualforce|pages_dev/i, category: DocCategory.CORE_PLATFORM, subcategory: "visualforce", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["visualforce", "page", "controller"] },
    { pattern: /soql|sosl|query/i, category: DocCategory.CORE_PLATFORM, subcategory: "soql_sosl", docType: DocType.DEVELOPER_GUIDE, priority: 9, keywords: ["soql", "sosl", "query", "search"] },
    { pattern: /formula|validation/i, category: DocCategory.CORE_PLATFORM, subcategory: "formulas", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["formula", "validation"] },
    { pattern: /api_rest|rest_api/i, category: DocCategory.APIS, subcategory: "rest_api", docType: DocType.API_REFERENCE, priority: 10, keywords: ["rest", "api", "http", "endpoint"] },
    { pattern: /bulk/i, category: DocCategory.APIS, subcategory: "bulk_api", docType: DocType.API_REFERENCE, priority: 8, keywords: ["bulk", "api", "data loading"] },
    { pattern: /meta/i, category: DocCategory.APIS, subcategory: "metadata_api", docType: DocType.API_REFERENCE, priority: 9, keywords: ["metadata", "deploy", "retrieve"] },
    { pattern: /tooling/i, category: DocCategory.APIS, subcategory: "tooling_api", docType: DocType.API_REFERENCE, priority: 8, keywords: ["tooling", "api", "development"] },
    { pattern: /streaming|platform_events|change_data/i, category: DocCategory.APIS, subcategory: "streaming_api", docType: DocType.API_REFERENCE, priority: 8, keywords: ["streaming", "events", "cdc"] },
    { pattern: /^api\.|sforce_api|soap/i, category: DocCategory.APIS, subcategory: "soap_api", docType: DocType.API_REFERENCE, priority: 7, keywords: ["soap", "api", "wsdl"] },
    { pattern: /chatter/i, category: DocCategory.APIS, subcategory: "chatter_api", docType: DocType.API_REFERENCE, priority: 6, keywords: ["chatter", "social", "feed"] },
    { pattern: /analytics|bi_dev/i, category: DocCategory.APIS, subcategory: "analytics_api", docType: DocType.API_REFERENCE, priority: 7, keywords: ["analytics", "tableau", "reports"] },
    { pattern: /sfdx|sf_cli/i, category: DocCategory.DEV_TOOLS, subcategory: "sfdx_cli", docType: DocType.DEVELOPER_GUIDE, priority: 9, keywords: ["sfdx", "cli", "scratch org", "deploy"] },
    { pattern: /pkg|package|isv/i, category: DocCategory.DEV_TOOLS, subcategory: "packaging", docType: DocType.DEVELOPER_GUIDE, priority: 8, keywords: ["package", "2gp", "1gp", "managed"] },
    { pattern: /devops|migration/i, category: DocCategory.DEV_TOOLS, subcategory: "devops", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["devops", "ci/cd", "pipeline"] },
    { pattern: /mobile|sdk/i, category: DocCategory.DEV_TOOLS, subcategory: "mobile_sdk", docType: DocType.DEVELOPER_GUIDE, priority: 6, keywords: ["mobile", "sdk", "ios", "android"] },
    { pattern: /sales_|cpq/i, category: DocCategory.CLOUDS, subcategory: "sales_cloud", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["sales", "opportunity", "cpq", "quote"] },
    { pattern: /service_|case|chat|voice|field_service|knowledge/i, category: DocCategory.CLOUDS, subcategory: "service_cloud", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["service", "case", "knowledge", "chat"] },
    { pattern: /communities|experience|exp_cloud/i, category: DocCategory.CLOUDS, subcategory: "experience_cloud", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["community", "experience", "portal", "site"] },
    { pattern: /marketing|buddymedia|radian/i, category: DocCategory.CLOUDS, subcategory: "marketing_cloud", docType: DocType.DEVELOPER_GUIDE, priority: 5, keywords: ["marketing", "campaign", "email"] },
    { pattern: /health|fsc|insurance|automotive|edu_cloud|nonprofit|life_sciences|media|retail|mfg/i, category: DocCategory.CLOUDS, subcategory: "industry_clouds", docType: DocType.DEVELOPER_GUIDE, priority: 6, keywords: ["industry", "vertical"] },
    { pattern: /security|identity|secure_coding|restriction|access/i, category: DocCategory.SECURITY, subcategory: "security", docType: DocType.IMPLEMENTATION_GUIDE, priority: 8, keywords: ["security", "authentication", "authorization", "sharing"] },
    { pattern: /integration|canvas|federated|connect/i, category: DocCategory.INTEGRATION, subcategory: "integration", docType: DocType.DEVELOPER_GUIDE, priority: 7, keywords: ["integration", "external", "connect"] },
    { pattern: /limits|large_data|bp|best_practice/i, category: DocCategory.BEST_PRACTICES, subcategory: "limits", docType: DocType.DEVELOPER_GUIDE, priority: 8, keywords: ["limits", "governor", "performance"] },
    { pattern: /cheatsheet|static_sf/i, category: DocCategory.BEST_PRACTICES, subcategory: "cheatsheets", docType: DocType.CHEATSHEET, priority: 8, keywords: ["cheatsheet", "quick reference"] },
    { pattern: /workbook/i, category: DocCategory.BEST_PRACTICES, subcategory: "workbooks", docType: DocType.WORKBOOK, priority: 7, keywords: ["workbook", "tutorial", "hands-on"] },
    { pattern: /release/i, category: DocCategory.RELEASE_NOTES, subcategory: "release_notes", docType: DocType.RELEASE_NOTES, priority: 6, keywords: ["release", "new feature", "what's new"] },
    { pattern: /object|data|field/i, category: DocCategory.CORE_PLATFORM, subcategory: "data_model", docType: DocType.DEVELOPER_GUIDE, priority: 8, keywords: ["object", "field", "relationship", "data model"] }
];

function categorizeDocument(fileName: string) {
    for (const pattern of DOCUMENT_PATTERNS) {
        if (pattern.pattern.test(fileName)) {
            return pattern;
        }
    }
    return {
        category: DocCategory.CORE_PLATFORM,
        subcategory: "general",
        docType: DocType.DEVELOPER_GUIDE,
        priority: 5,
        keywords: [] as string[]
    };
}

function generateTitle(fileName: string): string {
    return fileName
        .replace(/\.pdf$/i, '')
        .replace(/salesforce_/gi, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

async function processPdf(db: Database, filePath: string): Promise<boolean> {
    const fileName = basename(filePath);
    
    try {
        const buffer = readFileSync(filePath);
        const stats = statSync(filePath);
        const data = await pdfParse(buffer);
        const text = cleanPdfText(data.text);
        
        if (!text || text.length < 100) {
            console.log(`  Skipping ${fileName}: No text content`);
            return false;
        }
        
        const { category, subcategory, docType, priority, keywords } = categorizeDocument(fileName);
        const title = generateTitle(fileName);
        
        db.run(`
            INSERT INTO documents 
            (file_name, file_path, category, subcategory, doc_type, title, keywords, page_count, size_bytes, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [fileName, filePath, category, subcategory, docType, title, JSON.stringify(keywords), data.numpages || 0, stats.size, priority]);
        
        const result = db.exec("SELECT last_insert_rowid() as id");
        const documentId = result[0].values[0][0] as number;
        
        const chunks = chunkText(text, { maxChunkSize: 1500, overlapSize: 150 });
        
        for (const chunk of chunks) {
            if (chunk.content.length > 50) {
                db.run(`
                    INSERT INTO chunks (document_id, chunk_index, content, content_lower, section_title)
                    VALUES (?, ?, ?, ?, ?)
                `, [documentId, chunk.index, chunk.content, chunk.content.toLowerCase(), chunk.sectionTitle || null]);
            }
        }
        
        console.log(`  ✓ ${fileName}: ${chunks.length} chunks`);
        return true;
    } catch (error) {
        console.log(`  ✗ ${fileName}: ${error}`);
        return false;
    }
}

function findPdfs(dir: string): string[] {
    const pdfs: string[] = [];
    if (!existsSync(dir)) return pdfs;
    
    for (const file of readdirSync(dir)) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
            pdfs.push(...findPdfs(filePath));
        } else if (file.toLowerCase().endsWith('.pdf')) {
            pdfs.push(filePath);
        }
    }
    return pdfs;
}

async function buildIndex(): Promise<void> {
    console.log("=".repeat(60));
    console.log("Salesforce Documentation Index Builder");
    console.log("=".repeat(60));
    
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (existsSync(DB_PATH)) {
        console.log("Removing existing database...");
        unlinkSync(DB_PATH);
    }
    
    console.log("Initializing SQL.js...");
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    console.log("Creating schema...");
    
    db.run(`CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        doc_type TEXT NOT NULL DEFAULT 'developer_guide',
        title TEXT NOT NULL,
        description TEXT,
        keywords TEXT,
        api_version TEXT,
        last_updated TEXT,
        page_count INTEGER,
        size_bytes INTEGER,
        priority INTEGER DEFAULT 5
    )`);
    
    db.run(`CREATE TABLE chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_lower TEXT NOT NULL,
        section_title TEXT,
        page_number INTEGER,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        UNIQUE(document_id, chunk_index)
    )`);
    
    // Note: sql.js doesn't support FTS5, so we use content_lower with LIKE queries
    
    db.run(`CREATE INDEX idx_documents_category ON documents(category)`);
    db.run(`CREATE INDEX idx_documents_subcategory ON documents(subcategory)`);
    db.run(`CREATE INDEX idx_documents_priority ON documents(priority DESC)`);
    db.run(`CREATE INDEX idx_chunks_document_id ON chunks(document_id)`);
    
    console.log("\nScanning for PDFs...");
    const pdfPaths = [...findPdfs(PDF_DIR), ...findPdfs(RELEASE_NOTES_DIR)];
    console.log(`Found ${pdfPaths.length} PDF files`);
    
    console.log("\nProcessing PDFs...");
    let successCount = 0;
    let failCount = 0;
    
    for (const pdfPath of pdfPaths) {
        if (await processPdf(db, pdfPath)) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    const docResult = db.exec("SELECT COUNT(*) FROM documents");
    const chunkResult = db.exec("SELECT COUNT(*) FROM chunks");
    const docCount = docResult[0]?.values[0]?.[0] || 0;
    const chunkCount = chunkResult[0]?.values[0]?.[0] || 0;
    
    console.log("\nSaving database...");
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
    
    console.log("\n" + "=".repeat(60));
    console.log("Index Build Complete!");
    console.log("=".repeat(60));
    console.log(`Documents indexed: ${successCount}`);
    console.log(`Documents failed: ${failCount}`);
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Database size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Database path: ${DB_PATH}`);
    
    db.close();
    console.log("Done!");
}

buildIndex().catch(console.error);

/**
 * Database initialization and connection management
 * Uses sql.js (pure JavaScript SQLite) for cross-platform compatibility
 */

// @ts-ignore - sql.js doesn't have types
import initSqlJs from "sql.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - relative to project root
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DB_PATH = join(DATA_DIR, "salesforce-docs.db");

let db: any = null;
let SQL: any = null;

/**
 * Initialize SQL.js
 */
async function initSql(): Promise<any> {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    return SQL;
}

/**
 * Get or create database connection
 */
export async function getDatabase(): Promise<any> {
    if (!db) {
        const sqljs = await initSql();
        
        // Ensure data directory exists
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }

        // Load existing database or create new one
        if (existsSync(DB_PATH)) {
            const buffer = readFileSync(DB_PATH);
            db = new sqljs.Database(buffer);
        } else {
            db = new sqljs.Database();
        }
    }
    return db;
}

/**
 * Save database to disk
 */
function saveDatabase(): void {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(DB_PATH, buffer);
    }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
    const db = await getDatabase();

    // Check if database is already initialized
    const result = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='documents'
    `);

    if (result.length > 0 && result[0].values.length > 0) {
        console.error("Database already initialized");
        return;
    }

    console.error("Initializing database schema...");

    // Create main documents table
    db.run(`
        CREATE TABLE IF NOT EXISTS documents (
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
            priority INTEGER DEFAULT 5 CHECK(priority >= 1 AND priority <= 10)
        )
    `);

    // Create document chunks table
    db.run(`
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            content_lower TEXT NOT NULL,
            section_title TEXT,
            page_number INTEGER,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            UNIQUE(document_id, chunk_index)
        )
    `);

    // Note: sql.js doesn't support FTS5, so we use content_lower column with LIKE queries
    // and SQLite's built-in text functions for searching

    // Create indexes for common queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_subcategory ON documents(subcategory)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id)`);

    // Save to disk
    saveDatabase();
    
    console.error("Database schema initialized successfully");
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
}

/**
 * Get database path
 */
export function getDatabasePath(): string {
    return DB_PATH;
}

/**
 * Check if database has been indexed
 */
export async function isDatabaseIndexed(): Promise<boolean> {
    try {
        const db = await getDatabase();
        const result = db.exec("SELECT COUNT(*) as count FROM documents");
        if (result.length > 0 && result[0].values.length > 0) {
            return (result[0].values[0][0] as number) > 0;
        }
        return false;
    } catch {
        return false;
    }
}

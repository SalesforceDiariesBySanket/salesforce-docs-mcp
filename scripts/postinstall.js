/**
 * Post-install script
 * Checks if database exists, provides instructions if not
 */

import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'salesforce-docs.db');

console.log('\n📚 Salesforce Docs MCP Server');
console.log('='.repeat(40));

if (existsSync(DB_PATH)) {
    const stats = statSync(DB_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Database found (${sizeMB} MB)`);
    console.log('\nServer is ready to use!');
} else {
    console.log('⚠️  Database not found');
    console.log('\nTo complete setup:');
    console.log('1. Ensure PDFs are in docs/pdfs/');
    console.log('2. Run: npm run build-index');
    console.log('\nThis will parse all PDFs and create the search index.');
}

console.log('\nTo configure VS Code, add to your mcp.json:');
console.log(JSON.stringify({
    "servers": {
        "salesforce-docs": {
            "type": "stdio",
            "command": "node",
            "args": [join(__dirname, '..', 'dist', 'index.js')]
        }
    }
}, null, 2));

console.log('');

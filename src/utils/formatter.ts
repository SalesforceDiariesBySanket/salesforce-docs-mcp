/**
 * Search result and document formatter
 */

import { SearchResult, DocumentMetadata, CATEGORY_LABELS, DocCategory } from "../types.js";

/**
 * Format search results for display
 */
export function formatSearchResults(results: SearchResult[], query: string): string {
    if (results.length === 0) {
        return `No results found for: "${query}"

Try:
- Using different keywords
- Removing specific terms
- Checking for typos
- Using the list_doc_categories tool to see available documentation`;
    }

    const lines: string[] = [
        `## Search Results for: "${query}"`,
        `Found ${results.length} relevant result(s)`
    ];
    
    // Show detected intent if available (only on first result since it's the same for all)
    const intent = results[0]?.detectedIntent;
    if (intent) {
        lines.push(`**🎯 Detected Topic:** ${intent.description}`);
    }
    lines.push("");

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const { document, chunk, score, sectionTitle, matchDensity } = result;
        
        lines.push(`### ${i + 1}. ${document.title}`);
        lines.push(`**Document ID:** ${document.id}`);
        lines.push(`**Source:** ${document.fileName}`);
        lines.push(`**Category:** ${CATEGORY_LABELS[document.category as DocCategory] || document.category}`);
        
        if (sectionTitle) {
            lines.push(`**Section:** ${sectionTitle}`);
        }
        
        if (document.subcategory) {
            lines.push(`**Subcategory:** ${document.subcategory}`);
        }
        
        // Show relevance as percentage based on match density if available
        const relevancePercent = matchDensity !== undefined 
            ? Math.round(matchDensity * 100) 
            : Math.min(Math.round(score * 10), 100);
        lines.push(`**Relevance:** ${relevancePercent}%`);
        lines.push("");
        
        // Add content snippet (truncated to reasonable length)
        const snippetLength = 1000;
        let snippet = chunk.trim();
        const wasTruncated = snippet.length > snippetLength;
        if (wasTruncated) {
            snippet = snippet.substring(0, snippetLength) + "...";
        }
        
        lines.push("```");
        lines.push(snippet);
        lines.push("```");
        
        // Add truncation notice with document ID for follow-up
        if (wasTruncated) {
            lines.push(`\n> 📄 *Content truncated. Use \`get_document\` with documentId: ${document.id} to see full content.*`);
        }
        lines.push("");
        
        // Add separator between results
        if (i < results.length - 1) {
            lines.push("---");
            lines.push("");
        }
    }

    // Add tips at the bottom
    lines.push("");
    lines.push("---");
    lines.push("**Tips:**");
    lines.push("- Use `get_document` to see more content from a specific document");
    lines.push("- Use `get_api_reference` for API-specific queries");
    lines.push("- Use `get_code_example` for code snippets");

    return lines.join("\n");
}

/**
 * Format a single document for display
 */
export function formatDocument(doc: DocumentMetadata, content: string): string {
    const lines: string[] = [
        `# ${doc.title}`,
        "",
        `**File:** ${doc.fileName}`,
        `**Category:** ${CATEGORY_LABELS[doc.category as DocCategory] || doc.category}`,
    ];

    if (doc.subcategory) {
        lines.push(`**Subcategory:** ${doc.subcategory}`);
    }

    if (doc.description) {
        lines.push(`**Description:** ${doc.description}`);
    }

    if (doc.keywords && doc.keywords.length > 0) {
        lines.push(`**Keywords:** ${doc.keywords.join(", ")}`);
    }

    if (doc.apiVersion) {
        lines.push(`**API Version:** ${doc.apiVersion}`);
    }

    if (doc.pageCount) {
        lines.push(`**Pages:** ${doc.pageCount}`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");

    // Add content
    const maxContentLength = 5000;
    if (content.length > maxContentLength) {
        lines.push(content.substring(0, maxContentLength));
        lines.push("");
        lines.push("...[Content truncated. Use section parameter to get specific sections]...");
    } else {
        lines.push(content);
    }

    return lines.join("\n");
}

/**
 * Format category list for display
 */
export function formatCategories(categories: Array<{ category: string; count: number }>): string {
    const lines: string[] = [
        "# Salesforce Documentation Categories",
        "",
        "Available documentation organized by category:",
        ""
    ];

    const categoryDescriptions: Record<string, string> = {
        "core_platform": "Core development: Apex, Lightning Web Components, Visualforce, SOQL/SOSL, Formulas",
        "apis": "Salesforce APIs: REST, SOAP, Metadata, Bulk, Tooling, Streaming, and more",
        "dev_tools": "Development tools: Salesforce CLI, VS Code, Packaging (1GP/2GP), DevOps",
        "clouds": "Cloud products: Sales, Service, Experience, Marketing, Analytics, Industry Clouds",
        "security": "Security & Identity: Authentication, Authorization, Sharing, Secure Coding",
        "integration": "Integration: Patterns, Connectors, Canvas, Federated Search",
        "best_practices": "Best Practices: Large Data Volumes, Governor Limits, Performance",
        "release_notes": "Release Notes: Feature updates from Winter '15 to present"
    };

    for (const cat of categories) {
        const label = CATEGORY_LABELS[cat.category as DocCategory] || cat.category;
        const description = categoryDescriptions[cat.category] || "";
        
        lines.push(`## ${label}`);
        lines.push(`**${cat.count} documents**`);
        if (description) {
            lines.push(`${description}`);
        }
        lines.push("");
    }

    lines.push("---");
    lines.push("");
    lines.push("Use `search_salesforce_docs` with the `category` parameter to filter results.");
    lines.push("Example: Search for 'trigger' in 'core_platform' category");

    return lines.join("\n");
}

/**
 * Format code examples for display
 */
export function formatCodeExamples(results: SearchResult[], topic: string, language: string): string {
    if (results.length === 0) {
        return `No code examples found for: "${topic}" in ${language}

Try:
- Using more general terms
- Searching without language filter
- Using search_salesforce_docs for broader results`;
    }

    const lines: string[] = [
        `## Code Examples: ${topic}`,
        `**Language:** ${language}`,
        ""
    ];

    for (const result of results) {
        const { document, chunk, sectionTitle } = result;
        
        lines.push(`### From: ${document.title}`);
        if (sectionTitle) {
            lines.push(`**Section:** ${sectionTitle}`);
        }
        lines.push("");
        
        // Extract code blocks if present, otherwise show content
        const codeBlocks = extractCodeBlocks(chunk, language);
        if (codeBlocks.length > 0) {
            for (const code of codeBlocks) {
                lines.push("```" + language);
                lines.push(code);
                lines.push("```");
                lines.push("");
            }
        } else {
            // Show relevant content that might contain inline code
            lines.push("```");
            lines.push(chunk.substring(0, 1500));
            lines.push("```");
            lines.push("");
        }
        
        lines.push("---");
        lines.push("");
    }

    return lines.join("\n");
}

/**
 * Extract code blocks from content
 */
function extractCodeBlocks(content: string, language: string): string[] {
    const blocks: string[] = [];
    
    // Look for markdown code blocks
    const codeBlockRegex = /```(?:apex|java|javascript|js|soql|html|xml|json)?\n([\s\S]*?)```/gi;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        blocks.push(match[1].trim());
    }
    
    // If no markdown blocks, look for indented code
    if (blocks.length === 0) {
        const lines = content.split('\n');
        let inCodeBlock = false;
        let currentBlock: string[] = [];
        
        for (const line of lines) {
            // Detect code by indentation or common patterns
            const isCodeLine = line.startsWith('    ') || 
                              line.startsWith('\t') ||
                              /^(public|private|global|class|trigger|function|const|let|var|SELECT|INSERT|UPDATE)\b/.test(line.trim());
            
            if (isCodeLine) {
                inCodeBlock = true;
                currentBlock.push(line);
            } else if (inCodeBlock && line.trim() === '') {
                currentBlock.push(line);
            } else if (inCodeBlock) {
                if (currentBlock.length > 2) {
                    blocks.push(currentBlock.join('\n').trim());
                }
                currentBlock = [];
                inCodeBlock = false;
            }
        }
        
        if (currentBlock.length > 2) {
            blocks.push(currentBlock.join('\n').trim());
        }
    }
    
    return blocks;
}

// ============ SEMANTIC SEARCH FORMATTERS ============

import { QueryExpansion } from "./intent.js";
import { DocumentSummary } from "../db/queries.js";

/**
 * Format query expansion results for LLM consumption
 */
export function formatQueryExpansion(originalQuery: string, expansion: QueryExpansion): string {
    const lines: string[] = [
        `## 🧠 Query Expansion Analysis`,
        ``,
        `**Original Query:** "${originalQuery}"`,
        `**Confidence:** ${expansion.confidence}`,
        ``
    ];

    if (expansion.detectedConcepts.length > 0) {
        lines.push(`### Detected Concepts`);
        lines.push(expansion.detectedConcepts.map(c => `- ${c}`).join('\n'));
        lines.push(``);
    }

    lines.push(`### Expanded Search Terms`);
    lines.push(`Use these terms with \`semantic_search_docs\` or \`search_salesforce_docs\` for better results:`);
    lines.push(``);
    lines.push('```json');
    lines.push(JSON.stringify(expansion.expandedTerms, null, 2));
    lines.push('```');
    lines.push(``);

    if (expansion.suggestedCategory) {
        lines.push(`### Suggested Category Filter`);
        lines.push(`\`${expansion.suggestedCategory}\``);
        lines.push(``);
    }

    lines.push(`### Reasoning`);
    lines.push(expansion.reasoning);
    lines.push(``);
    
    lines.push(`---`);
    lines.push(`**Next Step:** Call \`semantic_search_docs\` with:`);
    lines.push('```json');
    lines.push(JSON.stringify({
        query: originalQuery,
        expandedTerms: expansion.expandedTerms.slice(0, 10),
        category: expansion.suggestedCategory
    }, null, 2));
    lines.push('```');

    return lines.join('\n');
}

/**
 * Format document summaries for LLM browsing
 */
export function formatDocumentSummaries(summaries: DocumentSummary[]): string {
    if (summaries.length === 0) {
        return `No documents found in the specified category.`;
    }

    const lines: string[] = [
        `## 📚 Document Catalog`,
        `Found ${summaries.length} documents`,
        ``
    ];

    // Group by category
    const byCategory = new Map<string, DocumentSummary[]>();
    for (const doc of summaries) {
        const cat = doc.category || 'uncategorized';
        if (!byCategory.has(cat)) {
            byCategory.set(cat, []);
        }
        byCategory.get(cat)!.push(doc);
    }

    for (const [category, docs] of byCategory) {
        const categoryLabel = CATEGORY_LABELS[category as DocCategory] || category;
        lines.push(`### ${categoryLabel}`);
        lines.push(``);

        for (const doc of docs) {
            lines.push(`**${doc.title}** (ID: ${doc.id})`);
            lines.push(`  - File: \`${doc.fileName}\``);
            if (doc.description) {
                const shortDesc = doc.description.length > 150 
                    ? doc.description.substring(0, 150) + '...'
                    : doc.description;
                lines.push(`  - ${shortDesc}`);
            }
            if (doc.keywords && doc.keywords.length > 0) {
                lines.push(`  - Keywords: ${doc.keywords.slice(0, 5).join(', ')}`);
            }
            lines.push(``);
        }
    }

    lines.push(`---`);
    lines.push(`**Usage:**`);
    lines.push(`- Use \`get_document\` with a documentId to read full content`);
    lines.push(`- Use \`search_salesforce_docs\` to search within these documents`);

    return lines.join('\n');
}

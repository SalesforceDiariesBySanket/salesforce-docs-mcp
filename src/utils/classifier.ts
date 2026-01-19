/**
 * Intent classification and keyword extraction
 */

import { DocCategory } from "../types.js";

// Intent keywords mapping
const INTENT_KEYWORDS: Record<string, { 
    keywords: string[]; 
    category?: DocCategory;
}> = {
    "api_reference": {
        keywords: ["REST API", "SOAP API", "endpoint", "HTTP", "request", "response", "POST", "GET", "PUT", "PATCH", "DELETE", "Bulk API", "Tooling API", "Metadata API"],
        category: DocCategory.APIS
    },
    "apex_code": {
        keywords: ["trigger", "class", "Apex", "DML", "batch", "queueable", "schedulable", "future", "test class", "test method", "assert", "System."],
        category: DocCategory.CORE_PLATFORM
    },
    "lightning": {
        keywords: ["LWC", "Lightning", "Aura", "component", "wire", "track", "@api", "@wire", "lightning-", "slds", "lightning web component"],
        category: DocCategory.CORE_PLATFORM
    },
    "soql_sosl": {
        keywords: ["SELECT", "FROM", "WHERE", "SOQL", "SOSL", "FIND", "query", "aggregate", "GROUP BY", "ORDER BY", "LIMIT", "OFFSET"],
        category: DocCategory.CORE_PLATFORM
    },
    "release_notes": {
        keywords: ["new feature", "release", "what's new", "winter", "summer", "spring", "fall", "deprecated", "retirement", "announcement"],
        category: DocCategory.RELEASE_NOTES
    },
    "security": {
        keywords: ["permission", "sharing", "profile", "authentication", "OAuth", "SAML", "SSO", "connected app", "scope", "token", "security", "FLS", "CRUD"],
        category: DocCategory.SECURITY
    },
    "integration": {
        keywords: ["connect", "integrate", "callout", "webhook", "sync", "canvas", "external service", "named credential", "outbound message"],
        category: DocCategory.INTEGRATION
    },
    "sfdx": {
        keywords: ["sfdx", "sf ", "CLI", "scratch org", "source push", "source pull", "deploy", "retrieve", "package version"],
        category: DocCategory.DEV_TOOLS
    },
    "code_example": {
        keywords: ["example", "sample", "how to", "code snippet", "tutorial", "implement", "create", "build"]
    },
    "limits": {
        keywords: ["limit", "governor", "maximum", "quota", "daily limit", "heap size", "CPU time", "SOQL queries"],
        category: DocCategory.BEST_PRACTICES
    },
    "visualforce": {
        keywords: ["Visualforce", "apex:page", "apex:form", "controller", "standard controller", "extension", "VF page"],
        category: DocCategory.CORE_PLATFORM
    },
    "formulas": {
        keywords: ["formula", "validation rule", "CASE", "IF", "ISBLANK", "TEXT", "DATE", "NOW", "TODAY"],
        category: DocCategory.CORE_PLATFORM
    }
};

// Common Salesforce terms to recognize
const SALESFORCE_TERMS = [
    "Account", "Contact", "Lead", "Opportunity", "Case", "Task", "Event",
    "User", "Profile", "PermissionSet", "Role", "Group", "Queue",
    "Workflow", "Flow", "Process Builder", "Approval Process",
    "Report", "Dashboard", "ListView", "FieldSet",
    "Custom Object", "Custom Field", "Custom Metadata",
    "Platform Event", "Change Data Capture", "Big Object",
    "External Object", "External Data Source"
];

/**
 * Classify the intent of a search query
 */
export function classifyIntent(query: string): string {
    const queryLower = query.toLowerCase();
    let bestMatch = "general";
    let maxScore = 0;
    
    for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
        let score = 0;
        for (const keyword of config.keywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
                // Longer keyword matches are worth more
                score += keyword.split(' ').length;
            }
        }
        
        if (score > maxScore) {
            maxScore = score;
            bestMatch = intent;
        }
    }
    
    return bestMatch;
}

/**
 * Get suggested category based on intent
 */
export function getSuggestedCategory(intent: string): DocCategory | undefined {
    return INTENT_KEYWORDS[intent]?.category;
}

/**
 * Extract keywords from a query for better search
 */
export function extractKeywords(query: string): string[] {
    const words = query.split(/\s+/);
    const keywords: string[] = [];
    
    // Single-word keywords
    for (const word of words) {
        const cleanWord = word.replace(/[^a-zA-Z0-9_]/g, '');
        if (cleanWord.length >= 3) {
            keywords.push(cleanWord.toLowerCase());
        }
    }
    
    // Check for multi-word Salesforce terms
    const queryLower = query.toLowerCase();
    for (const term of SALESFORCE_TERMS) {
        if (queryLower.includes(term.toLowerCase())) {
            keywords.push(term.toLowerCase());
        }
    }
    
    // Check for intent keywords
    for (const config of Object.values(INTENT_KEYWORDS)) {
        for (const keyword of config.keywords) {
            if (queryLower.includes(keyword.toLowerCase()) && keyword.includes(' ')) {
                keywords.push(keyword.toLowerCase());
            }
        }
    }
    
    // Remove duplicates
    return [...new Set(keywords)];
}

/**
 * Expand query with synonyms and related terms
 */
export function expandQuery(query: string): string[] {
    const expansions: string[] = [query];
    const queryLower = query.toLowerCase();
    
    // Synonym mappings
    const synonyms: Record<string, string[]> = {
        "lwc": ["lightning web component", "lightning web components"],
        "lightning web component": ["lwc"],
        "vf": ["visualforce"],
        "visualforce": ["vf"],
        "trigger": ["apex trigger", "before trigger", "after trigger"],
        "rest api": ["rest", "restful api", "http api"],
        "bulk api": ["bulk api 2.0", "bulk api 2", "data loader"],
        "metadata api": ["mdapi", "metadata"],
        "soql": ["salesforce query", "object query"],
        "sosl": ["salesforce search", "find"],
        "oauth": ["oauth2", "oauth 2.0", "connected app"],
        "sso": ["single sign-on", "single sign on", "saml"],
        "2gp": ["second generation package", "2nd generation package"],
        "1gp": ["first generation package", "managed package"],
        "fls": ["field level security", "field-level security"],
        "crud": ["create read update delete"],
        "governor limit": ["limit", "governor limits", "limits"]
    };
    
    for (const [term, syns] of Object.entries(synonyms)) {
        if (queryLower.includes(term)) {
            for (const syn of syns) {
                expansions.push(query.replace(new RegExp(term, 'gi'), syn));
            }
        }
    }
    
    return [...new Set(expansions)];
}

/**
 * Score a document's relevance based on keywords
 */
export function scoreKeywordMatch(
    documentKeywords: string[], 
    queryKeywords: string[]
): number {
    if (queryKeywords.length === 0 || documentKeywords.length === 0) {
        return 0;
    }
    
    let matches = 0;
    const docKeywordsLower = documentKeywords.map(k => k.toLowerCase());
    
    for (const qk of queryKeywords) {
        for (const dk of docKeywordsLower) {
            if (dk.includes(qk) || qk.includes(dk)) {
                matches++;
                break;
            }
        }
    }
    
    return matches / queryKeywords.length;
}

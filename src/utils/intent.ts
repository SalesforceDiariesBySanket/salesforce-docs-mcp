/**
 * Intent detection and query expansion for Salesforce documentation search
 * Uses keyword pattern matching to detect user intent and expand queries
 */

import { DocCategory } from "../types.js";

// ============ TYPES ============

export interface DetectedIntent {
    category?: string;
    subcategory?: string;
    confidence: 'high' | 'medium' | 'low';
    matchedPatterns: string[];
    totalWeight: number;
}

export interface QueryExpansion {
    expandedTerms: string[];
    detectedConcepts: string[];
    suggestedCategory?: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
}

// ============ PATTERN DEFINITIONS ============

interface IntentPattern {
    keywords: string[];
    category: string;
    subcategory: string;
    weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
    // Core Platform - Apex
    { keywords: ['apex', 'trigger', 'class', 'soql in apex'], category: 'core_platform', subcategory: 'apex', weight: 10 },
    { keywords: ['batch apex', 'queueable', 'schedulable', 'future method'], category: 'core_platform', subcategory: 'apex', weight: 12 },
    { keywords: ['apex test', 'test class', 'testmethod', 'test.starttest'], category: 'core_platform', subcategory: 'apex', weight: 10 },
    { keywords: ['apex governor', 'limits', 'governor limits'], category: 'core_platform', subcategory: 'apex', weight: 10 },
    
    // Core Platform - LWC
    { keywords: ['lwc', 'lightning web component', 'web component'], category: 'core_platform', subcategory: 'lightning', weight: 10 },
    { keywords: ['@wire', '@api', '@track', 'lightning-'], category: 'core_platform', subcategory: 'lightning', weight: 10 },
    { keywords: ['lwc lifecycle', 'connectedcallback', 'renderedcallback'], category: 'core_platform', subcategory: 'lightning', weight: 12 },
    
    // Core Platform - Aura
    { keywords: ['aura', 'aura component', 'lightning component', 'component bundle'], category: 'core_platform', subcategory: 'lightning', weight: 8 },
    
    // Core Platform - Visualforce
    { keywords: ['visualforce', 'apex:page', 'apex:form', 'vf page'], category: 'core_platform', subcategory: 'visualforce', weight: 10 },
    
    // Core Platform - SOQL/SOSL
    { keywords: ['soql', 'select from', 'where clause', 'relationship query'], category: 'core_platform', subcategory: 'soql_sosl', weight: 10 },
    { keywords: ['sosl', 'find', 'search query'], category: 'core_platform', subcategory: 'soql_sosl', weight: 10 },
    
    // Core Platform - Formulas
    { keywords: ['formula', 'formula field', 'validation rule', 'workflow rule'], category: 'core_platform', subcategory: 'formulas', weight: 8 },
    
    // APIs - REST
    { keywords: ['rest api', 'restful', '/services/data/', 'sobject'], category: 'apis', subcategory: 'rest_api', weight: 10 },
    { keywords: ['composite api', 'composite request', 'batch request'], category: 'apis', subcategory: 'rest_api', weight: 12 },
    
    // APIs - SOAP
    { keywords: ['soap api', 'enterprise wsdl', 'partner wsdl'], category: 'apis', subcategory: 'soap_api', weight: 10 },
    
    // APIs - Metadata
    { keywords: ['metadata api', 'deploy', 'retrieve', 'package.xml'], category: 'apis', subcategory: 'metadata_api', weight: 10 },
    
    // APIs - Bulk
    { keywords: ['bulk api', 'bulk 2.0', 'bulk data', 'data loader'], category: 'apis', subcategory: 'bulk_api', weight: 10 },
    
    // APIs - Streaming
    { keywords: ['streaming api', 'pushtopic', 'platform event', 'cdc', 'change data capture'], category: 'apis', subcategory: 'streaming_api', weight: 10 },
    
    // APIs - Tooling
    { keywords: ['tooling api', 'execute anonymous', 'debug log', 'apextestrun'], category: 'apis', subcategory: 'tooling_api', weight: 10 },
    
    // APIs - Chatter/Connect
    { keywords: ['chatter api', 'connect api', 'feed item'], category: 'apis', subcategory: 'specialized_apis', weight: 8 },
    
    // APIs - Analytics
    { keywords: ['analytics api', 'reports api', 'dashboard api', 'wave'], category: 'apis', subcategory: 'specialized_apis', weight: 8 },
    
    // Dev Tools - CLI
    { keywords: ['sfdx', 'sf cli', 'salesforce cli', 'dx'], category: 'dev_tools', subcategory: 'sfdx_cli', weight: 10 },
    { keywords: ['scratch org', 'dev hub', 'source push', 'source pull'], category: 'dev_tools', subcategory: 'sfdx_cli', weight: 10 },
    
    // Dev Tools - Packaging
    { keywords: ['package', 'unlocked package', '2gp', 'managed package'], category: 'dev_tools', subcategory: 'packaging', weight: 10 },
    { keywords: ['isvforce', 'appexchange', 'security review'], category: 'dev_tools', subcategory: 'packaging', weight: 8 },
    
    // Dev Tools - DevOps
    { keywords: ['devops', 'ci/cd', 'deployment', 'git', 'version control'], category: 'dev_tools', subcategory: 'devops', weight: 8 },
    
    // Dev Tools - Mobile
    { keywords: ['mobile sdk', 'salesforce mobile', 'mobile app'], category: 'dev_tools', subcategory: 'mobile_sdk', weight: 8 },
    
    // Security
    { keywords: ['security', 'permission', 'sharing', 'fls', 'field level security'], category: 'security', subcategory: 'security', weight: 10 },
    { keywords: ['oauth', 'connected app', 'jwt', 'authentication'], category: 'security', subcategory: 'security', weight: 10 },
    { keywords: ['encryption', 'shield', 'platform encryption'], category: 'security', subcategory: 'security', weight: 10 },
    
    // Integration
    { keywords: ['integration', 'callout', 'external service', 'http'], category: 'integration', subcategory: 'integration', weight: 8 },
    { keywords: ['mulesoft', 'anypoint', 'heroku'], category: 'integration', subcategory: 'integration', weight: 8 },
    { keywords: ['external object', 'odata', 'salesforce connect'], category: 'integration', subcategory: 'integration', weight: 8 },
    
    // Clouds
    { keywords: ['sales cloud', 'opportunity', 'lead', 'account', 'contact'], category: 'clouds', subcategory: 'sales_cloud', weight: 6 },
    { keywords: ['service cloud', 'case', 'knowledge', 'omni-channel'], category: 'clouds', subcategory: 'service_cloud', weight: 6 },
    { keywords: ['experience cloud', 'community', 'site', 'portal'], category: 'clouds', subcategory: 'experience_cloud', weight: 8 },
    { keywords: ['marketing cloud', 'journey builder', 'email studio'], category: 'clouds', subcategory: 'marketing_cloud', weight: 8 },
    { keywords: ['crm analytics', 'tableau crm', 'einstein analytics'], category: 'clouds', subcategory: 'analytics_cloud', weight: 8 },
    
    // Best Practices
    { keywords: ['best practice', 'pattern', 'anti-pattern', 'design pattern'], category: 'best_practices', subcategory: 'best_practices', weight: 6 },
    { keywords: ['performance', 'optimization', 'bulkification'], category: 'best_practices', subcategory: 'best_practices', weight: 6 },
    
    // Release Notes
    { keywords: ['release notes', 'new feature', 'summer', 'winter', 'spring'], category: 'release_notes', subcategory: 'release_notes', weight: 8 },
];

// Synonym mappings for query expansion
const SYNONYMS: Record<string, string[]> = {
    'lwc': ['lightning web component', 'web component', 'lightning-'],
    'apex': ['salesforce apex', 'apex class', 'apex trigger'],
    'trigger': ['apex trigger', 'before trigger', 'after trigger'],
    'soql': ['salesforce query', 'select from', 'query'],
    'rest api': ['restful api', 'rest endpoint', '/services/data/'],
    'bulk api': ['bulk 2.0', 'bulk data load', 'data loader api'],
    'permission': ['permission set', 'profile', 'sharing rules'],
    'deploy': ['deployment', 'change set', 'metadata deploy'],
    'test': ['test class', 'unit test', 'apex test', 'testmethod'],
    'callout': ['http callout', 'external callout', 'web service'],
    'authentication': ['oauth', 'login', 'sso', 'connected app'],
    'governor limits': ['limits', 'dml limits', 'soql limits'],
};

// ============ INTENT DETECTION ============

/**
 * Detect user intent from a search query
 * Returns category, subcategory, and confidence level
 */
export function detectIntent(query: string): DetectedIntent {
    const queryLower = query.toLowerCase();
    const matchedPatterns: string[] = [];
    let totalWeight = 0;
    
    // Track scores per category/subcategory
    const scores = new Map<string, { weight: number; category: string; subcategory: string }>();
    
    for (const pattern of INTENT_PATTERNS) {
        const matchedKeywords = pattern.keywords.filter(kw => queryLower.includes(kw.toLowerCase()));
        if (matchedKeywords.length > 0) {
            const key = `${pattern.category}:${pattern.subcategory}`;
            const existing = scores.get(key) || { weight: 0, category: pattern.category, subcategory: pattern.subcategory };
            existing.weight += pattern.weight * matchedKeywords.length;
            scores.set(key, existing);
            matchedPatterns.push(...matchedKeywords);
            totalWeight += pattern.weight * matchedKeywords.length;
        }
    }
    
    // Find highest scoring category/subcategory
    let bestMatch: { category: string; subcategory: string; weight: number } | null = null;
    for (const score of scores.values()) {
        if (!bestMatch || score.weight > bestMatch.weight) {
            bestMatch = score;
        }
    }
    
    // Determine confidence based on total weight
    let confidence: 'high' | 'medium' | 'low';
    if (totalWeight >= 15) {
        confidence = 'high';
    } else if (totalWeight >= 7) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }
    
    return {
        category: bestMatch?.category,
        subcategory: bestMatch?.subcategory,
        confidence,
        matchedPatterns: [...new Set(matchedPatterns)],
        totalWeight
    };
}

/**
 * Generate a human-readable description of the detected intent
 */
export function describeIntent(intent: DetectedIntent): string {
    if (!intent.category) {
        return 'General Salesforce documentation search';
    }
    
    const categoryLabels: Record<string, string> = {
        'core_platform': 'Core Platform Development',
        'apis': 'API Reference',
        'dev_tools': 'Development Tools',
        'clouds': 'Cloud Products',
        'security': 'Security & Permissions',
        'integration': 'Integration Patterns',
        'best_practices': 'Best Practices',
        'release_notes': 'Release Notes'
    };
    
    const subcategoryLabels: Record<string, string> = {
        'apex': 'Apex Development',
        'lightning': 'Lightning (LWC/Aura)',
        'visualforce': 'Visualforce',
        'soql_sosl': 'SOQL/SOSL Queries',
        'formulas': 'Formulas',
        'rest_api': 'REST API',
        'soap_api': 'SOAP API',
        'metadata_api': 'Metadata API',
        'bulk_api': 'Bulk API',
        'streaming_api': 'Streaming API',
        'tooling_api': 'Tooling API',
        'specialized_apis': 'Specialized APIs',
        'sfdx_cli': 'Salesforce CLI',
        'packaging': 'Packaging',
        'devops': 'DevOps',
        'mobile_sdk': 'Mobile SDK',
        'security': 'Security',
        'integration': 'Integration',
        'sales_cloud': 'Sales Cloud',
        'service_cloud': 'Service Cloud',
        'experience_cloud': 'Experience Cloud',
        'marketing_cloud': 'Marketing Cloud',
        'analytics_cloud': 'CRM Analytics',
        'best_practices': 'Best Practices',
        'release_notes': 'Release Notes'
    };
    
    const categoryLabel = categoryLabels[intent.category] || intent.category;
    const subcategoryLabel = intent.subcategory ? subcategoryLabels[intent.subcategory] || intent.subcategory : '';
    
    if (subcategoryLabel && subcategoryLabel !== categoryLabel) {
        return `${categoryLabel} - ${subcategoryLabel}`;
    }
    return categoryLabel;
}

// ============ QUERY EXPANSION ============

/**
 * Expand a natural language query into technical search terms
 * Used for LLM-powered semantic search
 */
export function expandQueryToKeywords(query: string, context?: string): QueryExpansion {
    const queryLower = query.toLowerCase();
    const contextLower = context?.toLowerCase() || '';
    const combined = `${queryLower} ${contextLower}`;
    
    const detectedConcepts: string[] = [];
    const expandedTerms: string[] = [];
    
    // Detect intent first
    const intent = detectIntent(query);
    
    // Extract concepts from matched patterns
    if (intent.matchedPatterns.length > 0) {
        detectedConcepts.push(...intent.matchedPatterns);
    }
    
    // Add synonyms for detected terms
    for (const concept of detectedConcepts) {
        const synonyms = SYNONYMS[concept.toLowerCase()];
        if (synonyms) {
            expandedTerms.push(...synonyms);
        }
    }
    
    // Add the original query terms
    const queryTerms = query.split(/\s+/).filter(t => t.length > 2);
    expandedTerms.push(...queryTerms);
    
    // Add context terms if provided
    if (context) {
        const contextTerms = context.split(/\s+/).filter(t => t.length > 2);
        expandedTerms.push(...contextTerms.slice(0, 5));
    }
    
    // Add category-specific terms based on intent
    if (intent.subcategory) {
        const categoryTerms = getCategoryTerms(intent.subcategory);
        expandedTerms.push(...categoryTerms);
    }
    
    // Deduplicate and limit
    const uniqueTerms = [...new Set(expandedTerms)].slice(0, 20);
    
    // Build reasoning
    const reasoning = buildReasoning(query, intent, detectedConcepts);
    
    return {
        expandedTerms: uniqueTerms,
        detectedConcepts: [...new Set(detectedConcepts)],
        suggestedCategory: intent.category,
        confidence: intent.confidence,
        reasoning
    };
}

/**
 * Get related terms for a given subcategory
 */
function getCategoryTerms(subcategory: string): string[] {
    const categoryTerms: Record<string, string[]> = {
        'apex': ['trigger', 'class', 'test', 'governor limits', 'batch', 'future'],
        'lightning': ['lwc', '@wire', '@api', 'component', 'aura', 'lightning-'],
        'visualforce': ['apex:page', 'controller', 'extension', 'apex:form'],
        'soql_sosl': ['SELECT', 'FROM', 'WHERE', 'relationship', 'aggregate'],
        'rest_api': ['endpoint', 'sobject', 'composite', 'JSON', 'HTTP'],
        'bulk_api': ['job', 'batch', 'CSV', 'data load'],
        'metadata_api': ['package.xml', 'deploy', 'retrieve', 'manifest'],
        'streaming_api': ['PushTopic', 'CDC', 'Platform Event', 'subscribe'],
        'tooling_api': ['ApexTestRun', 'debug', 'execute anonymous'],
        'sfdx_cli': ['sf', 'scratch org', 'source push', 'dev hub'],
        'security': ['permission set', 'sharing', 'FLS', 'profile', 'oauth'],
        'integration': ['callout', 'HTTP', 'external service', 'named credential'],
    };
    
    return categoryTerms[subcategory] || [];
}

/**
 * Build human-readable reasoning for the expansion
 */
function buildReasoning(query: string, intent: DetectedIntent, concepts: string[]): string {
    const parts: string[] = [];
    
    if (concepts.length > 0) {
        parts.push(`Detected concepts: ${concepts.slice(0, 5).join(', ')}`);
    }
    
    if (intent.category) {
        parts.push(`Suggested category: ${intent.category}`);
    }
    
    if (intent.confidence === 'high') {
        parts.push('High confidence match - specific documentation area identified');
    } else if (intent.confidence === 'medium') {
        parts.push('Medium confidence - multiple possible areas detected');
    } else {
        parts.push('Low confidence - broad search recommended');
    }
    
    return parts.join('. ') || 'General search across all documentation';
}

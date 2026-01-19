/**
 * Type definitions for Salesforce Docs MCP Server
 */

// Document categories matching the architecture design
export enum DocCategory {
    CORE_PLATFORM = "core_platform",
    APIS = "apis",
    DEV_TOOLS = "dev_tools",
    CLOUDS = "clouds",
    SECURITY = "security",
    INTEGRATION = "integration",
    BEST_PRACTICES = "best_practices",
    RELEASE_NOTES = "release_notes"
}

// Document types
export enum DocType {
    DEVELOPER_GUIDE = "developer_guide",
    API_REFERENCE = "api_reference",
    CHEATSHEET = "cheatsheet",
    IMPLEMENTATION_GUIDE = "implementation_guide",
    RELEASE_NOTES = "release_notes",
    WORKBOOK = "workbook"
}

// Subcategories
export enum Subcategory {
    // Core Platform
    APEX = "apex",
    VISUALFORCE = "visualforce",
    LIGHTNING = "lightning",
    SOQL_SOSL = "soql_sosl",
    FORMULAS = "formulas",
    
    // APIs
    REST_API = "rest_api",
    SOAP_API = "soap_api",
    STREAMING_API = "streaming_api",
    TOOLING_API = "tooling_api",
    BULK_API = "bulk_api",
    METADATA_API = "metadata_api",
    SPECIALIZED_APIS = "specialized_apis",
    
    // Dev Tools
    SFDX_CLI = "sfdx_cli",
    PACKAGING = "packaging",
    DEVOPS = "devops",
    MOBILE_SDK = "mobile_sdk",
    
    // Clouds
    SALES_CLOUD = "sales_cloud",
    SERVICE_CLOUD = "service_cloud",
    EXPERIENCE_CLOUD = "experience_cloud",
    MARKETING_CLOUD = "marketing_cloud",
    ANALYTICS_CLOUD = "analytics_cloud",
    INDUSTRY_CLOUDS = "industry_clouds",
    
    // Release Notes
    CURRENT = "current",
    HISTORICAL = "historical"
}

// Human-readable category labels
export const CATEGORY_LABELS: Record<DocCategory, string> = {
    [DocCategory.CORE_PLATFORM]: "Core Platform (Apex, LWC, Visualforce, SOQL)",
    [DocCategory.APIS]: "APIs (REST, SOAP, Metadata, Bulk, Tooling)",
    [DocCategory.DEV_TOOLS]: "Development Tools (SFDX, VS Code, Packaging)",
    [DocCategory.CLOUDS]: "Clouds & Products (Sales, Service, Experience)",
    [DocCategory.SECURITY]: "Security & Identity",
    [DocCategory.INTEGRATION]: "Integration Patterns",
    [DocCategory.BEST_PRACTICES]: "Best Practices & Limits",
    [DocCategory.RELEASE_NOTES]: "Release Notes"
};

export const SUBCATEGORY_LABELS: Record<Subcategory, string> = {
    [Subcategory.APEX]: "Apex Development",
    [Subcategory.VISUALFORCE]: "Visualforce",
    [Subcategory.LIGHTNING]: "Lightning (LWC & Aura)",
    [Subcategory.SOQL_SOSL]: "SOQL & SOSL",
    [Subcategory.FORMULAS]: "Formulas",
    [Subcategory.REST_API]: "REST API",
    [Subcategory.SOAP_API]: "SOAP API",
    [Subcategory.STREAMING_API]: "Streaming API",
    [Subcategory.TOOLING_API]: "Tooling API",
    [Subcategory.BULK_API]: "Bulk API",
    [Subcategory.METADATA_API]: "Metadata API",
    [Subcategory.SPECIALIZED_APIS]: "Specialized APIs",
    [Subcategory.SFDX_CLI]: "Salesforce CLI",
    [Subcategory.PACKAGING]: "Packaging",
    [Subcategory.DEVOPS]: "DevOps",
    [Subcategory.MOBILE_SDK]: "Mobile SDK",
    [Subcategory.SALES_CLOUD]: "Sales Cloud",
    [Subcategory.SERVICE_CLOUD]: "Service Cloud",
    [Subcategory.EXPERIENCE_CLOUD]: "Experience Cloud",
    [Subcategory.MARKETING_CLOUD]: "Marketing Cloud",
    [Subcategory.ANALYTICS_CLOUD]: "CRM Analytics",
    [Subcategory.INDUSTRY_CLOUDS]: "Industry Clouds",
    [Subcategory.CURRENT]: "Current Releases",
    [Subcategory.HISTORICAL]: "Historical Releases"
};

// Document metadata interface
export interface DocumentMetadata {
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
    lastUpdated?: string;
    pageCount?: number;
    sizeBytes?: number;
    priority: number;  // 1-10, for search ranking boost
}

// Document chunk interface
export interface DocumentChunk {
    id: number;
    documentId: number;
    chunkIndex: number;
    content: string;
    sectionTitle?: string;
    pageNumber?: number;
}

// Search result interface
export interface SearchResult {
    document: DocumentMetadata;
    chunk: string;
    score: number;
    matchDensity?: number;  // 0-1, how many search terms matched
    highlights?: string[];
    sectionTitle?: string;
    detectedIntent?: {
        category?: string;
        subcategory?: string;
        confidence: 'high' | 'medium' | 'low';
        description: string;
    };
}

// Search options
export interface SearchOptions {
    category?: DocCategory;
    subcategory?: string;
    docType?: DocType;
    maxResults?: number;
    intent?: string;
    keywords?: string[];
    minScore?: number;
}

// Category count for listing
export interface CategoryCount {
    category: string;
    count: number;
    subcategories?: { name: string; count: number }[];
}

// Intent classification result
export interface IntentResult {
    intent: string;
    confidence: number;
    suggestedCategory?: DocCategory;
}

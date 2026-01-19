/**
 * PDF text chunking utilities
 */

export interface ChunkOptions {
    maxChunkSize?: number;
    overlapSize?: number;
    preserveCodeBlocks?: boolean;
    preserveTables?: boolean;
}

export interface Chunk {
    index: number;
    content: string;
    sectionTitle?: string;
    pageNumber?: number;
    startChar: number;
    endChar: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
    maxChunkSize: 1500,
    overlapSize: 200,
    preserveCodeBlocks: true,
    preserveTables: true
};

/**
 * Split text into semantic chunks
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const chunks: Chunk[] = [];
    
    // First, split by major sections (headings)
    const sections = splitBySections(text);
    
    let chunkIndex = 0;
    
    for (const section of sections) {
        const sectionChunks = chunkSection(section.content, opts);
        
        for (const content of sectionChunks) {
            chunks.push({
                index: chunkIndex++,
                content: content.trim(),
                sectionTitle: section.title,
                startChar: 0, // Would need to track this properly
                endChar: 0
            });
        }
    }
    
    return chunks;
}

/**
 * Split text into sections based on headings
 */
function splitBySections(text: string): Array<{ title?: string; content: string }> {
    const sections: Array<{ title?: string; content: string }> = [];
    
    // Match markdown-style headings or ALL CAPS headings
    const headingPattern = /^(?:#{1,3}\s+(.+)|([A-Z][A-Z\s]{5,}[A-Z]))$/gm;
    
    let lastIndex = 0;
    let lastTitle: string | undefined;
    let match;
    
    while ((match = headingPattern.exec(text)) !== null) {
        // Save previous section
        if (match.index > lastIndex) {
            const content = text.substring(lastIndex, match.index).trim();
            if (content.length > 50) {
                sections.push({
                    title: lastTitle,
                    content
                });
            }
        }
        
        lastTitle = (match[1] || match[2]).trim();
        lastIndex = match.index + match[0].length;
    }
    
    // Add final section
    if (lastIndex < text.length) {
        const content = text.substring(lastIndex).trim();
        if (content.length > 50) {
            sections.push({
                title: lastTitle,
                content
            });
        }
    }
    
    // If no sections found, return whole text
    if (sections.length === 0) {
        sections.push({ content: text });
    }
    
    return sections;
}

/**
 * Chunk a section into smaller pieces
 */
function chunkSection(text: string, opts: Required<ChunkOptions>): string[] {
    const chunks: string[] = [];
    
    if (text.length <= opts.maxChunkSize) {
        return [text];
    }
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";
    
    for (const para of paragraphs) {
        // Check if adding this paragraph exceeds limit
        if (currentChunk.length + para.length > opts.maxChunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
            }
            
            // If single paragraph is too long, split it
            if (para.length > opts.maxChunkSize) {
                const subChunks = splitLongParagraph(para, opts);
                chunks.push(...subChunks.slice(0, -1));
                currentChunk = subChunks[subChunks.length - 1] || "";
            } else {
                currentChunk = para;
            }
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        }
    }
    
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    // Add overlap between chunks
    return addOverlap(chunks, opts.overlapSize);
}

/**
 * Split a long paragraph into smaller chunks
 */
function splitLongParagraph(para: string, opts: Required<ChunkOptions>): string[] {
    const chunks: string[] = [];
    
    // Try to split by sentences
    const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
    let currentChunk = "";
    
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > opts.maxChunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
            }
            
            // If single sentence is too long, split by words
            if (sentence.length > opts.maxChunkSize) {
                const words = sentence.split(/\s+/);
                currentChunk = "";
                
                for (const word of words) {
                    if (currentChunk.length + word.length > opts.maxChunkSize) {
                        chunks.push(currentChunk.trim());
                        currentChunk = word;
                    } else {
                        currentChunk += (currentChunk ? " " : "") + word;
                    }
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += sentence;
        }
    }
    
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

/**
 * Add overlap between chunks for context preservation
 */
function addOverlap(chunks: string[], overlapSize: number): string[] {
    if (chunks.length <= 1 || overlapSize === 0) {
        return chunks;
    }
    
    const overlappedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];
        
        // Add end of previous chunk as context
        if (i > 0) {
            const prevChunk = chunks[i - 1];
            const overlap = prevChunk.substring(Math.max(0, prevChunk.length - overlapSize));
            // Only add if it ends at a word boundary
            const lastSpace = overlap.indexOf(' ');
            if (lastSpace > 0) {
                chunk = overlap.substring(lastSpace + 1) + " [...] " + chunk;
            }
        }
        
        overlappedChunks.push(chunk);
    }
    
    return overlappedChunks;
}

/**
 * Extract code blocks from text
 */
export function extractCodeBlocks(text: string): Array<{ language?: string; code: string }> {
    const blocks: Array<{ language?: string; code: string }> = [];
    
    // Markdown code blocks
    const mdPattern = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = mdPattern.exec(text)) !== null) {
        blocks.push({
            language: match[1] || undefined,
            code: match[2].trim()
        });
    }
    
    // Indented code blocks (4 spaces or tab)
    const lines = text.split('\n');
    let inCodeBlock = false;
    let currentBlock: string[] = [];
    
    for (const line of lines) {
        const isIndented = line.startsWith('    ') || line.startsWith('\t');
        
        if (isIndented && !inCodeBlock) {
            inCodeBlock = true;
            currentBlock = [line.substring(4) || line.substring(1)];
        } else if (isIndented && inCodeBlock) {
            currentBlock.push(line.substring(4) || line.substring(1));
        } else if (!isIndented && inCodeBlock) {
            if (currentBlock.length > 1) {
                blocks.push({
                    code: currentBlock.join('\n').trim()
                });
            }
            inCodeBlock = false;
            currentBlock = [];
        }
    }
    
    if (currentBlock.length > 1) {
        blocks.push({
            code: currentBlock.join('\n').trim()
        });
    }
    
    return blocks;
}

/**
 * Clean PDF text (remove artifacts)
 */
export function cleanPdfText(text: string): string {
    return text
        // Remove page numbers
        .replace(/^\d+\s*$/gm, '')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Remove page headers/footers (common patterns)
        .replace(/^Salesforce.*?Guide\s*$/gm, '')
        .replace(/^©\s*\d{4}\s*Salesforce.*$/gm, '')
        // Fix hyphenated words at line breaks
        .replace(/(\w)-\n(\w)/g, '$1$2')
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

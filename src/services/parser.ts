import * as yaml from 'js-yaml';
import matter from 'gray-matter';

export type DocumentFormat = 'json' | 'markdown' | 'yaml' | 'text' | 'auto';

export interface ParsedDocument {
    format: DocumentFormat;
    content: unknown;
    metadata?: Record<string, unknown>;
    rawContent: string;
}

export class DocumentParser {
    /**
     * Auto-detects the document format based on file extension or content
     */
    detectFormat(fileContent: string, filePath?: string, explicitFormat?: DocumentFormat): DocumentFormat {
        if (explicitFormat && explicitFormat !== 'auto') {
            return explicitFormat;
        }

        // Try to detect from file path
        if (filePath) {
            const extension = this.getFileExtension(filePath);
            if (extension === '.json') return 'json';
            if (extension === '.md' || extension === '.markdown') return 'markdown';
            if (extension === '.yaml' || extension === '.yml') return 'yaml';
            if (extension === '.txt' || extension === '.text') return 'text';
        }

        // Try to detect from content
        const trimmed = fileContent.trim();
        
        // Check for JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch {
                // Not valid JSON
            }
        }

        // Check for YAML frontmatter (Markdown)
        if (trimmed.startsWith('---')) {
            return 'markdown';
        }

        // Check for YAML
        if (trimmed.includes(':') && !trimmed.includes('{')) {
            try {
                yaml.load(trimmed);
                return 'yaml';
            } catch {
                // Not valid YAML
            }
        }

        // Default to text
        return 'text';
    }

    /**
     * Parses a document based on its format
     */
    parseDocument(
        fileContent: string,
        filePath?: string,
        format?: DocumentFormat
    ): ParsedDocument {
        const detectedFormat = this.detectFormat(fileContent, filePath, format);
        
        switch (detectedFormat) {
            case 'json':
                return this.parseJSON(fileContent);
            case 'markdown':
                return this.parseMarkdown(fileContent);
            case 'yaml':
                return this.parseYAML(fileContent);
            case 'text':
            default:
                return this.parseText(fileContent);
        }
    }

    /**
     * Parses JSON documents
     */
    private parseJSON(content: string): ParsedDocument {
        try {
            const parsed = JSON.parse(content);
            return {
                format: 'json',
                content: parsed,
                rawContent: content,
            };
        } catch (error) {
            throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parses Markdown documents (with optional frontmatter)
     */
    private parseMarkdown(content: string): ParsedDocument {
        try {
            const parsed = matter(content);
            return {
                format: 'markdown',
                content: parsed.content.trim(),
                metadata: parsed.data,
                rawContent: content,
            };
        } catch (error) {
            throw new Error(`Failed to parse Markdown: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parses YAML documents
     */
    private parseYAML(content: string): ParsedDocument {
        try {
            const parsed = yaml.load(content);
            return {
                format: 'yaml',
                content: parsed,
                rawContent: content,
            };
        } catch (error) {
            throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parses plain text documents
     */
    private parseText(content: string): ParsedDocument {
        return {
            format: 'text',
            content: content.trim(),
            rawContent: content,
        };
    }

    /**
     * Extracts file extension from a file path
     */
    private getFileExtension(filePath: string): string {
        const lastDot = filePath.lastIndexOf('.');
        if (lastDot === -1) return '';
        return filePath.substring(lastDot).toLowerCase();
    }
}


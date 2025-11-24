import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseDocumentHandler } from './handler.js';

export function registerParseDocumentTool(server: McpServer) {
    server.registerTool("parse-document", {
        title: 'Parse Document',
        description: 'Downloads and parses document content from various formats (JSON, Markdown, YAML, or plain text). Use the downloadUrl from scan-repository output. The tool automatically downloads the file, extracts the filename from the URL for format detection, and returns structured data.',
        inputSchema: {
            downloadUrl: z.string().url().describe('Direct URL to download the file content. Use the downloadUrl from scan-repository output. The tool will extract the filename from the URL to auto-detect the format.'),
            fileType: z.enum(['json', 'markdown', 'yaml', 'text', 'auto']).optional().describe('Explicit file format to use for parsing. If not provided, will auto-detect from the filename in the URL or content structure.'),
        },
        outputSchema: {
            format: z.enum(['json', 'markdown', 'yaml', 'text']).describe('The detected or specified format of the parsed document'),
            content: z.unknown().describe('The parsed document content. Structure varies by format: JSON/YAML return objects/arrays, Markdown returns text content, text returns the trimmed string.'),
            metadata: z.record(z.unknown()).optional().describe('Document metadata extracted from frontmatter (only present for Markdown files with YAML frontmatter)'),
            rawContent: z.string().describe('The original raw file content that was parsed'),
        },
    },
    async (args) => {
        const result = await parseDocumentHandler(args);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
        };
    });
}


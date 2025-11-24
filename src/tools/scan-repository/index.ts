import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scanRepositoryHandler } from './handler.js';

export function registerScanRepositoryTool(server: McpServer) {
    server.registerTool("scan-repository", {
        title: 'Scan Repository',
        description: 'Scans a GitHub repository for files matching specified extensions. Returns a list of files with metadata including file paths, sizes, and download URLs. Use this tool to discover files in a repository. The downloadUrl can be used to fetch file content, which can then be passed to parse-document for parsing.',
        inputSchema: {
            repository: z.string().describe('GitHub repository in format "owner/repo" (e.g., "octocat/Hello-World"). The repository must be accessible with the configured GitHub token.'),
            path: z.string().optional().describe('Optional subdirectory path within the repository to scan. If not provided, scans from the repository root.'),
            fileExtensions: z.array(z.string()).optional().describe('Array of file extensions to filter (e.g., [".json", ".md"]). Defaults to [".json", ".md", ".txt", ".yaml", ".yml"] if not specified.'),
        },
        outputSchema: {
            files: z.array(z.object({
                path: z.string().describe('Full file path within the repository'),
                size: z.number().describe('File size in bytes'),
                lastModified: z.string().describe('Last modification timestamp (ISO 8601 format)'),
                sha: z.string().describe('Git SHA hash of the file'),
                downloadUrl: z.string().optional().describe('Direct URL to download the raw file content. This URL can be used to fetch the file content for parsing with parse-document.'),
            })).describe('Array of files found in the repository matching the specified criteria'),
        },
    },
    async (args) => {
        const result = await scanRepositoryHandler(args);
        // Convert Date objects to strings for JSON serialization
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            structuredContent: {
                files: result.files.map(file => ({
                    ...file,
                    lastModified: file.lastModified.toISOString(),
                })),
            },
        };
    });
}


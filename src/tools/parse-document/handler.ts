import { DocumentParser, DocumentFormat } from '../../services/parser.js';
import { GitHubService } from '../../services/github.js';

export async function parseDocumentHandler({
    downloadUrl,
    fileType,
}: {
    downloadUrl: string; // Direct URL to download file content (from scan-repository output)
    fileType?: DocumentFormat; // Optional explicit format override, otherwise auto-detected from URL
}): Promise<{
    format: DocumentFormat;
    content: unknown;
    metadata?: Record<string, unknown>;
    rawContent: string;
}> {
    if (!downloadUrl) {
        throw new Error('downloadUrl is required');
    }

    let content: string;
    let detectedFilePath: string | undefined;

    try {
        const url = new URL(downloadUrl);
        
        // Extract file path from URL for format detection
        const pathParts = url.pathname.split('/').filter(p => p.length > 0);
        detectedFilePath = pathParts[pathParts.length - 1];

        // If it's a raw.githubusercontent.com URL, use GitHub API for private repos
        if (url.hostname === 'raw.githubusercontent.com') {
            // URL format: https://raw.githubusercontent.com/owner/repo/branch/path/to/file
            // pathParts: [owner, repo, branch, ...filePath]
            if (pathParts.length >= 4) {
                const owner = pathParts[0];
                const repo = pathParts[1];
                const filePath = pathParts.slice(3).join('/'); // Everything after branch
                
                const githubService = new GitHubService();
                content = await githubService.getFileContent(owner, repo, filePath);
            } else {
                throw new Error('Invalid raw.githubusercontent.com URL format');
            }
        } else {
            // For other URLs, use regular fetch
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error(`Failed to download file from URL: ${response.statusText}`);
            }
            content = await response.text();
        }
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('Invalid URL')) {
            throw new Error(`Invalid downloadUrl format: ${downloadUrl}`);
        }
        throw new Error(`Failed to download file from URL: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Parse the document
    const parser = new DocumentParser();
    const parsed = parser.parseDocument(content, detectedFilePath, fileType);

    return parsed;
}


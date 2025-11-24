import { GitHubService } from '../../services/github.js';
import { RepositoryFile } from '../../config/types.js';

export async function scanRepositoryHandler({
    repository,
    path,
    fileExtensions,
}: {
    repository: string;
    path?: string;
    fileExtensions?: string[];
}): Promise<{ files: RepositoryFile[] }> {
    // Parse repository string (format: "owner/repo")
    const parts = repository.split('/').filter(p => p.length > 0);
    if (parts.length !== 2) {
        throw new Error('Repository must be in format "owner/repo" (e.g., "octocat/Hello-World")');
    }
    
    const [owner, repo] = parts;
    
    // Remove any leading/trailing whitespace
    const cleanOwner = owner.trim();
    const cleanRepo = repo.trim();
    
    if (!cleanOwner || !cleanRepo) {
        throw new Error('Repository must be in format "owner/repo" (e.g., "octocat/Hello-World")');
    }

    // Initialize GitHub service
    const githubService = new GitHubService();

    // Default file extensions if not provided
    const extensions = fileExtensions || ['.json', '.md', '.txt', '.yaml', '.yml'];

    // Scan repository
    const files = await githubService.scanRepository(cleanOwner, cleanRepo, path || '', extensions);

    return { files };
}


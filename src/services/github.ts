import { Octokit } from '@octokit/rest';
import { RepositoryFile } from '../config/types.js';

export class GitHubService {
    private octokit: Octokit;

    constructor(token?: string) {
        const authToken = (token || process.env.GITHUB_TOKEN)?.trim();
        if (!authToken) {
            throw new Error('GitHub token is required. Set GITHUB_TOKEN environment variable or pass token to constructor.');
        }
        this.octokit = new Octokit({
            auth: authToken,
        });
    }

    /**
     * Scans a GitHub repository for files matching the specified extensions
     */
    async scanRepository(
        owner: string,
        repo: string,
        path: string = '',
        fileExtensions: string[] = ['.json', '.md', '.txt', '.yaml', '.yml']
    ): Promise<RepositoryFile[]> {
        try {
            // Verify token first
            const tokenInfo = await this.verifyToken();
            if (!tokenInfo.valid) {
                throw new Error('GitHub token is invalid or expired. Please check your GITHUB_TOKEN.');
            }

            const files: RepositoryFile[] = [];
            const { tree, defaultBranch } = await this.getRepositoryTree(owner, repo, path);

            for (const item of tree) {
                const itemPath = item.path || item.name || '';
                const extension = this.getFileExtension(itemPath);
                
                if (fileExtensions.includes(extension)) {
                    files.push({
                        path: itemPath,
                        size: item.size || 0,
                        lastModified: new Date(), // GitHub API doesn't provide modification date in tree
                        sha: item.sha || '',
                        downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${itemPath}`,
                    });
                }
            }

            return files;
        } catch (error) {
            throw new Error(`Failed to scan repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Verifies the GitHub token is valid and has access
     */
    async verifyToken(): Promise<{ valid: boolean; user?: string; scopes?: string[] }> {
        try {
            const { data } = await this.octokit.users.getAuthenticated();
            return {
                valid: true,
                user: data.login,
            };
        } catch (error: any) {
            if (error.status === 401) {
                return { valid: false };
            }
            throw error;
        }
    }

    /**
     * Gets the authenticated user for the token (for error messages)
     */
    private async getTokenUser(): Promise<string | null> {
        try {
            const { data } = await this.octokit.users.getAuthenticated();
            return data.login;
        } catch {
            return null;
        }
    }

    /**
     * Checks if the repository is accessible with the current token
     */
    async checkRepositoryAccess(owner: string, repo: string): Promise<{ accessible: boolean; reason?: string }> {
        try {
            await this.octokit.repos.get({ owner, repo });
            return { accessible: true };
        } catch (error: any) {
            if (error.status === 404) {
                // Try to get user info to see if token is valid
                const tokenInfo = await this.verifyToken();
                if (!tokenInfo.valid) {
                    return { accessible: false, reason: 'Token is invalid or expired' };
                }
                return { 
                    accessible: false, 
                    reason: `Repository not found or token doesn't have access. Token user: ${tokenInfo.user || 'unknown'}. Ensure token has 'repo' scope for private repositories.` 
                };
            }
            return { accessible: false, reason: error.message || 'Unknown error' };
        }
    }

    /**
     * Gets the file tree from a GitHub repository
     */
    private async getRepositoryTree(owner: string, repo: string, path: string = ''): Promise<{ tree: any[], defaultBranch: string }> {
        // First check if we have access
        const accessCheck = await this.checkRepositoryAccess(owner, repo);
        if (!accessCheck.accessible) {
            throw new Error(accessCheck.reason || `Cannot access repository ${owner}/${repo}`);
        }

        try {
            // Get the default branch
            const { data: repoData } = await this.octokit.repos.get({
                owner,
                repo,
            });
            const defaultBranch = repoData.default_branch;

            // Get the tree for the specified path
            if (path) {
                const { data: pathData } = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    path,
                    ref: defaultBranch,
                });

                if (Array.isArray(pathData)) {
                    // Directory contents - need to recursively get all files
                    const allFiles: any[] = [];
                    await this.recursivelyGetFiles(owner, repo, path, defaultBranch, allFiles);
                    return { tree: allFiles, defaultBranch };
                } else {
                    // Single file, return as array
                    return { tree: [{ path: pathData.path, sha: pathData.sha, size: pathData.size, name: pathData.name }], defaultBranch };
                }
            } else {
                // Get the root tree recursively
                const { data: refData } = await this.octokit.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${defaultBranch}`,
                });

                const { data: treeData } = await this.octokit.git.getTree({
                    owner,
                    repo,
                    tree_sha: refData.object.sha,
                    recursive: '1',
                });

                return { tree: treeData.tree, defaultBranch };
            }
        } catch (error: any) {
            if (error.status === 404) {
                // For private repos, 404 typically means no access
                throw new Error(`Repository "${owner}/${repo}" not found or access denied. For private repositories, ensure: 1) Token has 'repo' scope enabled, 2) Token has access to this specific repository, 3) Repository name is correct. Current token user: ${await this.getTokenUser() || 'unknown'}`);
            } else if (error.status === 401) {
                throw new Error('Authentication failed. Please check your GITHUB_TOKEN is valid and has the necessary permissions (especially "repo" scope for private repositories).');
            } else if (error.status === 403) {
                throw new Error('Access forbidden. Your token may not have permission to access this repository (check "repo" scope) or you may have hit rate limits.');
            }
            throw new Error(`Failed to get repository tree: ${error?.message || String(error)}`);
        }
    }

    /**
     * Recursively gets all files from a directory
     */
    private async recursivelyGetFiles(
        owner: string,
        repo: string,
        dirPath: string,
        branch: string,
        files: any[]
    ): Promise<void> {
        try {
            const { data: contents } = await this.octokit.repos.getContent({
                owner,
                repo,
                path: dirPath,
                ref: branch,
            });

            if (Array.isArray(contents)) {
                for (const item of contents) {
                    if (item.type === 'file') {
                        files.push({
                            path: item.path,
                            sha: item.sha,
                            size: item.size,
                            name: item.name,
                        });
                    } else if (item.type === 'dir') {
                        // Recursively get files from subdirectories
                        await this.recursivelyGetFiles(owner, repo, item.path, branch, files);
                    }
                }
            }
        } catch (error) {
            // Silently skip directories that can't be accessed
            console.warn(`Failed to access directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Downloads file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string): Promise<string> {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });

            if (Array.isArray(data)) {
                throw new Error('Path points to a directory, not a file');
            }

            if (data.type !== 'file') {
                throw new Error('Path does not point to a file');
            }

            if ('content' in data && data.encoding === 'base64') {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }

            throw new Error('File content not available or encoding not supported');
        } catch (error) {
            throw new Error(`Failed to get file content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extracts file extension from a file path
     */
    private getFileExtension(filePath: string): string {
        const lastDot = filePath.lastIndexOf('.');
        if (lastDot === -1) return '';
        return filePath.substring(lastDot).toLowerCase();
    }

    /**
     * Creates a GitHub issue for a security incident
     */
    async createIssue(
        owner: string,
        repo: string,
        title: string,
        body: string,
        labels?: string[]
    ): Promise<{ number: number; url: string; html_url: string }> {
        try {
            // Check repository access first
            const accessCheck = await this.checkRepositoryAccess(owner, repo);
            if (!accessCheck.accessible) {
                throw new Error(accessCheck.reason || `Cannot access repository ${owner}/${repo}`);
            }

            const { data } = await this.octokit.issues.create({
                owner,
                repo,
                title,
                body,
                labels: labels || ['security-incident'],
            });

            return {
                number: data.number,
                url: data.url,
                html_url: data.html_url,
            };
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`Repository "${owner}/${repo}" not found or access denied. Ensure the token has 'repo' scope and access to create issues.`);
            } else if (error.status === 401) {
                throw new Error('Authentication failed. Please check your GITHUB_TOKEN is valid.');
            } else if (error.status === 403) {
                throw new Error('Access forbidden. Your token may not have permission to create issues or you may have hit rate limits.');
            }
            throw new Error(`Failed to create issue: ${error?.message || String(error)}`);
        }
    }
}


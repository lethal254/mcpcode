import { GitHubService } from '../../services/github.js';
import { Severity } from '../../config/types.js';

export interface Incident {
    severity: Severity;
    incidentType: string;
    affectedSystems: string[];
    timestamp: string;
    description: string;
    stakeholders: string[];
    sourceFile: string;
}

export interface CreateGitHubIssuesInput {
    repository: string; // Format: owner/repo
    incidents: Incident[]; // High severity incidents only
    labels?: string[];
}

export interface IssueResult {
    incidentType: string;
    issueNumber: number;
    issueUrl: string;
    status: 'created' | 'failed';
    error?: string;
}

export async function createGitHubIssuesHandler(
    input: CreateGitHubIssuesInput
): Promise<{
    created: number;
    failed: number;
    results: IssueResult[];
}> {
    const { repository, incidents, labels } = input;

    // Validate repository format
    const repoParts = repository.split('/');
    if (repoParts.length !== 2) {
        throw new Error('Repository must be in format "owner/repo"');
    }
    const [owner, repo] = repoParts;

    // Filter to only high severity incidents
    const highSeverityIncidents = incidents.filter(incident => incident.severity === 'high');

    if (highSeverityIncidents.length === 0) {
        return {
            created: 0,
            failed: 0,
            results: [],
        };
    }

    const githubService = new GitHubService();
    const results: IssueResult[] = [];
    let created = 0;
    let failed = 0;

    // Create one issue per incident
    for (const incident of highSeverityIncidents) {
        try {
            const title = `[HIGH] ${incident.incidentType}`;
            const body = renderIssueBody(incident);

            const issue = await githubService.createIssue(
                owner,
                repo,
                title,
                body,
                labels || ['security-incident', 'high-severity']
            );

            results.push({
                incidentType: incident.incidentType,
                issueNumber: issue.number,
                issueUrl: issue.html_url,
                status: 'created',
            });
            created++;
        } catch (error) {
            results.push({
                incidentType: incident.incidentType,
                issueNumber: 0,
                issueUrl: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
        }
    }

    return {
        created,
        failed,
        results,
    };
}

/**
 * Renders the issue body markdown for an incident
 */
function renderIssueBody(incident: Incident): string {
    return `## Security Incident Details

**Severity:** ${incident.severity.toUpperCase()}
**Incident Type:** ${incident.incidentType}
**Timestamp:** ${incident.timestamp}
**Source File:** ${incident.sourceFile}

### Affected Systems
${incident.affectedSystems.length > 0 
    ? incident.affectedSystems.map(system => `- ${system}`).join('\n')
    : 'N/A'}

### Description
${incident.description}

### Stakeholders
${incident.stakeholders.length > 0
    ? incident.stakeholders.map(stakeholder => `- ${stakeholder}`).join('\n')
    : 'N/A'}

---
*This issue was automatically created from security incident report: ${incident.sourceFile}*`;
}


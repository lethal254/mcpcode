import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createGitHubIssuesHandler } from './handler.js';

// Incident schema matching the extract-incident-data output
const IncidentSchema = z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    incidentType: z.string(),
    affectedSystems: z.array(z.string()),
    timestamp: z.string().describe('ISO 8601 date string'),
    description: z.string(),
    stakeholders: z.array(z.string()),
    sourceFile: z.string(),
});

export function registerCreateGitHubIssuesTool(server: McpServer) {
    server.registerTool("create-github-issues", {
        title: 'Create GitHub Issues for High Severity Incidents',
        description: 'Creates GitHub issues for high severity security incidents. One issue is created per incident. Only incidents with severity "high" will be processed. The tool will filter out incidents of other severity levels automatically.',
        inputSchema: {
            repository: z.string().describe('GitHub repository in format "owner/repo" where issues should be created. Example: "octocat/Hello-World".'),
            incidents: z.array(IncidentSchema).describe('Array of incidents. Only incidents with severity "high" will be processed. Use the output from extract-incident-data tool (specifically the "high" array).'),
            labels: z.array(z.string()).optional().describe('Optional labels to add to the created issues. Default: ["security-incident", "high-severity"].'),
        },
        outputSchema: {
            created: z.number().describe('Number of issues successfully created'),
            failed: z.number().describe('Number of failed issue creation attempts'),
            results: z.array(z.object({
                incidentType: z.string(),
                issueNumber: z.number(),
                issueUrl: z.string().url(),
                status: z.enum(['created', 'failed']),
                error: z.string().optional(),
            })).describe('Detailed results for each issue creation attempt'),
        },
    },
    async (args) => {
        const result = await createGitHubIssuesHandler({
            repository: args.repository,
            incidents: args.incidents,
            labels: args.labels,
        });

        return {
            content: [{
                type: 'text' as const,
                text: `Created ${result.created} issue(s), ${result.failed} failed.`,
            }],
            structuredContent: result,
        };
    });
}


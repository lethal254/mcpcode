import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sendNotificationHandler } from './handler.js';

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

export function registerSendNotificationTool(server: McpServer) {
    server.registerTool("send-notification", {
        title: 'Send Email Notifications',
        description: 'Sends email notifications for security incidents based on severity-level email mapping. If a single defaultEmail is provided, it will be used for all severity levels. If severity-specific emails are provided, those will be used for their respective severities. If no emails are provided, an error will be returned. One email is sent per severity level, grouping all incidents of that severity together.',
        inputSchema: {
            incidents: z.object({
                critical: z.array(IncidentSchema).describe('Array of critical severity incidents'),
                high: z.array(IncidentSchema).describe('Array of high severity incidents'),
                medium: z.array(IncidentSchema).describe('Array of medium severity incidents'),
                low: z.array(IncidentSchema).describe('Array of low severity incidents'),
            }).describe('Incidents grouped by severity level. Use the output from extract-incident-data tool.'),
            emails: z.object({
                critical: z.array(z.string().email()).optional().describe('Email addresses for critical severity incidents. If not provided, defaultEmail will be used.'),
                high: z.array(z.string().email()).optional().describe('Email addresses for high severity incidents. If not provided, defaultEmail will be used.'),
                medium: z.array(z.string().email()).optional().describe('Email addresses for medium severity incidents. If not provided, defaultEmail will be used.'),
                low: z.array(z.string().email()).optional().describe('Email addresses for low severity incidents. If not provided, defaultEmail will be used.'),
                defaultEmail: z.string().email().optional().describe('Default email address to use for all severity levels if severity-specific emails are not provided. If only defaultEmail is provided, it will be used for all severities.'),
            }).describe('Email mapping by severity. Provide either defaultEmail (for all severities) or severity-specific emails, or both (severity-specific takes precedence).'),
        },
        outputSchema: {
            sent: z.number().describe('Number of successful email notifications sent'),
            failed: z.number().describe('Number of failed email notifications'),
            results: z.array(z.object({
                severity: z.enum(['critical', 'high', 'medium', 'low']),
                recipients: z.array(z.string().email()),
                incidentCount: z.number(),
                status: z.enum(['sent', 'failed']),
                error: z.string().optional(),
            })).describe('Detailed results for each severity level notification attempt'),
        },
    },
    async (args) => {
        const result = await sendNotificationHandler({
            incidents: args.incidents,
            emails: args.emails,
        });

        return {
            content: [{
                type: 'text' as const,
                text: `Sent ${result.sent} notification(s), ${result.failed} failed.`,
            }],
            structuredContent: result,
        };
    });
}


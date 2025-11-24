import * as z from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractIncidentDataHandler } from './handler.js';

// Base incident schema - reusable for all severity levels
const IncidentSchema = z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    incidentType: z.string(),
    affectedSystems: z.array(z.string()),
    timestamp: z.string().describe('ISO 8601 date string'),
    description: z.string(),
    stakeholders: z.array(z.string()),
    sourceFile: z.string(),
});

// Severity-specific schemas using the base
const CriticalIncidentSchema = IncidentSchema.extend({
    severity: z.literal('critical'),
});

const HighIncidentSchema = IncidentSchema.extend({
    severity: z.literal('high'),
});

const MediumIncidentSchema = IncidentSchema.extend({
    severity: z.literal('medium'),
});

const LowIncidentSchema = IncidentSchema.extend({
    severity: z.literal('low'),
});

export function registerExtractIncidentDataTool(server: McpServer) {
    server.registerTool("extract-incident-data", {
        title: 'Extract Incidents',
        description: 'Formats parsed document content for incident extraction. This tool returns the raw content in structured format. YOU MUST: Read the formattedContent.content field, extract all security incidents (each REPORT section), parse their fields, and return them grouped by severity in YOUR RESPONSE (not in the tool output). Return structure: { incidents: { critical: [...], high: [...], medium: [...], low: [...] } }. For each incident extract: severity (from SEVERITY field, map CRITICAL→critical, HIGH→high, MEDIUM→medium, LOW→low), incidentType (from report title, e.g., "SQL Injection Data Leak" → "SQL Injection"), affectedSystems (array from AFFECTED ASSET field), timestamp (from DATE DETECTED as ISO 8601), description (from DESCRIPTION field), stakeholders (extract contacts/IOCs), sourceFile (from formattedContent.sourceFile). The tool returns empty arrays as a template - you must populate and return the grouped structure in your response.',
        inputSchema: {
            parsedContent: z.unknown().describe('The parsed content from parse-document tool. This should be the "content" field from parse-document output. Can be any format - the AI will understand and extract what it needs.'),
            sourceFile: z.string().describe('The source file path or identifier. Used to track which file the data came from. Typically use the file path from scan-repository output.'),
            metadata: z.record(z.unknown()).optional().describe('Optional metadata from parse-document (e.g., frontmatter from Markdown files). Will be included in the formatted output for the AI to process.'),
        },
        outputSchema: {
            formattedContent: z.record(z.unknown()).describe('Formatted content object containing sourceFile and content/data fields with raw incident report text.'),
            incidents: z.object({
                critical: z.array(CriticalIncidentSchema).describe('Array of critical severity incidents'),
                high: z.array(HighIncidentSchema).describe('Array of high severity incidents'),
                medium: z.array(MediumIncidentSchema).describe('Array of medium severity incidents'),
                low: z.array(LowIncidentSchema).describe('Array of low severity incidents'),
            }).describe('Template structure for incidents grouped by severity. The tool returns empty arrays. YOU must extract incidents from formattedContent.content, parse each REPORT section, and return the populated structure in YOUR RESPONSE. Each incident needs: severity (normalize SEVERITY field), incidentType (from report title), affectedSystems (array from AFFECTED ASSET), timestamp (ISO 8601 from DATE DETECTED), description (from DESCRIPTION), stakeholders (extract from IOCs/contacts), sourceFile.'),
        },
    },
    async (args) => {
        const result = await extractIncidentDataHandler({
            parsedContent: args.parsedContent,
            sourceFile: args.sourceFile,
            metadata: args.metadata,
        });

        // Parse the formatted content to return as structured object
        const contentObject = JSON.parse(result.formattedContent);

        return {
            content: [{ type: 'text' as const, text: result.formattedContent }],
            structuredContent: {
                formattedContent: contentObject,
                incidents: {
                    critical: [],
                    high: [],
                    medium: [],
                    low: [],
                },
            },
        };
    });
}

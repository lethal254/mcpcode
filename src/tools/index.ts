import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerScanRepositoryTool } from './scan-repository/index.js';
import { registerParseDocumentTool } from './parse-document/index.js';
import { registerExtractIncidentDataTool } from './extract-incident-data/index.js';
import { registerSendNotificationTool } from './send-notification/index.js';
import { registerCreateGitHubIssuesTool } from './create-github-issues/index.js';

export function registerAllTools(server: McpServer) {
    registerScanRepositoryTool(server);
    registerParseDocumentTool(server);
    registerExtractIncidentDataTool(server);
    registerSendNotificationTool(server);
    registerCreateGitHubIssuesTool(server);
}

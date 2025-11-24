/**
 * Dumb Tool, Smart Model Pattern
 * 
 * This service simply formats and returns raw content for the AI to process.
 * The AI (calling this tool) will handle all extraction, grouping, and structuring.
 * 
 * No regex, no field mapping, no brittle parsing logic.
 * Just return the data and let the AI figure it out.
 */
export class IncidentExtractor {
    /**
     * Formats content for AI processing
     * Returns raw content in a clean, readable format
     * The AI will extract and structure the data
     */
    formatContentForExtraction(
        content: unknown,
        metadata: Record<string, unknown> | undefined,
        sourceFile: string
    ): string {
        // Combine metadata and content
        const combined: Record<string, unknown> = {
            sourceFile,
            ...(metadata || {}),
        };

        // If content is an object, merge it
        if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
            Object.assign(combined, content);
        } else if (typeof content === 'string') {
            // If content is a string (e.g., Markdown text), add it as 'content' field
            combined.content = content;
        } else {
            // For arrays or other types, include as-is
            combined.data = content;
        }

        // Return as formatted JSON string for the AI to process
        // The AI will understand the structure and extract what it needs
        return JSON.stringify(combined, null, 2);
    }

    /**
     * Formats multiple content items for batch processing
     */
    formatMultipleForExtraction(
        items: Array<{ content: unknown; metadata?: Record<string, unknown>; sourceFile: string }>
    ): string {
        const formatted = items.map(item => 
            JSON.parse(this.formatContentForExtraction(item.content, item.metadata, item.sourceFile))
        );
        
        return JSON.stringify(formatted, null, 2);
    }
}

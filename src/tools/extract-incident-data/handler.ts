import { IncidentExtractor } from '../../services/extractor.js';

/**
 * Dumb Tool Handler - Just formats and returns raw content
 * The AI calling this tool will do all the extraction and grouping
 */
export async function extractIncidentDataHandler({
    parsedContent,
    sourceFile,
    metadata,
}: {
    parsedContent: unknown; // The content from parse-document output
    sourceFile: string; // The file path or identifier
    metadata?: Record<string, unknown>; // Optional metadata from parse-document
}): Promise<{
    formattedContent: string; // Raw formatted content for AI to process (used in content field)
}> {
    const extractor = new IncidentExtractor();
    
    // Simply format the content - no extraction, no grouping, no processing
    // The AI will handle all of that
    const formattedContent = extractor.formatContentForExtraction(
        parsedContent,
        metadata,
        sourceFile
    );

    return {
        formattedContent,
    };
}

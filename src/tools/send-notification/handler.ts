import { EmailService, Incident } from '../../services/email.js';
import { Severity } from '../../config/types.js';

export interface SendNotificationInput {
    incidents: {
        critical: Incident[];
        high: Incident[];
        medium: Incident[];
        low: Incident[];
    };
    emails: {
        critical?: string[];
        high?: string[];
        medium?: string[];
        low?: string[];
        defaultEmail?: string;
    };
}

export interface NotificationResult {
    severity: Severity;
    recipients: string[];
    incidentCount: number;
    status: 'sent' | 'failed';
    error?: string;
}

export async function sendNotificationHandler(
    input: SendNotificationInput
): Promise<{
    sent: number;
    failed: number;
    results: NotificationResult[];
}> {
    const { incidents, emails } = input;
    const emailService = new EmailService();
    const results: NotificationResult[] = [];
    let sent = 0;
    let failed = 0;

    // Determine email mapping for each severity
    const getRecipients = (severity: Severity): string[] => {
        // Check if severity-specific emails exist
        const severityEmails = emails[severity];
        if (severityEmails && severityEmails.length > 0) {
            return severityEmails;
        }
        // Fall back to default email
        if (emails.defaultEmail) {
            return [emails.defaultEmail];
        }
        // No emails provided
        return [];
    };

    // Validate that at least one email is provided
    const hasAnyEmail = emails.defaultEmail || 
        emails.critical?.length || 
        emails.high?.length || 
        emails.medium?.length || 
        emails.low?.length;

    if (!hasAnyEmail) {
        throw new Error('Please provide at least one email address. Use defaultEmail for all severities, or specify emails for specific severity levels.');
    }

    // Process each severity level
    const severities: Severity[] = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severities) {
        const severityIncidents = incidents[severity];
        if (severityIncidents.length === 0) {
            continue; // Skip if no incidents of this severity
        }

        const recipients = getRecipients(severity);
        if (recipients.length === 0) {
            results.push({
                severity,
                recipients: [],
                incidentCount: severityIncidents.length,
                status: 'failed',
                error: 'No email recipients specified for this severity level',
            });
            failed++;
            continue;
        }

        const result = await emailService.sendNotification(severity, severityIncidents, recipients);
        
        if (result.success) {
            results.push({
                severity,
                recipients,
                incidentCount: severityIncidents.length,
                status: 'sent',
            });
            sent++;
        } else {
            results.push({
                severity,
                recipients,
                incidentCount: severityIncidents.length,
                status: 'failed',
                error: result.error,
            });
            failed++;
        }
    }

    return {
        sent,
        failed,
        results,
    };
}


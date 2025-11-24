import { Resend } from 'resend';
import { Severity } from '../config/types.js';

export interface Incident {
    severity: Severity;
    incidentType: string;
    affectedSystems: string[];
    timestamp: string;
    description: string;
    stakeholders: string[];
    sourceFile: string;
}

export class EmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor(apiKey?: string, fromEmail?: string) {
        const key = apiKey || process.env.RESEND_API_KEY;
        if (!key) {
            throw new Error('Resend API key is required. Set RESEND_API_KEY environment variable or pass apiKey to constructor.');
        }
        this.resend = new Resend(key);
        this.fromEmail = fromEmail || process.env.RESEND_FROM_EMAIL || 'notifications@example.com';
    }

    /**
     * Renders email subject for incidents
     */
    private renderSubject(severity: Severity, incidentCount: number): string {
        const severityLabel = severity.toUpperCase();
        return `[${severityLabel}] Security Incident Alert - ${incidentCount} incident${incidentCount > 1 ? 's' : ''}`;
    }

    /**
     * Renders email body HTML for incidents
     */
    private renderBody(severity: Severity, incidents: Incident[]): string {
        const severityLabel = severity.toUpperCase();
        let html = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .header { background-color: ${this.getSeverityColor(severity)}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .incident { background-color: white; margin: 15px 0; padding: 15px; border-left: 4px solid ${this.getSeverityColor(severity)}; border-radius: 4px; }
                    .incident-header { font-weight: bold; font-size: 1.1em; margin-bottom: 10px; }
                    .field { margin: 8px 0; }
                    .field-label { font-weight: bold; color: #666; }
                    .field-value { margin-left: 10px; }
                    .footer { padding: 20px; text-align: center; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Security Incident Alert - ${severityLabel} Severity</h2>
                    <p>Total Incidents: ${incidents.length}</p>
                </div>
                <div class="content">
        `;

        incidents.forEach((incident, index) => {
            html += `
                    <div class="incident">
                        <div class="incident-header">Incident #${index + 1}: ${incident.incidentType}</div>
                        <div class="field">
                            <span class="field-label">Severity:</span>
                            <span class="field-value">${incident.severity.toUpperCase()}</span>
                        </div>
                        <div class="field">
                            <span class="field-label">Affected Systems:</span>
                            <span class="field-value">${incident.affectedSystems.join(', ') || 'N/A'}</span>
                        </div>
                        <div class="field">
                            <span class="field-label">Timestamp:</span>
                            <span class="field-value">${incident.timestamp}</span>
                        </div>
                        <div class="field">
                            <span class="field-label">Description:</span>
                            <span class="field-value">${incident.description}</span>
                        </div>
                        <div class="field">
                            <span class="field-label">Stakeholders:</span>
                            <span class="field-value">${incident.stakeholders.join(', ') || 'N/A'}</span>
                        </div>
                        <div class="field">
                            <span class="field-label">Source File:</span>
                            <span class="field-value">${incident.sourceFile}</span>
                        </div>
                    </div>
            `;
        });

        html += `
                </div>
                <div class="footer">
                    <p>This is an automated notification from the Security Incident Management System.</p>
                </div>
            </body>
            </html>
        `;

        return html;
    }

    /**
     * Gets color for severity level
     */
    private getSeverityColor(severity: Severity): string {
        switch (severity) {
            case 'critical':
                return '#dc3545';
            case 'high':
                return '#fd7e14';
            case 'medium':
                return '#ffc107';
            case 'low':
                return '#28a745';
            default:
                return '#6c757d';
        }
    }

    /**
     * Sends email notification for incidents of a specific severity
     */
    async sendNotification(
        severity: Severity,
        incidents: Incident[],
        recipients: string[]
    ): Promise<{ success: boolean; error?: string }> {
        if (incidents.length === 0) {
            return { success: true }; // No incidents to notify about
        }

        if (recipients.length === 0) {
            return { success: false, error: 'No recipients specified' };
        }

        try {
            const subject = this.renderSubject(severity, incidents.length);
            const html = this.renderBody(severity, incidents);

            const result = await this.resend.emails.send({
                from: this.fromEmail,
                to: recipients,
                subject,
                html,
            });

            if (result.error) {
                return { success: false, error: result.error.message || 'Unknown error' };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}


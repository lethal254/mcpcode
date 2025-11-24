export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityIncident {
    severity: Severity;
    incidentType: string;
    affectedSystems: string[];
    timestamp: Date;
    description: string;
    stakeholders: string[];
    sourceFile: string;
    rawData: unknown;
}

export interface EmailRoutingRule {
    severity: string[];
    incidentTypes: string[];
    recipients: string[];
    subjectTemplate: string;
    bodyTemplate: string;
}

export interface RepositoryFile {
    path: string;
    size: number;
    lastModified: Date;
    sha: string;
    downloadUrl?: string;
}



import React from 'react';

export interface Client {
name: string;
address: string;
fyPeriodEnd: string; // YYYY-MM-DD format
frf: string;
isListed?: boolean;
}

export interface AuditReportDetails {
engagementPartnerName: string;
designation: string; // Replaces membershipNumber
auditFirmName: string;
reportDate: string; // YYYY-MM-DD format
reportPlace: string;
keyAuditMatters: string;
udin: string; // Added for UDIN
firmRegistrationNumber: string; // Added for firm registration
includeOtherInformation?: boolean;
}



export interface TeamMember {
id: string;
name: string;
role: string;
 
 
}

export interface AuditTabProps {
@@ -34,6 +38,7 @@
generatedReport?: string | null;
teamMembers?: TeamMember[];
setTeamMembers?: React.Dispatch<React.SetStateAction<TeamMember[]>>;
 
}

export interface AuditTabInfo {

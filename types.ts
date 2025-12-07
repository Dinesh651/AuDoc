
import React from 'react';

export interface Client {
  name: string;
  address: string;
  fyPeriodEnd: string; // YYYY-MM-DD format
  frf: string;
  isListed?: boolean;
  ownerUserId?: string;
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
  email: string;  // ADD THIS
  status?: 'invited' | 'active';  // ADD THIS
  invitedAt?: string;  // ADD THIS
}

export interface AuditTabProps {
  client: Client;
  engagementId: string;
  onGenerateReport?: (reportDetails: AuditReportDetails) => string;
  generatedReport?: string | null;
  teamMembers?: TeamMember[];
  setTeamMembers?: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

export interface AuditTabInfo {
  id: string;
  title: string;
  component: React.FC<AuditTabProps>;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

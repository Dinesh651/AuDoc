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
  designation: string; 
  auditFirmName: string;
  reportDate: string; // YYYY-MM-DD format
  reportPlace: string;
  keyAuditMatters: string;
  udin: string; 
  firmRegistrationNumber: string; 
  includeOtherInformation?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string; // Job Title (e.g. Engagement Partner, Audit Manager)
  accessLevel: 'admin' | 'member'; // System Permission Level
  userId?: string; // Links to the Firebase Auth UID
  email?: string;
}

export interface AuditTabProps {
  client: Client;
  engagementId: string;
  currentUser: { uid: string; displayName: string | null; email: string | null };
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

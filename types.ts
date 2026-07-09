
import React from 'react';

export interface Client {
  name: string;
  address: string;
  fyPeriodEnd: string; // YYYY-MM-DD format
  frf: string;
  isListed?: boolean;
  ownerUserId?: string;
}

export type OpinionType = 'Unmodified' | 'Qualified' | 'Adverse' | 'Disclaimer';

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
  opinionType?: OpinionType;
  basisForModification?: string; // required for Qualified / Adverse / Disclaimer (NSA 705)
  emphasisOfMatter?: string; // optional (NSA 706)
  otherMatter?: string; // optional (NSA 706)
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status?: 'invited' | 'active';
  invitedAt?: string;
}

export interface SectionSignOff {
  preparedBy?: string;
  preparedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface WorkingPaper {
  id: string;
  category: 'prev_year_financials' | 'current_year_financials' | 'other';
  name: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  description?: string;
}

export interface AuditTabProps {
  client: Client;
  engagementId: string;
  onGenerateReport?: (reportDetails: AuditReportDetails) => string;
  generatedReport?: string | null;
  teamMembers?: TeamMember[];
  setTeamMembers?: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  isClosed?: boolean;
}

export interface AuditTabInfo {
  id: string;
  title: string;
  component: React.FC<AuditTabProps>;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

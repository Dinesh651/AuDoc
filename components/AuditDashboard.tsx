
import React, { useState, useCallback, useEffect } from 'react';
import { Client, AuditTabInfo, AuditReportDetails, TeamMember } from '../types';
import ReportingAndConclusion from './ReportingAndConclusion';
import { generateAuditReport } from '../services/auditReportService';
import Sidebar from './Sidebar';
import Header from './Header';
import FileTextIcon from './icons/FileTextIcon';
import ChecklistIcon from './icons/ChecklistIcon';
import CalculatorIcon from './icons/CalculatorIcon';
import ChatIcon from './icons/ChatIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DocumentIcon from './icons/DocumentIcon';
import Communication from './Communication';
import Basics from './Basics';
import PlanningAndRiskAssessment from './PlanningAndRiskAssessment';
import MaterialityAndSampling from './MaterialityAndSampling';
import AuditEvidence from './AuditEvidence';
import { setSectionData, subscribeToSection, checkEngagementPermissions } from '../services/db';
import { auth } from '../firebase';

interface AuditDashboardProps {
  client: Client;
  engagementId: string;
  onBack: () => void;
}

const AuditDashboard: React.FC<AuditDashboardProps> = ({ client, engagementId, onBack }) => {
  const auditTabs: AuditTabInfo[] = [
    { id: 'basics', title: 'Basics', icon: FileTextIcon, component: Basics },
    { id: 'romm', title: 'Planning and Risk Assessment', icon: ChecklistIcon, component: PlanningAndRiskAssessment },
    { id: 'materiality', title: 'Materiality & Sampling', icon: CalculatorIcon, component: MaterialityAndSampling },
    { id: 'auditEvidence', title: 'Audit Evidence', icon: ClipboardIcon, component: AuditEvidence },
    { id: 'communication', title: 'Communication', icon: ChatIcon, component: Communication },
    { id: 'reporting', title: 'Reporting & Conclusion', icon: DocumentIcon, component: ReportingAndConclusion },
  ];

  const [activeTabId, setActiveTabId] = useState<string>(auditTabs[0].id);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Permission State
  const [isReadOnly, setIsReadOnly] = useState<boolean>(true); // Default to safe state
  const [checkingPerms, setCheckingPerms] = useState<boolean>(true);

  // Check Permissions on Load
  useEffect(() => {
      const checkAccess = async () => {
          if (auth.currentUser) {
              const { isReadOnly } = await checkEngagementPermissions(engagementId, auth.currentUser.uid);
              setIsReadOnly(isReadOnly);
              setCheckingPerms(false);
          }
      };
      checkAccess();
  }, [engagementId]);

  // Sync team members from DB (Array of objects in DB to Array in state)
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'basics/teamMembers', (data) => {
      if (data) {
        // Firebase returns objects keyed by ID, convert to array
        const membersArray = Object.values(data) as TeamMember[];
        setTeamMembers(membersArray);
      } else {
        setTeamMembers([]);
      }
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Wrapper for setTeamMembers to also update DB (Used by Basics Tab mainly)
  const handleSetTeamMembers = (action: React.SetStateAction<TeamMember[]>) => {
    // In new logic, we add via specific DB calls in Basics.tsx, 
    // but this prop is kept for compatibility if needed.
    // The subscribeToSection above handles the sync.
  };

  const handleGenerateReport = useCallback((reportDetails: AuditReportDetails) => {
    const report = generateAuditReport(client, reportDetails);
    setGeneratedReport(report);
    return report; 
  }, [client]);

  const ActiveTabComponent = auditTabs.find((tab) => tab.id === activeTabId)?.component;

  if (checkingPerms) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="text-slate-500">Verifying access...</div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar 
        tabs={auditTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        isSidebarOpen={isSidebarOpen}
      />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black opacity-50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Header 
          client={client} 
          onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
          onBack={onBack}
        />

        {isReadOnly && (
            <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded shadow-sm flex items-center">
                <svg className="w-5 h-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <p className="text-sm text-amber-700 font-medium">You are viewing this engagement in <span className="font-bold">Read-Only</span> mode.</p>
            </div>
        )}
        
        <div className="mt-6">
          {ActiveTabComponent && (
            <ActiveTabComponent
              client={client}
              engagementId={engagementId}
              onGenerateReport={handleGenerateReport}
              generatedReport={generatedReport}
              teamMembers={teamMembers}
              setTeamMembers={handleSetTeamMembers}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditDashboard;

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
import { setSectionData, subscribeToSection } from '../services/db';

interface AuditDashboardProps {
  client: Client;
  engagementId: string;
  currentUser: { uid: string; displayName: string | null; email: string | null };
  onBack: () => void;
}

const AuditDashboard: React.FC<AuditDashboardProps> = ({ client, engagementId, currentUser, onBack }) => {
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
  const [isTeamLoaded, setIsTeamLoaded] = useState(false);

  // Sync team members from DB
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'basics/teamMembers', (data) => {
      if (data && Array.isArray(data)) {
        setTeamMembers(data);
        setIsTeamLoaded(true);
      } else {
        // If no team members exist (new engagement), initialize current user as Admin
        if (!isTeamLoaded) {
            const initialAdmin: TeamMember = {
                id: currentUser.uid,
                name: currentUser.displayName || 'Audit Lead',
                role: 'Engagement Partner', // Default Job Title
                accessLevel: 'admin',
                userId: currentUser.uid,
                email: currentUser.email || undefined
            };
            // We set it directly here, which triggers the 'handleSetTeamMembers' logic if we called it, 
            // but since we are inside the subscription callback, we should update DB directly to avoid loops 
            // or just set local state and let the user "save" it. 
            // Better approach: Write to DB immediately for the initial setup.
            setSectionData(engagementId, 'basics/teamMembers', [initialAdmin]);
            setTeamMembers([initialAdmin]);
            setIsTeamLoaded(true);
        }
      }
    });
    return () => unsubscribe();
  }, [engagementId, currentUser, isTeamLoaded]);

  // Wrapper for setTeamMembers to also update DB
  const handleSetTeamMembers = (action: React.SetStateAction<TeamMember[]>) => {
    let newMembers;
    if (typeof action === 'function') {
        newMembers = action(teamMembers);
    } else {
        newMembers = action;
    }
    setTeamMembers(newMembers);
    setSectionData(engagementId, 'basics/teamMembers', newMembers);
  };

  const handleGenerateReport = useCallback((reportDetails: AuditReportDetails) => {
    const report = generateAuditReport(client, reportDetails);
    setGeneratedReport(report);
    return report; 
  }, [client]);

  const ActiveTabComponent = auditTabs.find((tab) => tab.id === activeTabId)?.component;

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
        
        <div className="mt-6">
          {ActiveTabComponent && (
            <ActiveTabComponent
              client={client}
              engagementId={engagementId}
              currentUser={currentUser}
              onGenerateReport={handleGenerateReport}
              generatedReport={generatedReport}
              teamMembers={teamMembers}
              setTeamMembers={handleSetTeamMembers}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditDashboard;

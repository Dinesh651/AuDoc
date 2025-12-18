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
import { setSectionData, subscribeToSection, processTeamMemberInvitations } from '../services/db';

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

  // Sync team members from DB - FIXED: Changed subscription path
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'basics', (data) => {
      if (data && data.teamMembers) {
        setTeamMembers(Array.isArray(data.teamMembers) ? data.teamMembers : []);
      }
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Wrapper for setTeamMembers to also update DB
  const handleSetTeamMembers = async (action: React.SetStateAction<TeamMember[]>) => {
    let newMembers;
    if (typeof action === 'function') {
        newMembers = action(teamMembers);
    } else {
        newMembers = action;
    }
    setTeamMembers(newMembers);
    
    // Save to database under basics section
    await setSectionData(engagementId, 'basics', { teamMembers: newMembers });
    
    // Process invitations for members with 'invited' status
    if (client.ownerUserId) {
      try {
        await processTeamMemberInvitations(engagementId, newMembers, client.ownerUserId);
      } catch (error) {
        console.error('Error processing invitations:', error);
      }
    }
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

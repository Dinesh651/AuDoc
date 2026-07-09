
import React, { useState, useCallback, useEffect } from 'react';
import { Client, AuditTabInfo, AuditReportDetails, TeamMember, SectionSignOff } from '../types';
import SignOffBar from './SignOffBar';
import ReportingAndConclusion from './ReportingAndConclusion';
import { generateAuditReport } from '../services/auditReportService';
import { generateFullEngagementReport } from '../services/fullEngagementReportService';
import Sidebar from './Sidebar';
import Header from './Header';
import FileTextIcon from './icons/FileTextIcon';
import ChecklistIcon from './icons/ChecklistIcon';
import CalculatorIcon from './icons/CalculatorIcon';
import ChatIcon from './icons/ChatIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DocumentIcon from './icons/DocumentIcon';
import FolderIcon from './icons/FolderIcon';
import Communication from './Communication';
import Basics from './Basics';
import PlanningAndRiskAssessment from './PlanningAndRiskAssessment';
import MaterialityAndSampling from './MaterialityAndSampling';
import AuditEvidence from './AuditEvidence';
import WorkingPapers from './WorkingPapers';
import TrialBalance from './TrialBalance';
import TableIcon from './icons/TableIcon';
import {
  setSectionData,
  subscribeToSection,
  processTeamMemberInvitations,
  closeEngagement,
  reopenEngagement,
  subscribeToEngagementMeta,
  getFullEngagementData,
} from '../services/db';
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
    { id: 'trialBalance', title: 'Trial Balance', icon: TableIcon, component: TrialBalance },
    { id: 'auditEvidence', title: 'Audit Evidence', icon: ClipboardIcon, component: AuditEvidence },
    { id: 'communication', title: 'Communication', icon: ChatIcon, component: Communication },
    { id: 'reporting', title: 'Reporting & Conclusion', icon: DocumentIcon, component: ReportingAndConclusion },
    { id: 'workingPapers', title: 'Working Papers', icon: FolderIcon, component: WorkingPapers },
  ];

  const [activeTabId, setActiveTabId] = useState<string>(auditTabs[0].id);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [signOffs, setSignOffs] = useState<Record<string, SectionSignOff>>({});

  // Engagement closed state
  const [isClosed, setIsClosed] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [togglingClose, setTogglingClose] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);

  const isOwner = client.ownerUserId === auth.currentUser?.uid;

  // Sync engagement meta (closed status)
  useEffect(() => {
    const unsubscribe = subscribeToEngagementMeta(engagementId, (meta) => {
      setIsClosed(meta.isClosed);
      setClosedAt(meta.closedAt ?? null);
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Sync team members from DB
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'basics/teamMembers', (data) => {
      if (data) setTeamMembers(data);
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Sync section sign-offs (NSA 230) for progress tracking
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'signoffs', (data) => {
      setSignOffs(data || {});
    });
    return () => unsubscribe();
  }, [engagementId]);

  const handleSetTeamMembers = async (action: React.SetStateAction<TeamMember[]>) => {
    let newMembers: TeamMember[];
    if (typeof action === 'function') {
      newMembers = action(teamMembers);
    } else {
      newMembers = action;
    }
    setTeamMembers(newMembers);
    await setSectionData(engagementId, 'basics/teamMembers', newMembers);
    if (client.ownerUserId) {
      await processTeamMemberInvitations(engagementId, newMembers, client.ownerUserId);
    }
  };

  const handleGenerateReport = useCallback(
    (reportDetails: AuditReportDetails) => {
      const report = generateAuditReport(client, reportDetails);
      setGeneratedReport(report);
      return report;
    },
    [client]
  );

  const handleToggleClose = async () => {
    if (!client.ownerUserId) return;
    setTogglingClose(true);
    try {
      if (isClosed) {
        if (!window.confirm('Reopen this engagement for editing?')) return;
        await reopenEngagement(engagementId, client.ownerUserId);
      } else {
        if (!window.confirm('Close this engagement? It will become read-only. You can reopen it at any time.')) return;
        await closeEngagement(engagementId, client.ownerUserId);
      }
    } finally {
      setTogglingClose(false);
    }
  };

  const handleGenerateFullDocs = async () => {
    setGeneratingDocs(true);
    try {
      const data = await getFullEngagementData(engagementId);
      const html = generateFullEngagementReport(client, data);
      const filename = `${client.name.replace(/\s+/g, '_')}_FullAuditFile_${client.fyPeriodEnd}.doc`;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate documentation: ' + err.message);
    } finally {
      setGeneratingDocs(false);
    }
  };

  const ActiveTabComponent = auditTabs.find((tab) => tab.id === activeTabId)?.component;

  // Engagement progress based on section sign-offs (reviewed = complete, prepared = half)
  const progress = auditTabs.reduce((acc, tab) => {
    const so = signOffs[tab.id];
    if (so?.reviewedBy) return acc + 1;
    if (so?.preparedBy) return acc + 0.5;
    return acc;
  }, 0);
  const progressPercent = Math.round((progress / auditTabs.length) * 100);
  const reviewedCount = auditTabs.filter((tab) => signOffs[tab.id]?.reviewedBy).length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        tabs={auditTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        isSidebarOpen={isSidebarOpen}
        signOffs={signOffs}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Header
          client={client}
          onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
          onBack={onBack}
        />

        {/* Utility bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            {isClosed ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Closed — Read Only
                {closedAt && <span className="text-xs font-normal opacity-75">({new Date(closedAt).toLocaleDateString()})</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                In Progress
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 ml-2" title={`${reviewedCount} of ${auditTabs.length} sections reviewed`}>
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">{progressPercent}% signed off</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateFullDocs}
              disabled={generatingDocs}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              {generatingDocs ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              )}
              {generatingDocs ? 'Generating...' : 'Generate Full Documentation'}
            </button>

            {isOwner && (
              <button
                onClick={handleToggleClose}
                disabled={togglingClose}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 shadow-sm ${
                  isClosed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isClosed
                      ? 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'
                      : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'}
                  />
                </svg>
                {isClosed ? 'Reopen Engagement' : 'Close Engagement'}
              </button>
            )}
          </div>
        </div>

        {/* Closed banner */}
        {isClosed && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">This engagement is closed and read-only.</p>
              <p className="text-xs text-amber-600 mt-0.5">
                All data is available for review. Files in Working Papers can still be downloaded.
                {isOwner ? ' Use "Reopen Engagement" to enable editing.' : ' Contact the engagement owner to reopen.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab content — pointer-events-none when closed (WorkingPapers handles its own download links) */}
        <div className={`mt-2 ${isClosed ? 'pointer-events-none select-none' : ''}`}>
          {ActiveTabComponent && (
            <ActiveTabComponent
              client={client}
              engagementId={engagementId}
              onGenerateReport={handleGenerateReport}
              generatedReport={generatedReport}
              teamMembers={teamMembers}
              setTeamMembers={handleSetTeamMembers}
              isClosed={isClosed}
            />
          )}
          <SignOffBar
            engagementId={engagementId}
            sectionId={activeTabId}
            signOff={signOffs[activeTabId]}
            isClosed={isClosed}
          />
        </div>
      </main>
    </div>
  );
};

export default AuditDashboard;

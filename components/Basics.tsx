import React, { useState, useRef, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection, processTeamMemberInvitations } from '../services/db';

const DraftModal: React.FC<{
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onContentChange: (newContent: string) => void;
}> = ({ isOpen, title, content, onClose, onContentChange }) => {
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 transform transition-all"
        tabIndex={-1}
      >
        <div className="p-6 border-b">
          <h4 className="text-lg font-bold text-slate-800">{title}</h4>
        </div>
        <div className="p-6">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-64 p-3 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            aria-label="Draft content"
          />
        </div>
        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-b-lg">
          <button
            onClick={handleCopyToClipboard}
            className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md transition-colors relative"
          >
            Copy to Clipboard
            {showCopyNotification && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md">
                Copied!
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-transform transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable Date Input - Standard HTML5 behavior
const DateInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ value, onChange }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    />
  );
};

const Basics: React.FC<AuditTabProps> = ({ client, engagementId, teamMembers = [], setTeamMembers }) => {
  const [data, setData] = useState({
    agmDate: '',
    appointmentDate: '',
    previousAuditor: '',
    partnerName: '',
    partnerMembership: '',
    acceptanceChecks: {
      integrity: false,
      competence: false,
      ethics: false,
      preconditions: false,
    },
    sa210Checks: {
      preconditions: false,
      responsibilities: false,
      termsAgreed: false,
    },
    ethicsChecks: {
      integrity: false,
      objectivity: false,
      competence: false,
      confidentiality: false,
      behavior: false,
    }
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'basics', (fetchedData) => {
      if (fetchedData) {
        // Load team members if present and setTeamMembers is available
        if (fetchedData.teamMembers && setTeamMembers) {
          setTeamMembers(fetchedData.teamMembers);
        }
        
        // Exclude teamMembers from data state as it's handled separately
        const { teamMembers: _, ...rest } = fetchedData;
        setData(prev => ({ ...prev, ...rest }));
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId, setTeamMembers]);

  // Helper to update and save
  const updateData = (updates: Partial<typeof data>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    if (isLoaded) {
      updateSectionData(engagementId, 'basics', updates);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Specific update for nested objects
  const updateNested = (section: 'acceptanceChecks' | 'sa210Checks' | 'ethicsChecks', key: string) => {
    const newSection = {
      ...data[section],
      [key]: !data[section][key as keyof typeof data[typeof section]]
    };
    updateData({ [section]: newSection });
  };

  // Local state for UI inputs
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Draft Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  const addTeamMember = async () => {
    if (newMemberName.trim() && newMemberRole.trim() && newMemberEmail.trim() && setTeamMembers) {
      if (!validateEmail(newMemberEmail)) {
        setEmailError('Please enter a valid email address');
        return;
      }
      
      // Check for duplicate emails
      if (teamMembers.some(m => m.email?.toLowerCase() === newMemberEmail.toLowerCase())) {
        setEmailError('This email is already in the team');
        return;
      }
      
      const newMember = {
        id: Date.now().toString(),
        name: newMemberName,
        role: newMemberRole,
        email: newMemberEmail.toLowerCase(),
        status: 'invited' as const,
        invitedAt: new Date().toISOString()
      };
      
      const updatedMembers = [...teamMembers, newMember];
      setTeamMembers(updatedMembers);
      
      // Save to Firebase and process invitations
      await updateSectionData(engagementId, 'basics', { teamMembers: updatedMembers });
      
      if (client.ownerUserId) {
        await processTeamMemberInvitations(engagementId, updatedMembers, client.ownerUserId);
      }
      
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberEmail('');
      setEmailError('');
    }
  };

  const removeTeamMember = async (id: string) => {
    if (setTeamMembers) {
      const updatedMembers = teamMembers.filter((m) => m.id !== id);
      setTeamMembers(updatedMembers);
      await updateSectionData(engagementId, 'basics', { teamMembers: updatedMembers });
    }
  };

  const handleOpenDraft = () => {
    const formattedDate = new Date(client.fyPeriodEnd + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const template = `Date: ${today}

To the Board of Directors of ${client.name},

1. Objective and Scope of the Audit
You have requested that we audit the financial statements of ${client.name}, which comprise the Statement of Financial Position as at ${formattedDate}, and the Statement of Profit or Loss and Other Comprehensive Income, Statement of Changes in Equity, and Statement of Cash Flows for the year then ended, and notes to the financial statements, including a summary of significant accounting policies. We are pleased to confirm our acceptance and our understanding of this audit engagement by means of this letter.

The objective of our audit is to express an opinion on whether the financial statements are prepared, in all material respects, in accordance with ${client.frf} (the "applicable financial reporting framework").

2. Responsibilities of the Auditor
We will conduct our audit in accordance with Nepal Standards on Auditing (NSAs). Those standards require that we comply with ethical requirements and plan and perform the audit to obtain reasonable assurance about whether the financial statements are free from material misstatement. An audit involves performing procedures to obtain audit evidence about the amounts and disclosures in the financial statements.

3. Responsibilities of Management
Our audit will be conducted on the basis that management and, where appropriate, those charged with governance acknowledge and understand that they have responsibility:
(a) For the preparation and fair presentation of the financial statements in accordance with the applicable financial reporting framework;
(b) For such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error; and
(c) To provide us with:
    (i) Access to all information of which management is aware that is relevant to the preparation of the financial statements such as records, documentation and other matters;
    (ii) Additional information that we may request from management for the purpose of the audit; and
    (iii) Unrestricted access to persons within the entity from whom we determine it necessary to obtain audit evidence.

4. Reporting
We expect to issue an audit report in accordance with NSA 700 (Revised). The form and content of our report may need to be amended in the light of our audit findings.

Please sign and return the attached copy of this letter to indicate your acknowledgement of, and agreement with, the arrangements for our audit of the financial statements including our respective responsibilities.

Yours sincerely,

________________________
[Engagement Partner Name]
[Firm Name]

Acknowledged and agreed on behalf of ${client.name} by:
________________________
(Signature)
Name: __________________
Designation: ___________
Date: __________________
`;
    setDraftContent(template);
    setDraftModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Section 1: Appointment of Auditor */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">1. Appointment of Auditor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Date of AGM / Appointment</label>
            <DateInput
              value={data.agmDate}
              onChange={(e) => updateData({ agmDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Appointment Letter Date</label>
            <DateInput
              value={data.appointmentDate}
              onChange={(e) => updateData({ appointmentDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Previous Auditor (if any)</label>
            <input
              type="text"
              value={data.previousAuditor}
              onChange={(e) => updateData({ previousAuditor: e.target.value })}
              placeholder="Name of previous firm"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Acceptance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">2. Client Acceptance & Continuance</h3>
        <p className="text-sm text-slate-500 mb-4">Confirm the following before accepting the engagement (SQC 1):</p>
        <div className="space-y-3">
          {[
            { key: 'integrity', label: 'We have considered the integrity of the client and found no significant issues.' },
            { key: 'competence', label: 'The engagement team has the necessary competence, capabilities, and time.' },
            { key: 'ethics', label: 'The firm and the team can comply with relevant ethical requirements.' },
            { key: 'preconditions', label: 'Preconditions for an audit (acceptable FRF, management responsibility) are present.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center">
              <input
                type="checkbox"
                checked={data.acceptanceChecks[item.key as keyof typeof data.acceptanceChecks]}
                onChange={() => updateNested('acceptanceChecks', item.key)}
                className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-3 text-slate-700 text-sm">{item.label}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Terms of Engagement (NSA 210) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-cyan-500">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">3. Agreeing the Terms of Audit Engagements (NSA 210)</h3>
            <p className="text-sm text-slate-500 mb-4">Ensure that the basis for the audit has been agreed upon with management.</p>
          </div>
          <button
            onClick={handleOpenDraft}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-50 text-cyan-700 font-medium rounded-md hover:bg-cyan-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Draft Engagement Letter</span>
          </button>
        </div>
        <div className="space-y-3">
          {[
            { key: 'preconditions', label: 'Preconditions for an audit are present (e.g., acceptable FRF).' },
            { key: 'responsibilities', label: 'Management acknowledges their responsibilities (FS preparation, Internal Control, Access).' },
            { key: 'termsAgreed', label: 'Terms of the engagement have been agreed upon with management.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center">
              <input
                type="checkbox"
                checked={data.sa210Checks[item.key as keyof typeof data.sa210Checks]}
                onChange={() => updateNested('sa210Checks', item.key)}
                className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-3 text-slate-700 text-sm">{item.label}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Engagement Partner */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">4. Engagement Partner</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Engagement Partner Name</label>
            <input
              type="text"
              value={data.partnerName}
              onChange={(e) => updateData({ partnerName: e.target.value })}
              placeholder="e.g., CA. John Doe"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Membership Number</label>
            <input
              type="text"
              value={data.partnerMembership}
              onChange={(e) => updateData({ partnerMembership: e.target.value })}
              placeholder="e.g., 1234"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Audit Team */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-teal-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">5. Audit Team Structure</h3>
        <p className="text-sm text-slate-600 mb-4">Add team members with their email addresses. They will automatically get access when they sign in.</p>
        
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Name"
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
          <div>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => {
                setNewMemberEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="Email (Gmail)"
              className={`w-full p-2.5 bg-slate-50 border ${emailError ? 'border-red-500' : 'border-slate-300'} rounded-md focus:ring-2 focus:ring-indigo-500`}
            />
            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              placeholder="Role"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addTeamMember}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </div>
        
        {teamMembers.length > 0 ? (
          <div className="overflow-hidden border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{member.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {member.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Invited</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => removeTeamMember(member.id)} className="text-red-600 hover:text-red-900">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 italic text-sm">No team members added yet.</p>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-xs text-blue-700">
            <strong>How it works:</strong> Team members will automatically receive access when they sign in with their Gmail account.
          </p>
        </div>
      </div>

      {/* Section 6: Overall Objective (NSA 200) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
        <h3 className="text-xl font-bold text-slate-800 mb-2">6. Overall Objectives of the Independent Auditor (NSA 200)</h3>
        <div className="bg-orange-50 p-4 rounded-md text-slate-700 text-sm leading-relaxed border border-orange-100">
          <p className="mb-2 font-semibold">In conducting an audit of financial statements, our overall objectives are:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, thereby enabling the auditor to express an opinion on whether the financial statements are prepared, in all material respects, in accordance with an applicable financial reporting framework; and</li>
            <li>To report on the financial statements, and communicate as required by the NSAs, in accordance with the auditor's findings.</li>
          </ul>
        </div>
      </div>

      {/* Section 7: Code of Ethics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">7. Code of Ethics Compliance</h3>
        <p className="text-sm text-slate-500 mb-4">Confirm adherence to the Fundamental Principles (ICAN Code of Ethics / IESBA Code):</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'integrity', label: 'Integrity: To be straightforward and honest in all professional and business relationships.' },
            { key: 'objectivity', label: 'Objectivity: Not to compromise professional judgment because of bias or conflict of interest.' },
            { key: 'competence', label: 'Professional Competence and Due Care: To maintain professional knowledge and skill.' },
            { key: 'confidentiality', label: 'Confidentiality: To respect the confidentiality of information acquired.' },
            { key: 'behavior', label: 'Professional Behavior: To comply with relevant laws and regulations.' },
          ].map((item) => (
            <div key={item.key} className="flex items-start p-3 bg-slate-50 rounded-md">
              <input
                type="checkbox"
                checked={data.ethicsChecks[item.key as keyof typeof data.ethicsChecks]}
                onChange={() => updateNested('ethicsChecks', item.key)}
                className="h-5 w-5 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 flex-shrink-0"
              />
              <label className="ml-3 text-slate-700 text-sm">{item.label}</label>
            </div>
          ))}
        </div>
      </div>

      <DraftModal
        isOpen={draftModalOpen}
        title="Engagement Letter Draft (NSA 210)"
        content={draftContent}
        onClose={() => setDraftModalOpen(false)}
        onContentChange={setDraftContent}
      />

    </div>
  );
};

export default Basics;


import React, { useState, useRef, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';
import { ref, push, child, update, remove } from 'firebase/database';
import { db } from '../firebase';

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
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'}`}
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
        const { teamMembers: _, ...rest } = fetchedData; 
        setData(prev => ({ ...prev, ...rest }));
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Helper to update and save
  const updateData = (updates: Partial<typeof data>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    if (isLoaded) {
      updateSectionData(engagementId, 'basics', updates);
    }
  };

  // Specific update for nested objects
  const updateNested = (section: 'acceptanceChecks' | 'sa210Checks' | 'ethicsChecks', key: string) => {
    const newSection = {
        ...data[section],
        [key]: !data[section][key as keyof typeof data[typeof section]]
    };
    updateData({ [section]: newSection });
  };


  // Team Member Local State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const handleAddTeamMember = async () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) {
        alert("Please fill in both Name and Role.");
        return;
    }

    const newMemberId = push(child(ref(db), `engagements/${engagementId}/basics/teamMembers`)).key;
    if (newMemberId) {
        const updates: any = {};
        updates[`engagements/${engagementId}/basics/teamMembers/${newMemberId}`] = {
            id: newMemberId,
            name: newMemberName,
            role: newMemberRole
        };
        await update(ref(db), updates);
        setNewMemberName('');
        setNewMemberRole('');
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
     if (window.confirm("Remove this team member?")) {
         await remove(ref(db, `engagements/${engagementId}/basics/teamMembers/${id}`));
     }
  };

  // Draft Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  const handleOpenDraft = () => {
    const formattedDate = new Date(client.fyPeriodEnd + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const template = `Date: ${today}\n\nTo the Board of Directors of ${client.name},\n\n... (Draft content) ...`;
    setDraftContent(template);
    setDraftModalOpen(true);
  };

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-slate-50";

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
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Acceptance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">2. Client Acceptance & Continuance</h3>
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
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Membership Number</label>
            <input
              type="text"
              value={data.partnerMembership}
              onChange={(e) => updateData({ partnerMembership: e.target.value })}
              placeholder="e.g., 1234"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section 5: Audit Team Structure */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-teal-500">
        <h3 className="text-xl font-bold text-slate-800 mb-2">5. Audit Team Structure</h3>
        <p className="text-sm text-slate-500 mb-4">Document the engagement team members and their roles.</p>
        
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Add Team Member</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                    <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500"
                    />
                </div>
                <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                    <input
                        type="text"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="Manager / Assistant"
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-indigo-500"
                    />
                </div>
                <div className="md:col-span-2">
                    <button
                        onClick={handleAddTeamMember}
                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition-colors"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
        
        {teamMembers.length > 0 ? (
          <div className="overflow-hidden border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{member.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{member.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleRemoveTeamMember(member.id)} className="text-red-600 hover:text-red-900">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 italic text-sm">No team members added yet.</p>
        )}
      </div>

      {/* Section 6: Code of Ethics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
        <h3 className="text-xl font-bold text-slate-800 mb-4">6. Code of Ethics Compliance</h3>
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

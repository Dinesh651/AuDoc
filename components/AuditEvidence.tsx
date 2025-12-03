
import React, { useState, useEffect, useRef } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

// --- Types for Nested Data ---
interface ConfirmationRequest {
  id: string;
  partyName: string;
  type: 'Bank' | 'Debtor' | 'Creditor' | 'Legal' | 'Other';
  sentDate: string;
  status: 'Pending' | 'Received' | 'Exception' | 'Not Received';
}

interface RelatedParty {
  id: string;
  name: string;
  relationship: string;
}

interface ChecklistState {
  [key: string]: boolean;
}

// --- Work Paper Types ---
interface InspectionItem {
  id: string;
  docRef: string;
  date: string;
  description: string;
  observation: string;
  attachment?: string; // Base64 string for image/pdf
  attachmentName?: string;
}

interface RecalculationItem {
  id: string;
  area: string;
  clientValue: number;
  auditorValue: number;
  remarks: string;
}

interface WorkPapersState {
    inspection: InspectionItem[];
    recalculation: RecalculationItem[];
    reperformance: string;
    observation: string;
    inquiry: string;
    analyticalProcedures: string;
    externalConfirmation: string; 
}

// --- Helper Components ---

const StatusBadge: React.FC<{ status: 'empty' | 'in-progress' | 'complete' | string }> = ({ status }) => {
  if (status === 'empty') return <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500">Not Started</span>;
  if (status === 'in-progress') return <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">In Progress</span>;
  if (status === 'complete') return <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Completed</span>;
  return <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">{status}</span>;
};

const SectionIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
    const props = { className, strokeWidth: 1.5, stroke: "currentColor", fill: "none", viewBox: "0 0 24 24" };
    switch (type) {
        case 'sa500': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
        case 'sa501': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
        case 'sa505': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
        case 'sa510': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
        case 'sa550': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
        case 'sa560': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        case 'sa570': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
        case 'sa580': return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
        default: return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
    }
}

const SectionHeader: React.FC<{
  title: string;
  sectionId: string;
  isExpanded: boolean;
  onClick: () => void;
  status?: string;
}> = ({ title, sectionId, isExpanded, onClick, status }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-5 cursor-pointer transition-all duration-200 group ${isExpanded ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'bg-white hover:bg-slate-50 border-l-4 border-transparent hover:border-slate-200'}`}
  >
    <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}`}>
            <SectionIcon type={sectionId} className="h-6 w-6" />
        </div>
        <h3 className={`text-lg font-bold ${isExpanded ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</h3>
    </div>
    <div className="flex items-center gap-3">
        {status && <StatusBadge status={status} />}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    </div>
  </div>
);

const ChecklistItem: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  onEdit?: () => void;
}> = ({ id, label, checked, onChange, onEdit }) => (
  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors group w-full">
    <div className="relative flex items-start flex-grow">
        <div className="flex items-center h-5">
            <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className={`select-none font-medium cursor-pointer ${checked ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-700 group-hover:text-indigo-700'}`}>
            {label}
            </label>
        </div>
    </div>
    {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Open Working Paper"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
        </button>
    )}
  </div>
);

const WorkPaperModal: React.FC<{
    isOpen: boolean;
    title: string;
    type: keyof WorkPapersState;
    data: any;
    onSave: (newData: any) => void;
    onClose: () => void;
}> = ({ isOpen, title, type, data, onSave, onClose }) => {
    const [localData, setLocalData] = useState(data);

    useEffect(() => {
        setLocalData(data);
    }, [data, isOpen]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newAttachment, setNewAttachment] = useState<string | null>(null);
    const [newAttachmentName, setNewAttachmentName] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { 
                alert("File size exceeds 5MB limit.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setNewAttachment(ev.target.result as string);
                    setNewAttachmentName(file.name);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const [newInspection, setNewInspection] = useState<Partial<InspectionItem>>({});
    const addInspection = () => {
        if (newInspection.docRef && newInspection.description) {
            const updatedList = [
                ...(localData || []), 
                { 
                    ...newInspection, 
                    id: Date.now().toString(), 
                    date: newInspection.date || new Date().toISOString().split('T')[0],
                    attachment: newAttachment,
                    attachmentName: newAttachmentName
                }
            ];
            onSave(updatedList);
            setNewInspection({});
            setNewAttachment(null);
            setNewAttachmentName(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const removeInspection = (id: string) => {
        onSave(localData.filter((item: InspectionItem) => item.id !== id));
    };

    const [newCalc, setNewCalc] = useState<Partial<RecalculationItem>>({});
    const addCalculation = () => {
        if (newCalc.area) {
            const updatedList = [...(localData || []), { ...newCalc, id: Date.now().toString(), clientValue: Number(newCalc.clientValue), auditorValue: Number(newCalc.auditorValue) }];
            onSave(updatedList);
            setNewCalc({});
        }
    };
    const removeCalculation = (id: string) => {
        onSave(localData.filter((item: RecalculationItem) => item.id !== id));
    };

    const handleTextChange = (val: string) => {
        setLocalData(val);
        onSave(val); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-500">Working Paper Environment</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {type === 'inspection' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Log New Document</h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-2">
                                        <input type="text" placeholder="Ref No." className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newInspection.docRef || ''} onChange={e => setNewInspection({...newInspection, docRef: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input type="date" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newInspection.date || ''} onChange={e => setNewInspection({...newInspection, date: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input type="text" placeholder="Description" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newInspection.description || ''} onChange={e => setNewInspection({...newInspection, description: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input type="text" placeholder="Observation" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newInspection.observation || ''} onChange={e => setNewInspection({...newInspection, observation: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2 flex gap-2">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*,application/pdf" 
                                            capture="environment" 
                                            onChange={handleFileSelect} 
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className={`flex-1 p-2 rounded border transition-colors flex items-center justify-center ${newAttachment ? 'bg-green-50 border-green-300 text-green-600' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                            title={newAttachmentName || "Capture/Upload Evidence"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                <circle cx="12" cy="13" r="4"></circle>
                                            </svg>
                                        </button>
                                        <button onClick={addInspection} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-sm font-medium transition-colors">Add</button>
                                    </div>
                                    {newAttachmentName && <div className="md:col-span-12 text-xs text-green-600 flex items-center"><span className="font-semibold mr-1">Attached:</span> {newAttachmentName}</div>}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ref</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Observation</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Evidence</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {Array.isArray(localData) && localData.map((item: InspectionItem) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.docRef}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500">{item.date}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{item.description}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{item.observation}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.attachment ? (
                                                        <a href={item.attachment} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                                                            View
                                                        </a>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <button onClick={() => removeInspection(item.id)} className="text-red-500 hover:text-red-700">&times;</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {['reperformance', 'observation', 'inquiry', 'analyticalProcedures', 'externalConfirmation', 'recalculation'].includes(type) && (
                         <div className="h-full flex flex-col">
                             {type === 'recalculation' ? (
                                 <div className="space-y-6">
                                     <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                                <div className="md:col-span-3">
                                                    <input type="text" placeholder="Area" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.area || ''} onChange={e => setNewCalc({...newCalc, area: e.target.value})} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input type="number" placeholder="Client Val" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.clientValue || ''} onChange={e => setNewCalc({...newCalc, clientValue: parseFloat(e.target.value)})} />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <input type="number" placeholder="Audit Val" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.auditorValue || ''} onChange={e => setNewCalc({...newCalc, auditorValue: parseFloat(e.target.value)})} />
                                                </div>
                                                <div className="md:col-span-4">
                                                    <input type="text" placeholder="Remarks" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.remarks || ''} onChange={e => setNewCalc({...newCalc, remarks: e.target.value})} />
                                                </div>
                                                <div className="md:col-span-1">
                                                    <button onClick={addCalculation} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-sm font-medium transition-colors">Add</button>
                                                </div>
                                            </div>
                                        </div>
                                     <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Area</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Client</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Auditor</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Diff</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {Array.isArray(localData) && localData.map((item: RecalculationItem) => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-sm">{item.area}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{item.clientValue}</td>
                                                        <td className="px-4 py-3 text-sm text-right">{item.auditorValue}</td>
                                                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{item.clientValue - item.auditorValue}</td>
                                                        <td className="px-4 py-3 text-right"><button onClick={() => removeCalculation(item.id)} className="text-red-500">&times;</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                     </div>
                                 </div>
                             ) : (
                                <div className="h-full flex flex-col">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Detailed Procedure Documentation</label>
                                    <textarea 
                                        className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-inner resize-none text-slate-700 leading-relaxed bg-white"
                                        placeholder={`Describe the ${type} procedure performed...`}
                                        value={typeof localData === 'string' ? localData : ''}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                    />
                                </div>
                             )}
                         </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-transform transform active:scale-95">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const AuditEvidence: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('sa500');
  const [isLoaded, setIsLoaded] = useState(false);

  // Consolidated State
  const [data, setData] = useState({
    sa500: {
      checklist: { inspection: false, observation: false, externalConfirmation: false, recalculation: false, reperformance: false, analyticalProcedures: false, inquiry: false } as ChecklistState,
      summary: '',
      workPapers: { inspection: [] as InspectionItem[], recalculation: [] as RecalculationItem[], reperformance: '', observation: '', inquiry: '', analyticalProcedures: '', externalConfirmation: '' } as WorkPapersState
    },
    sa501: {
      inventory: { attendedCount: false, countDate: '', locations: '', observations: '' },
      litigation: { inquiryManagement: false, reviewedLegalExpenses: false, legalCounselResponse: '' },
      segment: { understandingMethods: false, testingApplication: false, analyticalProcedures: false, conclusion: '' }
    },
    sa505: { requests: [] as ConfirmationRequest[] },
    sa510: { checklist: { agreePriorPeriod: false, consistentPolicies: false, reviewedPredecessorWP: false } as ChecklistState, notes: '' },
    sa550: { parties: [] as RelatedParty[], transactionsReview: '' },
    sa560: { checklist: { inquiryManagement: false, reviewMinutes: false, reviewInterimFS: false } as ChecklistState, eventsNoted: '' },
    sa570: { indicators: { netLiability: false, borrowingMaturity: false, lossKeyManagement: false, negativeCashFlow: false } as ChecklistState, conclusion: 'Appropriate', justification: '' },
    sa580: { letterDate: '', checklist: { respPreparation: false, respInformation: false, respTransactions: false } as ChecklistState },
  });

  const [newConfirm, setNewConfirm] = useState<Partial<ConfirmationRequest>>({ type: 'Bank', status: 'Pending' });
  const [newParty, setNewParty] = useState<Partial<RelatedParty>>({});
  const [activeWorkPaper, setActiveWorkPaper] = useState<{ type: keyof WorkPapersState; title: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'auditEvidence', (fetchedData) => {
      if (fetchedData) {
        setData(prev => ({
            ...prev,
            ...fetchedData,
            sa500: { ...prev.sa500, ...fetchedData.sa500, workPapers: { ...prev.sa500.workPapers, ...(fetchedData.sa500?.workPapers || {}) } },
            sa501: { ...prev.sa501, ...fetchedData.sa501, segment: fetchedData.sa501?.segment || prev.sa501.segment },
            sa505: { ...prev.sa505, ...fetchedData.sa505, requests: fetchedData.sa505?.requests || [] },
            sa550: { ...prev.sa550, ...fetchedData.sa550, parties: fetchedData.sa550?.parties || [] }
        }));
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const getSectionStatus = (sectionKey: keyof typeof data) => {
      const section = data[sectionKey];
      if (!section) return 'empty';
      if (sectionKey === 'sa505') { const count = data.sa505.requests.length; return count === 0 ? 'empty' : `${count} Requests`; }
      if (sectionKey === 'sa550') { const count = data.sa550.parties.length; return count === 0 ? 'empty' : `${count} Parties`; }
      const stringified = JSON.stringify(section);
      if (stringified.includes('true') || (stringified.length > 200 && !stringified.includes('""'))) return 'in-progress';
      return 'empty';
  };

  const updateDB = (updatedData: typeof data) => {
    if (isLoaded) {
      updateSectionData(engagementId, 'auditEvidence', updatedData);
    }
  };

  const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? null : id);

  const toggleChecklist = (section: keyof typeof data, subKey: string, itemKey: string) => {
    // @ts-ignore
    const currentSection = data[section];
    // @ts-ignore
    const currentChecklist = currentSection[subKey];
    const updatedChecklist = { ...currentChecklist, [itemKey]: !currentChecklist[itemKey] };
    const updatedData = { ...data, [section]: { ...currentSection, [subKey]: updatedChecklist } };
    setData(updatedData);
    updateDB(updatedData);
  };

  const updateField = (section: keyof typeof data, field: string, value: any) => {
    const updatedData = { ...data, [section]: { ...data[section], [field]: value } };
    setData(updatedData);
    updateDB(updatedData);
  };

  const updateNestedField = (section: keyof typeof data, nestedObj: string, field: string, value: any) => {
      const currentSection = data[section];
      const currentNestedObj = currentSection[nestedObj as keyof typeof currentSection] as any;
      const updatedData = { 
        ...data, 
        [section]: { 
            ...currentSection, 
            [nestedObj]: { 
                ...currentNestedObj, 
                [field]: value 
            } 
        } 
      };
      setData(updatedData);
      updateDB(updatedData);
  };

  const handleSaveWorkPaper = (newData: any) => {
      if (!activeWorkPaper) return;
      const updatedData = { ...data, sa500: { ...data.sa500, workPapers: { ...data.sa500.workPapers, [activeWorkPaper.type]: newData } } };
      setData(updatedData);
      updateDB(updatedData);
  };

  const addConfirmation = () => {
    if (newConfirm.partyName && newConfirm.sentDate) {
      const updatedRequests = [...data.sa505.requests, { ...newConfirm, id: Date.now().toString() } as ConfirmationRequest];
      const updatedData = { ...data, sa505: { ...data.sa505, requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
      setNewConfirm({ type: 'Bank', status: 'Pending', partyName: '', sentDate: '' });
    }
  };
  
  const updateConfirmationStatus = (id: string, status: ConfirmationRequest['status']) => {
      const updatedRequests = data.sa505.requests.map(r => r.id === id ? { ...r, status } : r);
      const updatedData = { ...data, sa505: { ...data.sa505, requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
  };

  const removeConfirmation = (id: string) => {
      const updatedRequests = data.sa505.requests.filter(r => r.id !== id);
      const updatedData = { ...data, sa505: { ...data.sa505, requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
  };

  const addRelatedParty = () => {
    if (newParty.name && newParty.relationship) {
        const updatedParties = [...data.sa550.parties, { ...newParty, id: Date.now().toString() } as RelatedParty];
        const updatedData = { ...data, sa550: { ...data.sa550, parties: updatedParties } };
        setData(updatedData);
        updateDB(updatedData);
        setNewParty({ name: '', relationship: '' });
    }
  };
  const removeRelatedParty = (id: string) => {
    const updatedParties = data.sa550.parties.filter(p => p.id !== id);
    const updatedData = { ...data, sa550: { ...data.sa550, parties: updatedParties } };
    setData(updatedData);
    updateDB(updatedData);
  };

  const inputClass = "bg-white";
  const inputClass50 = "bg-slate-50";

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-sm border-l-8 border-indigo-600 mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Audit Evidence Gathering</h2>
        <p className="text-slate-600 mt-2 text-lg">
            Execute and document audit procedures to obtain sufficient appropriate audit evidence in accordance with <strong>NSA 500 - 580</strong> series.
        </p>
      </div>

      {/* SA 500 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader title="NSA 500: Audit Evidence Procedures" sectionId="sa500" isExpanded={expandedSection === 'sa500'} onClick={() => toggleSection('sa500')} status={getSectionStatus('sa500')} />
        {expandedSection === 'sa500' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500 mb-4 italic">Select the audit procedures performed. Click the icon to open the detailed working paper.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <ChecklistItem id="insp" label="Inspection of Records/Docs" checked={data.sa500.checklist.inspection} onChange={() => toggleChecklist('sa500', 'checklist', 'inspection')} onEdit={() => setActiveWorkPaper({ type: 'inspection', title: 'Inspection of Records or Documents' })} />
              <ChecklistItem id="obs" label="Observation of Processes" checked={data.sa500.checklist.observation} onChange={() => toggleChecklist('sa500', 'checklist', 'observation')} onEdit={() => setActiveWorkPaper({ type: 'observation', title: 'Observation' })} />
              <ChecklistItem id="ext" label="External Confirmation" checked={data.sa500.checklist.externalConfirmation} onChange={() => toggleChecklist('sa500', 'checklist', 'externalConfirmation')} onEdit={() => setActiveWorkPaper({ type: 'externalConfirmation', title: 'External Confirmation' })} />
              <ChecklistItem id="recal" label="Recalculation" checked={data.sa500.checklist.recalculation} onChange={() => toggleChecklist('sa500', 'checklist', 'recalculation')} onEdit={() => setActiveWorkPaper({ type: 'recalculation', title: 'Recalculation' })} />
              <ChecklistItem id="reper" label="Reperformance" checked={data.sa500.checklist.reperformance} onChange={() => toggleChecklist('sa500', 'checklist', 'reperformance')} onEdit={() => setActiveWorkPaper({ type: 'reperformance', title: 'Reperformance' })} />
              <ChecklistItem id="anal" label="Analytical Procedures" checked={data.sa500.checklist.analyticalProcedures} onChange={() => toggleChecklist('sa500', 'checklist', 'analyticalProcedures')} onEdit={() => setActiveWorkPaper({ type: 'analyticalProcedures', title: 'Analytical Procedures' })} />
              <ChecklistItem id="inq" label="Inquiry" checked={data.sa500.checklist.inquiry} onChange={() => toggleChecklist('sa500', 'checklist', 'inquiry')} onEdit={() => setActiveWorkPaper({ type: 'inquiry', title: 'Inquiry' })} />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Summary of Work Performed & Evidence Obtained</label>
                <textarea 
                className={`w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm text-sm transition-all ${inputClass}`}
                rows={3}
                value={data.sa500.summary}
                onChange={(e) => updateField('sa500', 'summary', e.target.value)}
                />
            </div>
          </div>
        )}
      </div>

      {/* SA 501 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader title="NSA 501: Specific Considerations" sectionId="sa501" isExpanded={expandedSection === 'sa501'} onClick={() => toggleSection('sa501')} status={getSectionStatus('sa501')} />
        {expandedSection === 'sa501' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <span className="p-1.5 bg-teal-100 text-teal-700 rounded-md"><SectionIcon type="sa501" className="w-4 h-4" /></span>
                    <h4 className="font-bold text-slate-800">Inventory</h4>
                </div>
                <div className="flex flex-wrap items-center gap-6 mb-4">
                    <label className="flex items-center cursor-pointer p-2 hover:bg-slate-50 rounded-md transition-colors">
                        <input type="checkbox" checked={data.sa501.inventory.attendedCount} onChange={() => updateNestedField('sa501', 'inventory', 'attendedCount', !data.sa501.inventory.attendedCount)} className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        <span className="ml-3 text-sm font-medium text-slate-700">Attended Physical Count</span>
                    </label>
                    <div className="flex-1 min-w-[200px]">
                        <input type="date" value={data.sa501.inventory.countDate} onChange={(e) => updateNestedField('sa501', 'inventory', 'countDate', e.target.value)} className={`w-full p-2.5 border border-slate-200 rounded-md text-sm outline-none ${inputClass50}`} />
                    </div>
                </div>
                <textarea 
                    className={`w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 ${inputClass}`} 
                    rows={2}
                    value={data.sa501.inventory.observations}
                    onChange={(e) => updateNestedField('sa501', 'inventory', 'observations', e.target.value)}
                />
            </div>
             <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800">Litigation & Claims</h4>
                </div>
                <div className="flex flex-wrap gap-6 mb-4">
                    <ChecklistItem id="lit_inq" label="Inquiry of Management/Legal" checked={data.sa501.litigation.inquiryManagement} onChange={() => updateNestedField('sa501', 'litigation', 'inquiryManagement', !data.sa501.litigation.inquiryManagement)} />
                    <ChecklistItem id="lit_rev" label="Reviewed Legal Expenses" checked={data.sa501.litigation.reviewedLegalExpenses} onChange={() => updateNestedField('sa501', 'litigation', 'reviewedLegalExpenses', !data.sa501.litigation.reviewedLegalExpenses)} />
                </div>
                <textarea 
                    className={`w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                    rows={2}
                    value={data.sa501.litigation.legalCounselResponse}
                    onChange={(e) => updateNestedField('sa501', 'litigation', 'legalCounselResponse', e.target.value)}
                />
            </div>
            {/* Added Segment Information */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800">Segment Information</h4>
                </div>
                <div className="flex flex-wrap gap-6 mb-4">
                    <ChecklistItem id="seg_und" label="Understand Methods" checked={data.sa501.segment.understandingMethods} onChange={() => updateNestedField('sa501', 'segment', 'understandingMethods', !data.sa501.segment.understandingMethods)} />
                    <ChecklistItem id="seg_test" label="Testing Application" checked={data.sa501.segment.testingApplication} onChange={() => updateNestedField('sa501', 'segment', 'testingApplication', !data.sa501.segment.testingApplication)} />
                    <ChecklistItem id="seg_ana" label="Analytical Procedures" checked={data.sa501.segment.analyticalProcedures} onChange={() => updateNestedField('sa501', 'segment', 'analyticalProcedures', !data.sa501.segment.analyticalProcedures)} />
                </div>
                <textarea 
                    className={`w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                    rows={2}
                    placeholder="Conclusion on Segment Information..."
                    value={data.sa501.segment.conclusion}
                    onChange={(e) => updateNestedField('sa501', 'segment', 'conclusion', e.target.value)}
                />
            </div>
          </div>
        )}
      </div>

      {/* SA 505 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader title="NSA 505: External Confirmations" sectionId="sa505" isExpanded={expandedSection === 'sa505'} onClick={() => toggleSection('sa505')} status={getSectionStatus('sa505')} />
        {expandedSection === 'sa505' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                <h4 className="text-sm font-bold text-indigo-800 mb-3">Add New Confirmation Request</h4>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <input type="text" value={newConfirm.partyName || ''} onChange={e => setNewConfirm({...newConfirm, partyName: e.target.value})} className="w-full p-2.5 border border-indigo-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Party Name" />
                    </div>
                    <div className="w-32">
                        <select value={newConfirm.type} onChange={e => setNewConfirm({...newConfirm, type: e.target.value as any})} className="w-full p-2.5 border border-indigo-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                            <option>Bank</option>
                            <option>Debtor</option>
                            <option>Creditor</option>
                            <option>Legal</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div className="w-40">
                        <input type="date" value={newConfirm.sentDate || ''} onChange={e => setNewConfirm({...newConfirm, sentDate: e.target.value})} className="w-full p-2.5 border border-indigo-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                    </div>
                    <button onClick={addConfirmation} className="px-5 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm">Add</button>
                </div>
            </div>
            
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-slate-300 bg-white">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Party</th>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Type</th>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Status</th>
                            <th className="px-3 py-3.5 text-right text-xs font-semibold text-slate-900">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {data.sa505.requests.map(req => (
                            <tr key={req.id}>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">{req.partyName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{req.type}</td>
                                <td className="whitespace-nowrap px-3 py-4">
                                    <select 
                                        value={req.status} 
                                        onChange={(e) => updateConfirmationStatus(req.id, e.target.value as any)}
                                        className="text-xs font-bold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-slate-100"
                                    >
                                        <option>Pending</option>
                                        <option>Received</option>
                                        <option>Exception</option>
                                        <option>Not Received</option>
                                    </select>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
                                    <button onClick={() => removeConfirmation(req.id)} className="text-slate-400 hover:text-red-600">Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>

       {/* Work Paper Modal */}
       {activeWorkPaper && (
           <WorkPaperModal 
                isOpen={!!activeWorkPaper}
                title={activeWorkPaper.title}
                type={activeWorkPaper.type}
                data={data.sa500.workPapers[activeWorkPaper.type]}
                onSave={handleSaveWorkPaper}
                onClose={() => setActiveWorkPaper(null)}
           />
       )}

    </div>
  );
};

export default AuditEvidence;

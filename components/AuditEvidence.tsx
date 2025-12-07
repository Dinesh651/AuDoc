
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
        case 'sa500': // Search/Evidence
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
        case 'sa501': // Cube/Specific
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
        case 'sa505': // Mail/Confirmation
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
        case 'sa510': // Scale/Balance
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
        case 'sa550': // Users/Related
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
        case 'sa560': // Calendar/Subsequent
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        case 'sa570': // Chart/GoingConcern
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
        case 'sa580': // Document/Reps
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
        default:
            return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
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
            <label htmlFor={id} className={`cursor-pointer select-none font-medium ${checked ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-700 group-hover:text-indigo-700'}`}>
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

// --- Work Paper Modal ---

const WorkPaperModal: React.FC<{
    isOpen: boolean;
    title: string;
    type: keyof WorkPapersState;
    data: any;
    onSave: (newData: any) => void;
    onClose: () => void;
}> = ({ isOpen, title, type, data, onSave, onClose }) => {
    // Local state to handle form inputs before saving to main state
    const [localData, setLocalData] = useState(data);

    // Reset local data when modal opens with new data
    useEffect(() => {
        setLocalData(data);
    }, [data, isOpen]);

    // --- File Upload Refs & Handlers ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newAttachment, setNewAttachment] = useState<string | null>(null);
    const [newAttachmentName, setNewAttachmentName] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit check
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

    // --- Handlers for Inspection ---
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
            onSave(updatedList); // Auto save to parent
            setNewInspection({});
            setNewAttachment(null);
            setNewAttachmentName(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const removeInspection = (id: string) => {
        onSave(localData.filter((item: InspectionItem) => item.id !== id));
    };

    // --- Handlers for Recalculation ---
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

    // --- Handlers for Text/Reperformance ---
    const handleTextChange = (val: string) => {
        setLocalData(val);
        onSave(val); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                        <p className="text-sm text-slate-500">Working Paper Environment</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    
                    {/* TYPE: INSPECTION */}
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
                                            capture="environment" // Hints mobile browsers to use camera
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
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                                <polyline points="10 9 9 9 8 9"></polyline>
                                                            </svg>
                                                            View
                                                        </a>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <button onClick={() => removeInspection(item.id)} className="text-red-500 hover:text-red-700">&times;</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!localData || localData.length === 0) && (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">No documents inspected yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TYPE: RECALCULATION */}
                    {type === 'recalculation' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">New Calculation Check</h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-3">
                                        <input type="text" placeholder="Area (e.g. Interest Expense)" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.area || ''} onChange={e => setNewCalc({...newCalc, area: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1">Client Value</label>
                                        <input type="number" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.clientValue || ''} onChange={e => setNewCalc({...newCalc, clientValue: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1">Auditor Value</label>
                                        <input type="number" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.auditorValue || ''} onChange={e => setNewCalc({...newCalc, auditorValue: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <input type="text" placeholder="Remarks / Method" className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm" value={newCalc.remarks || ''} onChange={e => setNewCalc({...newCalc, remarks: e.target.value})} />
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
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Client Value</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Auditor Value</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Variance</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase pl-6">Remarks</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {Array.isArray(localData) && localData.map((item: RecalculationItem) => {
                                            const diff = item.clientValue - item.auditorValue;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.area}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600">{item.clientValue.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600">{item.auditorValue.toLocaleString()}</td>
                                                    <td className={`px-4 py-3 text-sm text-right font-bold ${diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {diff.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 pl-6">{item.remarks}</td>
                                                    <td className="px-4 py-3 text-right text-sm">
                                                        <button onClick={() => removeCalculation(item.id)} className="text-red-500 hover:text-red-700">&times;</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!localData || localData.length === 0) && (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic text-sm">No calculations performed yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TYPE: TEXT (Reperformance, etc) */}
                    {['reperformance', 'observation', 'inquiry', 'analyticalProcedures', 'externalConfirmation'].includes(type) && (
                        <div className="h-full flex flex-col">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Detailed Procedure Documentation</label>
                            <textarea 
                                className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-inner resize-none text-slate-700 leading-relaxed"
                                placeholder={`Describe the ${type} procedure performed, inputs used, steps taken, and conclusion reached...`}
                                value={typeof localData === 'string' ? localData : ''}
                                onChange={(e) => handleTextChange(e.target.value)}
                            />
                        </div>
                    )}

                </div>

                {/* Footer */}
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
    // SA 500: Audit Evidence
    sa500: {
      checklist: {
        inspection: false,
        observation: false,
        externalConfirmation: false,
        recalculation: false,
        reperformance: false,
        analyticalProcedures: false,
        inquiry: false,
      } as ChecklistState,
      summary: '',
      workPapers: {
        inspection: [] as InspectionItem[],
        recalculation: [] as RecalculationItem[],
        reperformance: '',
        observation: '',
        inquiry: '',
        analyticalProcedures: '',
        externalConfirmation: '',
      } as WorkPapersState
    },
    // SA 501: Specific Considerations
    sa501: {
      inventory: {
        attendedCount: false,
        countDate: '',
        locations: '',
        observations: '',
      },
      litigation: {
        inquiryManagement: false,
        reviewedLegalExpenses: false,
        legalCounselResponse: '',
      },
      segment: {
        understandingMethods: false,
        testingApplication: false,
        analyticalProcedures: false,
        conclusion: '',
      }
    },
    // SA 505: External Confirmations
    sa505: {
      requests: [] as ConfirmationRequest[],
    },
    // SA 510: Opening Balances
    sa510: {
      checklist: {
        agreePriorPeriod: false,
        consistentPolicies: false,
        reviewedPredecessorWP: false,
      } as ChecklistState,
      notes: '',
    },
    // SA 550: Related Parties
    sa550: {
      parties: [] as RelatedParty[],
      transactionsReview: '',
    },
    // SA 560: Subsequent Events
    sa560: {
      checklist: {
        inquiryManagement: false,
        reviewMinutes: false,
        reviewInterimFS: false,
      } as ChecklistState,
      eventsNoted: '',
    },
    // SA 570: Going Concern
    sa570: {
      indicators: {
        netLiability: false,
        borrowingMaturity: false,
        lossKeyManagement: false,
        negativeCashFlow: false,
      } as ChecklistState,
      conclusion: 'Appropriate', // Appropriate, Material Uncertainty, Inappropriate
      justification: '',
    },
    // SA 580: Written Representations
    sa580: {
      letterDate: '',
      checklist: {
        respPreparation: false,
        respInformation: false,
        respTransactions: false,
      } as ChecklistState,
    },
  });

  // Local state for inputs
  const [newConfirm, setNewConfirm] = useState<Partial<ConfirmationRequest>>({ type: 'Bank', status: 'Pending' });
  const [newParty, setNewParty] = useState<Partial<RelatedParty>>({});

  // Active Work Paper Modal State
  const [activeWorkPaper, setActiveWorkPaper] = useState<{ type: keyof WorkPapersState; title: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'auditEvidence', (fetchedData) => {
      if (fetchedData) {
        // Deep merge logic to ensure new fields (like sa501.segment) are present even if missing in DB
        setData(prev => ({
            ...prev,
            ...fetchedData,
            sa500: {
                ...prev.sa500,
                ...fetchedData.sa500,
                workPapers: {
                    inspection: [],
                    recalculation: [],
                    reperformance: '',
                    observation: '',
                    inquiry: '',
                    analyticalProcedures: '',
                    externalConfirmation: '',
                    ...(fetchedData.sa500?.workPapers || {})
                }
            },
            sa501: {
                ...prev.sa501,
                ...fetchedData.sa501,
                segment: fetchedData.sa501?.segment || prev.sa501.segment
            },
            sa505: { ...prev.sa505, ...fetchedData.sa505, requests: fetchedData.sa505?.requests || [] },
            sa550: { ...prev.sa550, ...fetchedData.sa550, parties: fetchedData.sa550?.parties || [] }
        }));
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Helper to determine section status
  const getSectionStatus = (sectionKey: keyof typeof data) => {
      const section = data[sectionKey];
      if (!section) return 'empty';
      
      // Simple heuristics
      if (sectionKey === 'sa505') {
          const count = data.sa505.requests.length;
          return count === 0 ? 'empty' : `${count} Requests`;
      }
      if (sectionKey === 'sa550') {
          const count = data.sa550.parties.length;
          return count === 0 ? 'empty' : `${count} Parties`;
      }
      
      // For checklist based sections, check if any value is truthy
      const stringified = JSON.stringify(section);
      if (stringified.includes('true') || (stringified.length > 200 && !stringified.includes('""'))) {
          return 'in-progress';
      }
      return 'empty';
  };

  const updateDB = (updatedData: typeof data) => {
    if (isLoaded) {
      updateSectionData(engagementId, 'auditEvidence', updatedData);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const toggleChecklist = (section: keyof typeof data, subKey: string, itemKey: string) => {
    // @ts-ignore - Dynamic access is safe here due to structure
    const currentSection = data[section];
    // @ts-ignore
    const currentChecklist = currentSection[subKey];
    const updatedChecklist = { ...currentChecklist, [itemKey]: !currentChecklist[itemKey] };
    
    const updatedData = {
      ...data,
      [section]: {
        ...currentSection,
        [subKey]: updatedChecklist
      }
    };
    setData(updatedData);
    updateDB(updatedData);
  };

  const updateField = (section: keyof typeof data, field: string, value: any) => {
    const updatedData = {
        ...data,
        [section]: {
            // @ts-ignore
            ...data[section],
            [field]: value
        }
    };
    setData(updatedData);
    updateDB(updatedData);
  };

  const updateNestedField = (section: keyof typeof data, nestedObj: string, field: string, value: any) => {
      const updatedData = {
          ...data,
          [section]: {
              // @ts-ignore
              ...data[section],
              [nestedObj]: {
                  // @ts-ignore
                  ...data[section][nestedObj],
                  [field]: value
              }
          }
      };
      setData(updatedData);
      updateDB(updatedData);
  };

  // Update WorkPaper Data
  const handleSaveWorkPaper = (newData: any) => {
      if (!activeWorkPaper) return;
      
      const updatedData = {
          ...data,
          sa500: {
              ...data.sa500,
              workPapers: {
                  ...data.sa500.workPapers,
                  [activeWorkPaper.type]: newData
              }
          }
      };
      setData(updatedData);
      updateDB(updatedData);
  };

  // SA 505 Logic
  const addConfirmation = () => {
    if (newConfirm.partyName && newConfirm.sentDate) {
      const updatedRequests = [...data.sa505.requests, { ...newConfirm, id: Date.now().toString() } as ConfirmationRequest];
      const updatedData = { ...data, sa505: { requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
      setNewConfirm({ type: 'Bank', status: 'Pending', partyName: '', sentDate: '' });
    }
  };
  
  const updateConfirmationStatus = (id: string, status: ConfirmationRequest['status']) => {
      const updatedRequests = data.sa505.requests.map(r => r.id === id ? { ...r, status } : r);
      const updatedData = { ...data, sa505: { requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
  };

  const removeConfirmation = (id: string) => {
      const updatedRequests = data.sa505.requests.filter(r => r.id !== id);
      const updatedData = { ...data, sa505: { requests: updatedRequests } };
      setData(updatedData);
      updateDB(updatedData);
  };

  // SA 550 Logic
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
        <SectionHeader 
          title="NSA 500: Audit Evidence Procedures" 
          sectionId="sa500"
          isExpanded={expandedSection === 'sa500'} 
          onClick={() => toggleSection('sa500')} 
          status={getSectionStatus('sa500')}
        />
        {expandedSection === 'sa500' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500 mb-4 italic">Select the audit procedures performed. Click the <span className="inline-flex align-middle"><svg className="w-3 h-3 mx-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></span> icon to open the detailed working paper.</p>
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
                placeholder="e.g., We inspected invoices for the top 10 expenses, observed the inventory count at the main warehouse..."
                className="w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm text-sm transition-all"
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
        <SectionHeader 
            title="NSA 501: Specific Considerations" 
            sectionId="sa501"
            isExpanded={expandedSection === 'sa501'} 
            onClick={() => toggleSection('sa501')} 
            status={getSectionStatus('sa501')}
        />
        {expandedSection === 'sa501' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
            {/* Inventory */}
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
                         <label className="block text-xs text-slate-500 mb-1">Count Date</label>
                        <input type="date" value={data.sa501.inventory.countDate} onChange={(e) => updateNestedField('sa501', 'inventory', 'countDate', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-md text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
                <textarea 
                    placeholder="Observations regarding condition of inventory, adherence to count procedures..." 
                    className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={2}
                    value={data.sa501.inventory.observations}
                    onChange={(e) => updateNestedField('sa501', 'inventory', 'observations', e.target.value)}
                />
            </div>

            {/* Litigation */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                     <span className="p-1.5 bg-red-100 text-red-700 rounded-md"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                    <h4 className="font-bold text-slate-800">Litigation & Claims</h4>
                </div>
                <div className="flex flex-wrap gap-6 mb-4">
                    <ChecklistItem id="lit_inq" label="Inquiry of Management/Legal" checked={data.sa501.litigation.inquiryManagement} onChange={() => updateNestedField('sa501', 'litigation', 'inquiryManagement', !data.sa501.litigation.inquiryManagement)} />
                    <ChecklistItem id="lit_rev" label="Reviewed Legal Expenses" checked={data.sa501.litigation.reviewedLegalExpenses} onChange={() => updateNestedField('sa501', 'litigation', 'reviewedLegalExpenses', !data.sa501.litigation.reviewedLegalExpenses)} />
                </div>
                <textarea 
                    placeholder="Summary of legal counsel responses and potential liabilities..." 
                    className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={2}
                    value={data.sa501.litigation.legalCounselResponse}
                    onChange={(e) => updateNestedField('sa501', 'litigation', 'legalCounselResponse', e.target.value)}
                />
            </div>

            {/* Segment Information */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                     <span className="p-1.5 bg-purple-100 text-purple-700 rounded-md"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg></span>
                    <h4 className="font-bold text-slate-800">Segment Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <ChecklistItem id="seg_und" label="Und. Methods" checked={data.sa501.segment.understandingMethods} onChange={() => updateNestedField('sa501', 'segment', 'understandingMethods', !data.sa501.segment.understandingMethods)} />
                    <ChecklistItem id="seg_test" label="Testing Application" checked={data.sa501.segment.testingApplication} onChange={() => updateNestedField('sa501', 'segment', 'testingApplication', !data.sa501.segment.testingApplication)} />
                    <ChecklistItem id="seg_anal" label="Analytical Procedures" checked={data.sa501.segment.analyticalProcedures} onChange={() => updateNestedField('sa501', 'segment', 'analyticalProcedures', !data.sa501.segment.analyticalProcedures)} />
                </div>
                <textarea 
                    placeholder="Conclusion on presentation and disclosure of segment information..." 
                    className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={2}
                    value={data.sa501.segment.conclusion}
                    onChange={(e) => updateNestedField('sa501', 'segment', 'conclusion', e.target.value)}
                />
            </div>
          </div>
        )}
      </div>

      {/* SA 505 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 505: External Confirmations" 
            sectionId="sa505"
            isExpanded={expandedSection === 'sa505'} 
            onClick={() => toggleSection('sa505')} 
            status={getSectionStatus('sa505')}
        />
        {expandedSection === 'sa505' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                <h4 className="text-sm font-bold text-indigo-800 mb-3">Add New Confirmation Request</h4>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <input type="text" value={newConfirm.partyName || ''} onChange={e => setNewConfirm({...newConfirm, partyName: e.target.value})} className="w-full p-2.5 border border-indigo-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Party Name (e.g., ABC Bank)" />
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
                    <button onClick={addConfirmation} className="px-5 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm">Add Request</button>
                </div>
            </div>
            
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-slate-300 bg-white">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Party</th>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Type</th>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Sent Date</th>
                            <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">Status</th>
                            <th className="px-3 py-3.5 text-right text-xs font-semibold text-slate-900">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {data.sa505.requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-800 font-medium">{req.partyName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{req.type}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{req.sentDate}</td>
                                <td className="whitespace-nowrap px-3 py-4">
                                    <select 
                                        value={req.status} 
                                        onChange={(e) => updateConfirmationStatus(req.id, e.target.value as any)}
                                        className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${
                                            req.status === 'Received' ? 'bg-green-100 text-green-800' :
                                            req.status === 'Exception' ? 'bg-red-100 text-red-800' :
                                            req.status === 'Not Received' ? 'bg-slate-100 text-slate-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}
                                    >
                                        <option>Pending</option>
                                        <option>Received</option>
                                        <option>Exception</option>
                                        <option>Not Received</option>
                                    </select>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
                                    <button onClick={() => removeConfirmation(req.id)} className="text-slate-400 hover:text-red-600 transition-colors font-medium">Remove</button>
                                </td>
                            </tr>
                        ))}
                        {data.sa505.requests.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm italic">No confirmation requests logged yet. Add one above.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        )}
      </div>

       {/* SA 510 */}
       <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 510: Opening Balances" 
            sectionId="sa510"
            isExpanded={expandedSection === 'sa510'} 
            onClick={() => toggleSection('sa510')} 
            status={getSectionStatus('sa510')}
        />
        {expandedSection === 'sa510' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="space-y-3 mb-6">
                <ChecklistItem id="sa510_1" label="Closing balances of prior period correctly brought forward" checked={data.sa510.checklist.agreePriorPeriod} onChange={() => toggleChecklist('sa510', 'checklist', 'agreePriorPeriod')} />
                <ChecklistItem id="sa510_2" label="Accounting policies applied consistently" checked={data.sa510.checklist.consistentPolicies} onChange={() => toggleChecklist('sa510', 'checklist', 'consistentPolicies')} />
                <ChecklistItem id="sa510_3" label="Reviewed predecessor auditor's working papers" checked={data.sa510.checklist.reviewedPredecessorWP} onChange={() => toggleChecklist('sa510', 'checklist', 'reviewedPredecessorWP')} />
             </div>
             <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Notes & Verification</label>
                <textarea 
                    placeholder="Details on verification of opening balances..."
                    className="w-full p-4 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={3}
                    value={data.sa510.notes}
                    onChange={(e) => updateField('sa510', 'notes', e.target.value)}
                />
             </div>
          </div>
        )}
       </div>

      {/* SA 550 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 550: Related Parties" 
            sectionId="sa550"
            isExpanded={expandedSection === 'sa550'} 
            onClick={() => toggleSection('sa550')} 
            status={getSectionStatus('sa550')}
        />
        {expandedSection === 'sa550' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="flex gap-3 mb-6 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                 <input type="text" value={newParty.name || ''} onChange={e => setNewParty({...newParty, name: e.target.value})} placeholder="Party Name" className="flex-1 p-2.5 border border-slate-200 rounded-md text-sm bg-slate-50" />
                 <input type="text" value={newParty.relationship || ''} onChange={e => setNewParty({...newParty, relationship: e.target.value})} placeholder="Relationship (e.g., Director, Subsidiary)" className="flex-1 p-2.5 border border-slate-200 rounded-md text-sm bg-slate-50" />
                 <button onClick={addRelatedParty} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">Add Party</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                 {data.sa550.parties.map(party => (
                     <div key={party.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                         <div className="flex items-center">
                             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3">
                                 {party.name.charAt(0)}
                             </div>
                             <div>
                                <p className="font-semibold text-slate-800 text-sm">{party.name}</p>
                                <p className="text-xs text-slate-500">{party.relationship}</p>
                             </div>
                         </div>
                         <button onClick={() => removeRelatedParty(party.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100">&times;</button>
                     </div>
                 ))}
                 {data.sa550.parties.length === 0 && <p className="text-slate-400 text-sm col-span-full text-center italic py-2">No related parties added yet.</p>}
             </div>

             <div className="relative">
                 <label className="block text-sm font-semibold text-slate-700 mb-2">Review of Significant Transactions</label>
                <textarea 
                    placeholder="Summary of transactions identified outside normal course of business..."
                    className="w-full p-3 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={3}
                    value={data.sa550.transactionsReview}
                    onChange={(e) => updateField('sa550', 'transactionsReview', e.target.value)}
                />
             </div>
          </div>
        )}
       </div>

       {/* SA 560 */}
       <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 560: Subsequent Events" 
            sectionId="sa560"
            isExpanded={expandedSection === 'sa560'} 
            onClick={() => toggleSection('sa560')} 
            status={getSectionStatus('sa560')}
        />
        {expandedSection === 'sa560' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="space-y-3 mb-6">
                <ChecklistItem id="sa560_1" label="Inquiry of management regarding events after reporting date" checked={data.sa560.checklist.inquiryManagement} onChange={() => toggleChecklist('sa560', 'checklist', 'inquiryManagement')} />
                <ChecklistItem id="sa560_2" label="Read minutes of meetings held after date of financial statements" checked={data.sa560.checklist.reviewMinutes} onChange={() => toggleChecklist('sa560', 'checklist', 'reviewMinutes')} />
                <ChecklistItem id="sa560_3" label="Read entity's latest available interim financial statements" checked={data.sa560.checklist.reviewInterimFS} onChange={() => toggleChecklist('sa560', 'checklist', 'reviewInterimFS')} />
             </div>
             <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2">Events Identified</label>
                 <textarea 
                    placeholder="Describe any subsequent events identified requiring adjustment or disclosure..."
                    className="w-full p-4 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
                    rows={2}
                    value={data.sa560.eventsNoted}
                    onChange={(e) => updateField('sa560', 'eventsNoted', e.target.value)}
                />
             </div>
          </div>
        )}
       </div>

       {/* SA 570 */}
       <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 570: Going Concern" 
            sectionId="sa570"
            isExpanded={expandedSection === 'sa570'} 
            onClick={() => toggleSection('sa570')} 
            status={getSectionStatus('sa570')}
        />
        {expandedSection === 'sa570' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-bold text-yellow-800 uppercase mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Potential Indicators
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ChecklistItem id="gc_1" label="Net liability or net current liability" checked={data.sa570.indicators.netLiability} onChange={() => toggleChecklist('sa570', 'indicators', 'netLiability')} />
                    <ChecklistItem id="gc_2" label="Fixed-term borrowings maturity issues" checked={data.sa570.indicators.borrowingMaturity} onChange={() => toggleChecklist('sa570', 'indicators', 'borrowingMaturity')} />
                    <ChecklistItem id="gc_3" label="Loss of key management" checked={data.sa570.indicators.lossKeyManagement} onChange={() => toggleChecklist('sa570', 'indicators', 'lossKeyManagement')} />
                    <ChecklistItem id="gc_4" label="Negative operating cash flows" checked={data.sa570.indicators.negativeCashFlow} onChange={() => toggleChecklist('sa570', 'indicators', 'negativeCashFlow')} />
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1">
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Auditor's Conclusion</label>
                     <select 
                        value={data.sa570.conclusion} 
                        onChange={(e) => updateField('sa570', 'conclusion', e.target.value)}
                        className={`w-full p-3 border rounded-lg text-sm font-bold outline-none ring-2 ring-offset-2 ${
                            data.sa570.conclusion === 'Appropriate' ? 'border-green-300 text-green-700 bg-green-50 ring-green-100' : 
                            data.sa570.conclusion === 'Material Uncertainty' ? 'border-yellow-300 text-yellow-700 bg-yellow-50 ring-yellow-100' :
                            'border-red-300 text-red-700 bg-red-50 ring-red-100'
                        }`}
                     >
                         <option value="Appropriate">Appropriate</option>
                         <option value="Material Uncertainty">Material Uncertainty</option>
                         <option value="Inappropriate">Inappropriate</option>
                     </select>
                     <p className="text-xs text-slate-400 mt-2">Select the conclusion based on evidence obtained.</p>
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Justification</label>
                    <textarea 
                        placeholder="Reasoning for conclusion and description of mitigating factors..."
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white h-[100px]" 
                        value={data.sa570.justification}
                        onChange={(e) => updateField('sa570', 'justification', e.target.value)}
                    />
                 </div>
             </div>
          </div>
        )}
       </div>

       {/* SA 580 */}
       <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
        <SectionHeader 
            title="NSA 580: Written Representations" 
            sectionId="sa580"
            isExpanded={expandedSection === 'sa580'} 
            onClick={() => toggleSection('sa580')} 
            status={getSectionStatus('sa580')}
        />
        {expandedSection === 'sa580' && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 bg-white p-4 rounded-lg border border-slate-200">
                 <label className="text-sm font-bold text-slate-700">Date of Management Representation Letter:</label>
                 <input 
                    type="date" 
                    value={data.sa580.letterDate} 
                    onChange={(e) => updateField('sa580', 'letterDate', e.target.value)}
                    className="p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" 
                 />
                 <span className="text-xs text-slate-400 italic">(Should be same as Audit Report Date)</span>
             </div>
             <div className="space-y-3">
                 <p className="text-sm font-semibold text-slate-700 mb-2">Confirm Representations Obtained:</p>
                 <ChecklistItem id="rep_1" label="Mgmt fulfilled responsibility for FS preparation" checked={data.sa580.checklist.respPreparation} onChange={() => toggleChecklist('sa580', 'checklist', 'respPreparation')} />
                 <ChecklistItem id="rep_2" label="Mgmt provided all relevant information and access" checked={data.sa580.checklist.respInformation} onChange={() => toggleChecklist('sa580', 'checklist', 'respInformation')} />
                 <ChecklistItem id="rep_3" label="All transactions recorded and reflected in FS" checked={data.sa580.checklist.respTransactions} onChange={() => toggleChecklist('sa580', 'checklist', 'respTransactions')} />
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

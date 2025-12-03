
import React, { useState, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { setSectionData, subscribeToSection } from '../services/db';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  draftTemplate: string;
}

// ... (DraftModal Component) ...
const DraftModal: React.FC<{ isOpen: boolean; title: string; content: string; onClose: () => void; onContentChange: (newContent: string) => void; }> = ({ isOpen, title, content, onClose, onContentChange }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 p-6">
                 <h4 className="text-lg font-bold mb-4">{title}</h4>
                 <textarea value={content} onChange={e => onContentChange(e.target.value)} className="w-full h-64 p-3 border rounded mb-4" />
                 <div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded">Close</button></div>
            </div>
        </div>
    );
};

const Checklist: React.FC<{
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onOpenDraft: (item: ChecklistItem) => void;
}> = ({ items, onToggle, onOpenDraft }) => (
  <ul className="space-y-4">
    {items.map((item) => (
      <li key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors duration-200">
        <div className="flex items-start flex-grow mr-4">
          <input
            type="checkbox"
            id={item.id}
            checked={item.checked}
            onChange={() => onToggle(item.id)}
            className="h-5 w-5 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0 cursor-pointer"
          />
          <label htmlFor={item.id} className={`ml-3 block text-sm text-slate-700 ${item.checked ? 'line-through text-slate-400' : ''}`}>
            {item.text}
          </label>
        </div>
        <button
          onClick={() => onOpenDraft(item)}
          className="flex-shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1 px-3 rounded-md transition-all duration-200"
        >
          Draft
        </button>
      </li>
    ))}
  </ul>
);

const Communication: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [sa260Items, setSa260Items] = useState<ChecklistItem[]>([]);
  const [sa265Items, setSa265Items] = useState<ChecklistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'communication', (fetchedData) => {
        if (fetchedData) {
            if (fetchedData.sa260) setSa260Items(fetchedData.sa260);
            if (fetchedData.sa265) setSa265Items(fetchedData.sa265);
        } else {
             // Initialize default if empty
             setSa260Items([
                 { id: 'sa260-1', text: "Auditor's responsibilities in relation to the financial statement audit.", checked: false, draftTemplate: "Draft Content..." },
                 { id: 'sa260-2', text: "Planned scope and timing of the audit.", checked: false, draftTemplate: "Draft Content..." },
                 { id: 'sa260-3', text: "Significant findings from the audit.", checked: false, draftTemplate: "Draft Content..." }
             ]);
             setSa265Items([
                 { id: 'sa265-1', text: "Identified significant deficiencies in internal control.", checked: false, draftTemplate: "Draft Content..." }
             ]);
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const updateList = (
      setter: React.Dispatch<React.SetStateAction<ChecklistItem[]>>, 
      listName: 'sa260' | 'sa265', 
      updatedList: ChecklistItem[]
    ) => {
        setter(updatedList);
        if (isLoaded) {
            setSectionData(engagementId, `communication/${listName}`, updatedList);
        }
  };

  const [draftModalState, setDraftModalState] = useState({ isOpen: false, title: '', content: '' });

  const toggleItem = (currentList: ChecklistItem[], setter: any, listName: 'sa260' | 'sa265', id: string) => {
    const updatedList = currentList.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    updateList(setter, listName, updatedList);
  };

  const handleOpenDraft = (item: ChecklistItem) => {
    setDraftModalState({ isOpen: true, title: item.text, content: item.draftTemplate });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">NSA 260: Communication with TCWG</h3>
        <Checklist items={sa260Items} onToggle={(id) => toggleItem(sa260Items, setSa260Items, 'sa260', id)} onOpenDraft={handleOpenDraft} />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">NSA 265: Communicating Deficiencies</h3>
        <Checklist items={sa265Items} onToggle={(id) => toggleItem(sa265Items, setSa265Items, 'sa265', id)} onOpenDraft={handleOpenDraft} />
      </div>

      <DraftModal
        isOpen={draftModalState.isOpen}
        title={draftModalState.title}
        content={draftModalState.content}
        onClose={() => setDraftModalState({ ...draftModalState, isOpen: false })}
        onContentChange={(val) => setDraftModalState({ ...draftModalState, content: val })}
      />
    </div>
  );
};

export default Communication;


import React, { useState, useRef, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { setSectionData, subscribeToSection } from '../services/db';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  draftTemplate: string;
}

const initialSa260Items: ChecklistItem[] = [
  { id: 'sa260-1', text: "Auditor's responsibilities in relation to the financial statement audit.", checked: false, draftTemplate: `Subject: Confirmation of Auditor's Responsibilities\n\nDear [Name of TCWG/Management],\n\nThis letter is to confirm our understanding of the responsibilities of the auditor in relation to the financial statement audit of [Client Name] for the year ended [FY Period End]. Our audit will be conducted in accordance with Nepal Standards on Auditing (NSAs) with the objective of expressing an opinion on the financial statements. Our responsibilities are further detailed in our engagement letter dated [Date].\n\nSincerely,\n[Your Name]` },
  { id: 'sa260-2', text: "Planned scope and timing of the audit.", checked: false, draftTemplate: `Subject: Planned Scope and Timing of the Audit\n\nDear [Name of TCWG/Management],\n\nThis communication outlines the planned scope and timing of our audit for [Client Name] for the year ended [FY Period End]. We plan to focus on key risk areas including [e.g., revenue recognition, inventory valuation]. Our fieldwork is scheduled to commence on [Start Date] and we anticipate completing the audit and issuing our report by [End Date].\n\nWe will coordinate with your team to ensure minimal disruption to your operations. \n\nSincerely,\n[Your Name]` },
  { id: 'sa260-3', text: "Significant findings from the audit (e.g., accounting policies, estimates, difficulties).", checked: false, draftTemplate: `Subject: Significant Findings from the Audit\n\nDear [Name of TCWG/Management],\n\nIn connection with our audit of [Client Name]'s financial statements, we wish to communicate the following significant findings:\n\n1.  **Significant Accounting Policies:** [Describe any new or contentious accounting policies.]\n2.  **Significant Accounting Estimates:** [Describe management's judgments and the basis for our conclusions on key estimates, e.g., allowance for doubtful accounts.]\n3.  **Significant Difficulties Encountered:** [Describe any difficulties, e.g., access to information, significant delays.]\n\nWe are available to discuss these matters further at your convenience.\n\nSincerely,\n[Your Name]` },
  { id: 'sa260-4', text: "Statement on auditor independence.", checked: false, draftTemplate: `Subject: Confirmation of Auditor Independence\n\nDear [Name of TCWG/Management],\n\nIn accordance with professional standards, we confirm that we are independent with respect to [Client Name]. Our independence has been maintained throughout the audit engagement period, and we have complied with all relevant ethical requirements regarding independence.\n\nSincerely,\n[Your Name]` },
  { id: 'sa260-5', text: "Form, timing, and expected content of the audit report.", checked: false, draftTemplate: `Subject: Audit Report Communication\n\nDear [Name of TCWG/Management],\n\nWe anticipate issuing an unmodified audit opinion on the financial statements of [Client Name]. The expected date of our report is [Report Date]. The report will be addressed to the shareholders and will follow the format prescribed by Nepal Standards on Auditing.\n\nSincerely,\n[Your Name]` },
  { id: 'sa260-5a', text: "Circumstances that Affect the Form and Content of the Auditor’s Report", checked: false, draftTemplate: `Subject: Potential Circumstances Affecting the Auditor's Report\n\nDear [Name of TCWG/Management],\n\nThis communication is to inform you of circumstances that may affect the form and content of our auditor’s report for [Client Name] for the year ended [FY Period End]. As part of our commitment to transparent communication, we are highlighting potential areas that could necessitate a change from a standard, unmodified report.\n\nBased on our audit procedures to date, we bring the following to your attention:\n\n- **Modification of Opinion (NSA 705, Revised):** We may need to modify our audit opinion if we encounter issues such as a material misstatement in the financial statements or an inability to obtain sufficient appropriate audit evidence.\n  - *Current Status:* [Describe any specific disagreements or scope limitations, or state "None identified at this time."]\n\n- **Material Uncertainty Related to Going Concern (NSA 570, Revised):** Should we identify a material uncertainty related to events or conditions that may cast significant doubt on the company's ability to continue as a going concern, we are required to include a separate section in our report detailing this uncertainty.\n  - *Current Status:* [Describe any going concern issues, or state "None identified at this time."]\n\n- **Key Audit Matters (NSA 701):** For listed entities, our report will include a section on Key Audit Matters (KAMs), which are the most significant matters in our professional judgment.\n  - *Planned KAMs:* [List potential KAMs, e.g., Revenue Recognition, Impairment of Goodwill.]\n\n- **Emphasis of Matter or Other Matter Paragraphs (NSA 706, Revised):** We may need to include an Emphasis of Matter paragraph to draw attention to a matter appropriately presented or disclosed in the financial statements that is of such importance that it is fundamental to users' understanding, or an Other Matter paragraph to communicate a matter not presented or disclosed.\n  - *Potential Matters:* [Describe any potential EOM or OM paragraphs, or state "None identified at this time."]\n\n- **Material Misstatement of Other Information (NSA 720, Revised):** If we conclude that a material misstatement exists in the "other information" (e.g., the annual report, excluding the financial statements), and it remains uncorrected, we are required to describe this in our auditor's report.\n  - *Current Status:* [Describe any identified misstatements in other information, or state "None identified at this time."]\n\nWe believe it is important to bring these potential issues to your attention promptly. We are available to discuss these matters further to understand management's position and determine the appropriate resolution.\n\nSincerely,\n[Your Name]` },
  { id: 'sa260-6', text: "Any other significant matters discussed with management.", checked: false, draftTemplate: `Subject: Other Significant Matters Discussed\n\nDear [Name of TCWG/Management],\n\nThis memo summarizes other significant matters that arose during the audit and were discussed with management, which we believe are relevant to your oversight responsibilities:\n\n- [Matter 1]\n- [Matter 2]\n\nWe are available for further discussion.\n\nSincerely,\n[Your Name]` },
];

const initialSa265Items: ChecklistItem[] = [
  { id: 'sa265-1', text: "Identified significant deficiencies in internal control.", checked: false, draftTemplate: `Subject: Communication of Significant Deficiencies in Internal Control\n\nDear [Name of TCWG/Management],\n\nDuring our audit of the financial statements of [Client Name] for the year ended [FY Period End], we identified deficiencies in internal control that we consider to be significant deficiencies. These are detailed below:\n\n**Deficiency 1:** [Description of the deficiency]\n**Potential Effect:** [Describe the potential effect on the financial statements]\n**Recommendation:** [Provide a recommendation to address the deficiency]\n\nThis communication is intended solely for the information and use of management, those charged with governance, and others within the organization and is not intended to be and should not be used by anyone other than these specified parties.\n\nSincerely,\n[Your Name]` },
  { id: 'sa265-2', text: "Prepared written communication for TCWG regarding significant deficiencies.", checked: false, draftTemplate: `Subject: Communication of Significant Deficiencies in Internal Control\n\nDear [Name of TCWG/Management],\n\nDuring our audit of the financial statements of [Client Name] for the year ended [FY Period End], we identified deficiencies in internal control that we consider to be significant deficiencies. These are detailed below:\n\n**Deficiency 1:** [Description of the deficiency]\n**Potential Effect:** [Describe the potential effect on the financial statements]\n**Recommendation:** [Provide a recommendation to address the deficiency]\n\nThis communication is intended solely for the information and use of management, those charged with governance, and others within the organization and is not intended to be and should not be used by anyone other than these specified parties.\n\nSincerely,\n[Your Name]` },
  { id: 'sa265-3', text: "Communicated other internal control deficiencies to the appropriate level of management.", checked: false, draftTemplate: `Subject: Communication of Other Deficiencies in Internal Control\n\nDear [Name of Management],\n\nIn the course of our audit of [Client Name], we identified certain deficiencies in internal control that are not considered to be significant deficiencies, but which we wish to bring to your attention for corrective action:\n\n- [Deficiency A: Description and Recommendation]\n- [Deficiency B: Description and Recommendation]\n\nWe would be pleased to discuss these matters with you further.\n\nSincerely,\n[Your Name]` },
  { id: 'sa265-4', text: "Written communication includes a description of deficiencies and their potential effects.", checked: false, draftTemplate: `Note to Auditor:\n\nEnsure the written communication includes a clear description of each significant deficiency and an explanation of their potential effects. \n\nIt should also include the following context:\n1. The purpose of the audit was to express an opinion on the financial statements, not on the effectiveness of internal control.\n2. The matters being reported are limited to those deficiencies that the auditor has identified during the audit and that the auditor has concluded are of sufficient importance to merit being reported to those charged with governance.\n3. The communication is for the use of TCWG and management and should not be disclosed to third parties.` },
];

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
            className="h-5 w-5 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
            aria-labelledby={`${item.id}-label`}
          />
          <label id={`${item.id}-label`} htmlFor={item.id} className={`ml-3 block text-sm text-slate-700 ${item.checked ? 'line-through text-slate-400' : ''}`}>
            {item.text}
          </label>
        </div>
        <button
          onClick={() => onOpenDraft(item)}
          className="flex-shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1 px-3 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Draft
        </button>
      </li>
    ))}
  </ul>
);

const Communication: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [sa260Items, setSa260Items] = useState<ChecklistItem[]>(initialSa260Items);
  const [sa265Items, setSa265Items] = useState<ChecklistItem[]>(initialSa265Items);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'communication', (fetchedData) => {
        if (fetchedData) {
            if (fetchedData.sa260) setSa260Items(fetchedData.sa260);
            if (fetchedData.sa265) setSa265Items(fetchedData.sa265);
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  // Updates need to update local state + db
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

  const [draftModalState, setDraftModalState] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
  }>({ isOpen: false, title: '', content: '' });

  const toggleItem = (
      currentList: ChecklistItem[], 
      setter: React.Dispatch<React.SetStateAction<ChecklistItem[]>>, 
      listName: 'sa260' | 'sa265', 
      id: string
    ) => {
    const updatedList = currentList.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
    );
    updateList(setter, listName, updatedList);
  };

  const handleOpenDraft = (item: ChecklistItem) => {
    const personalizedContent = item.draftTemplate
      .replace(/\[Client Name\]/g, client.name)
      .replace(/\[FY Period End\]/g, new Date(client.fyPeriodEnd + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

    setDraftModalState({
      isOpen: true,
      title: item.text,
      content: personalizedContent,
    });
  };
  
  const handleCloseDraft = () => {
    setDraftModalState({ isOpen: false, title: '', content: '' });
  };

  const handleDraftContentChange = (newContent: string) => {
    setDraftModalState(prevState => ({ ...prevState, content: newContent }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">NSA 260: Communication with Those Charged with Governance (TCWG)</h3>
        <p className="text-slate-500 mb-6">Track key communications required with the management and governance body of <strong className="font-semibold text-indigo-600">{client.name}</strong>.</p>
        <Checklist items={sa260Items} onToggle={(id) => toggleItem(sa260Items, setSa260Items, 'sa260', id)} onOpenDraft={handleOpenDraft} />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">NSA 265: Communicating Deficiencies in Internal Control</h3>
        <p className="text-slate-500 mb-6">Ensure timely communication of internal control deficiencies identified during the audit.</p>
        <Checklist items={sa265Items} onToggle={(id) => toggleItem(sa265Items, setSa265Items, 'sa265', id)} onOpenDraft={handleOpenDraft} />
      </div>

      <DraftModal
        isOpen={draftModalState.isOpen}
        title={draftModalState.title}
        content={draftModalState.content}
        onClose={handleCloseDraft}
        onContentChange={handleDraftContentChange}
      />
    </div>
  );
};

export default Communication;

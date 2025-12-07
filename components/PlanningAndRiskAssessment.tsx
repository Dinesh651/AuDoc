
import React, { useState, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

const EyeIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

interface TextAreaWithAutoFillProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  autoFillContent: string;
  rows?: number;
  className?: string;
}

const TextAreaWithAutoFill: React.FC<TextAreaWithAutoFillProps> = ({
  id,
  value,
  onChange,
  placeholder,
  autoFillContent,
  rows = 3,
  className = "",
}) => {
  const handleAutoFill = () => {
    if (value && !window.confirm("This will overwrite the current content. Continue?")) {
        return;
    }
    onChange(autoFillContent);
  };

  return (
    <div className="relative group">
      <textarea
        id={id}
        rows={rows}
        className={`w-full p-3 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y shadow-sm pr-10 ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={handleAutoFill}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-white bg-opacity-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors opacity-70 hover:opacity-100"
        title="Auto-fill with standard details"
      >
        <EyeIcon />
      </button>
    </div>
  );
};

const PlanningAndRiskAssessment: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [data, setData] = useState({
    overallStrategy: '',
    auditPlan: '',
    inquiries: '',
    analyticalProcedures: '',
    observationInspection: '',
    internalControl: '',
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'planning', (fetchedData) => {
        if (fetchedData) {
            setData(prev => ({ ...prev, ...fetchedData }));
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const updateData = (key: keyof typeof data, value: string) => {
      setData(prev => {
          const newState = { ...prev, [key]: value };
          if (isLoaded) {
              updateSectionData(engagementId, 'planning', { [key]: value });
          }
          return newState;
      });
  };

  // Auto-fill contents
  const strategyAutoFill = `1. Scope: Statutory Audit for the FY ending ${client.fyPeriodEnd}.
2. Timing: Planning phase in [Month], Fieldwork in [Month], Reporting by [Date].
3. Direction: Focus on high-risk areas including Revenue Recognition and Inventory Valuation.
4. Team: Engagement Partner, Audit Manager, and 2 Audit Assistants.
5. Resources: Utilization of internal audit checklists and external confirmation tools.`;

  const planAutoFill = `1. Risk Assessment: Perform walkthroughs for Sales, Purchase, and Payroll cycles.
2. Tests of Controls: Test operating effectiveness of key controls in Revenue and Procurement.
3. Substantive Procedures:
   - 100% verification of material transactions.
   - Sampling for operating expenses.
   - External confirmations for Bank, Debtors, and Creditors.
   - Physical verification of Inventory and Fixed Assets.`;

  const inquiriesAutoFill = `- Discussed significant business changes and strategic direction with Managing Director.
- Inquired about fraud risks, suspected fraud, or allegations with the CFO.
- Checked for pending litigation or non-compliance with the Legal Head.
- Confirmed related party transactions and balances with the Company Secretary.`;

  const analyticalAutoFill = `- Compared current year Trial Balance with previous year audited figures.
- Analyzed trends in Gross Profit Ratio and Net Profit Ratio.
- Investigated variances exceeding 10% in administrative and selling expenses.
- Reviewed monthly sales data to identify seasonality or unusual spikes.`;

  const observationAutoFill = `- Observed the annual physical inventory count on [Date].
- Observed security and access controls at the factory/warehouse premises.
- Inspected minutes of Board of Directors and Audit Committee meetings.
- Verified original title deeds for Land and Building.`;

  const internalControlAutoFill = `1. Control Environment: Management demonstrates integrity; clear organizational structure exists.
2. Risk Assessment: Entity has a documented process to identify business risks (e.g., market competition).
3. Information System: Uses [ERP Name] for financial reporting; access is restricted by user roles.
4. Control Activities: Segregation of duties enforced in cash handling; authorization required for POs > [Amount].
5. Monitoring: Regular internal audit reviews; monthly management accounts review by the Board.`;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header / Intro */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Planning and Risk Assessment</h3>
        <p className="text-slate-600">
          This phase involves defining the audit scope, timing, and direction based on an understanding of the entity and its risks (NSA 300, NSA 315, NSA 320).
        </p>
      </div>

      {/* Section A: Establishing Strategy and Plan (NSA 300) */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">A. Establishing Strategy and Plan (NSA 300)</h3>
          <p className="text-slate-500 mt-1">
            Planning involves establishing the overall audit strategy and developing an audit plan. Planning is a continual and iterative process.
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Overall Audit Strategy */}
          <div>
            <label htmlFor="strategy" className="block text-lg font-semibold text-slate-700 mb-2">
              1. Overall Audit Strategy
            </label>
            <div className="bg-slate-50 p-4 rounded-md mb-3 text-sm text-slate-600 border border-slate-200">
              This sets the scope, timing, and direction of the audit. The auditor identifies characteristics defining the scope, ascertains reporting objectives (timing/communications), considers factors significant for directing team efforts, and determines the nature, timing, and extent of necessary resources.
            </div>
            <TextAreaWithAutoFill
              id="strategy"
              rows={6}
              placeholder="Document the overall audit strategy here..."
              value={data.overallStrategy}
              onChange={(val) => updateData('overallStrategy', val)}
              autoFillContent={strategyAutoFill}
            />
          </div>

          {/* 2. Audit Plan */}
          <div>
            <label htmlFor="auditPlan" className="block text-lg font-semibold text-slate-700 mb-2">
              2. Audit Plan
            </label>
            <div className="bg-slate-50 p-4 rounded-md mb-3 text-sm text-slate-600 border border-slate-200">
              This is more detailed and includes a description of the nature, timing, and extent of planned risk assessment procedures (NSA 315) and further audit procedures (NSA 330) at the assertion level.
            </div>
            <TextAreaWithAutoFill
              id="auditPlan"
              rows={6}
              placeholder="Document the detailed audit plan here..."
              value={data.auditPlan}
              onChange={(val) => updateData('auditPlan', val)}
              autoFillContent={planAutoFill}
            />
          </div>
        </div>
      </div>

      {/* Section B: Understanding the Entity and Assessing Risk (NSA 315) */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">B. Understanding the Entity and Assessing Risk (NSA 315)</h3>
          <p className="text-slate-500 mt-1">
            The auditor must obtain a sufficient understanding of the entity and its environment to identify and assess the risks of material misstatement (ROMM).
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Risk Assessment Procedures */}
          <div>
            <h4 className="text-lg font-semibold text-slate-700 mb-4">1. Risk Assessment Procedures</h4>
            <p className="text-sm text-slate-500 mb-4">
              These procedures provide the basis for risk assessment. Document your findings for each category below:
            </p>

            <div className="grid grid-cols-1 gap-6">
              {/* Inquiries */}
              <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                <label htmlFor="inquiries" className="block font-medium text-slate-800 mb-2">
                  Inquiries of management and others
                </label>
                <p className="text-xs text-slate-500 mb-2">To obtain information relevant to identifying ROMM.</p>
                <TextAreaWithAutoFill
                  id="inquiries"
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notes on inquiries made..."
                  value={data.inquiries}
                  onChange={(val) => updateData('inquiries', val)}
                  autoFillContent={inquiriesAutoFill}
                />
              </div>

              {/* Analytical Procedures */}
              <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                <label htmlFor="analytical" className="block font-medium text-slate-800 mb-2">
                  Analytical procedures
                </label>
                <p className="text-xs text-slate-500 mb-2">To assist in understanding the entity and identifying unusual transactions or events.</p>
                <TextAreaWithAutoFill
                  id="analytical"
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notes on analytical procedures performed..."
                  value={data.analyticalProcedures}
                  onChange={(val) => updateData('analyticalProcedures', val)}
                  autoFillContent={analyticalAutoFill}
                />
              </div>

              {/* Observation and Inspection */}
              <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                <label htmlFor="observation" className="block font-medium text-slate-800 mb-2">
                  Observation and inspection
                </label>
                <p className="text-xs text-slate-500 mb-2">Including observing entity operations, inspecting documents (like business plans), and visiting premises.</p>
                <TextAreaWithAutoFill
                  id="observation"
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Notes on observations and inspections..."
                  value={data.observationInspection}
                  onChange={(val) => updateData('observationInspection', val)}
                  autoFillContent={observationAutoFill}
                />
              </div>
            </div>
          </div>

          {/* 2. Internal Control Understanding */}
          <div>
            <label htmlFor="internalControl" className="block text-lg font-semibold text-slate-700 mb-2">
              2. Internal Control Understanding
            </label>
            <div className="bg-slate-50 p-4 rounded-md mb-3 text-sm text-slate-600 border border-slate-200">
              The auditor must obtain an understanding of internal control relevant to the audit, categorized into the control environment, the entity’s risk assessment process, information systems relevant to financial reporting, and control activities.
            </div>
            <TextAreaWithAutoFill
              id="internalControl"
              rows={6}
              placeholder="Document understanding of internal controls here..."
              value={data.internalControl}
              onChange={(val) => updateData('internalControl', val)}
              autoFillContent={internalControlAutoFill}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAndRiskAssessment;

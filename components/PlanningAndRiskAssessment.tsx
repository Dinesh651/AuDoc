
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

type RiskLevel = 'Low' | 'Moderate' | 'High';

interface RiskItem {
  id: string;
  description: string;
  area: string;
  assertions: string;
  fraudRisk: boolean;
  significantRisk: boolean;
  inherent: RiskLevel;
  control: RiskLevel;
  response: string;
}

interface AnalyticalRow {
  id: string;
  caption: string;
  current: number;
  prior: number;
  commentary: string;
}

const RISK_SCORE: Record<RiskLevel, number> = { Low: 1, Moderate: 2, High: 3 };

const combinedRomm = (risk: RiskItem): RiskLevel => {
  if (risk.fraudRisk || risk.significantRisk) return 'High';
  const product = RISK_SCORE[risk.inherent] * RISK_SCORE[risk.control];
  if (product >= 6) return 'High';
  if (product >= 3) return 'Moderate';
  return 'Low';
};

const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => (
  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
    level === 'High' ? 'bg-red-100 text-red-700' :
    level === 'Moderate' ? 'bg-amber-100 text-amber-700' :
    'bg-green-100 text-green-700'
  }`}>
    {level}
  </span>
);

const npr = (n: number) => `NPR ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PlanningAndRiskAssessment: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [data, setData] = useState({
    overallStrategy: '',
    auditPlan: '',
    inquiries: '',
    analyticalProcedures: '',
    observationInspection: '',
    internalControl: '',
    riskRegister: [] as RiskItem[],
    analyticalThreshold: 10,
    analyticalRows: [] as AnalyticalRow[],
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'planning', (fetchedData) => {
        if (fetchedData) {
            setData(prev => ({
                ...prev,
                ...fetchedData,
                riskRegister: fetchedData.riskRegister || [],
                analyticalRows: fetchedData.analyticalRows || [],
            }));
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const updateData = (key: keyof typeof data, value: any) => {
      setData(prev => {
          const newState = { ...prev, [key]: value };
          if (isLoaded) {
              updateSectionData(engagementId, 'planning', { [key]: value });
          }
          return newState;
      });
  };

  // --- Risk Register (NSA 315 / 330) ---
  const emptyRisk: Omit<RiskItem, 'id'> = {
    description: '', area: '', assertions: '', fraudRisk: false,
    significantRisk: false, inherent: 'Moderate', control: 'Moderate', response: '',
  };
  const [newRisk, setNewRisk] = useState<Omit<RiskItem, 'id'>>(emptyRisk);

  const addRisk = () => {
    if (!newRisk.description.trim() || !newRisk.area.trim()) return;
    updateData('riskRegister', [...data.riskRegister, { ...newRisk, id: Date.now().toString() }]);
    setNewRisk(emptyRisk);
  };

  const removeRisk = (id: string) => {
    updateData('riskRegister', data.riskRegister.filter(r => r.id !== id));
  };

  const updateRiskResponse = (id: string, response: string) => {
    updateData('riskRegister', data.riskRegister.map(r => r.id === id ? { ...r, response } : r));
  };

  // --- Comparative Analytical Review (NSA 520) ---
  const emptyAnalytical: Omit<AnalyticalRow, 'id'> = { caption: '', current: 0, prior: 0, commentary: '' };
  const [newAnalytical, setNewAnalytical] = useState<Omit<AnalyticalRow, 'id'>>(emptyAnalytical);

  const addAnalyticalRow = () => {
    if (!newAnalytical.caption.trim()) return;
    updateData('analyticalRows', [...data.analyticalRows, { ...newAnalytical, id: Date.now().toString() }]);
    setNewAnalytical(emptyAnalytical);
  };

  const removeAnalyticalRow = (id: string) => {
    updateData('analyticalRows', data.analyticalRows.filter(r => r.id !== id));
  };

  const updateAnalyticalCommentary = (id: string, commentary: string) => {
    updateData('analyticalRows', data.analyticalRows.map(r => r.id === id ? { ...r, commentary } : r));
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

      {/* Section C: Risk Register (NSA 315 / 330) */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-slate-800">C. Risk Register — Risks of Material Misstatement (NSA 315 / NSA 330)</h3>
          <p className="text-slate-500 mt-1">
            Document each identified risk at the assertion level, assess inherent and control risk, and design the planned audit response. Fraud risks and significant risks are automatically rated High.
          </p>
        </div>

        {/* Add risk form */}
        <div className="bg-slate-50 p-5 rounded-md border border-slate-200 mb-6 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 uppercase">Identify New Risk</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Risk description (e.g., Revenue may be overstated near year-end)"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              value={newRisk.description}
              onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="FS Area (e.g., Revenue)"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newRisk.area}
                onChange={(e) => setNewRisk({ ...newRisk, area: e.target.value })}
              />
              <input
                type="text"
                placeholder="Assertions (e.g., Occurrence, Cut-off)"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newRisk.assertions}
                onChange={(e) => setNewRisk({ ...newRisk, assertions: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">Inherent Risk:</label>
              <select
                value={newRisk.inherent}
                onChange={(e) => setNewRisk({ ...newRisk, inherent: e.target.value as RiskLevel })}
                className="p-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option>Low</option><option>Moderate</option><option>High</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">Control Risk:</label>
              <select
                value={newRisk.control}
                onChange={(e) => setNewRisk({ ...newRisk, control: e.target.value as RiskLevel })}
                className="p-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option>Low</option><option>Moderate</option><option>High</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={newRisk.fraudRisk} onChange={(e) => setNewRisk({ ...newRisk, fraudRisk: e.target.checked })} className="h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500" />
              Fraud Risk (NSA 240)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={newRisk.significantRisk} onChange={(e) => setNewRisk({ ...newRisk, significantRisk: e.target.checked })} className="h-4 w-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500" />
              Significant Risk
            </label>
            <span className="text-sm text-slate-500">Combined ROMM: <RiskBadge level={combinedRomm({ ...newRisk, id: '' })} /></span>
            <button
              onClick={addRisk}
              disabled={!newRisk.description.trim() || !newRisk.area.trim()}
              className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Risk
            </button>
          </div>
        </div>

        {/* Risk table */}
        {data.riskRegister.length > 0 ? (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Area / Assertions</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Flags</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">IR</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">CR</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">ROMM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[220px]">Planned Response (NSA 330)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.riskRegister.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-sm text-slate-800 max-w-xs">{risk.description}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-semibold text-slate-700">{risk.area}</p>
                      <p className="text-xs text-slate-500">{risk.assertions}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {risk.fraudRisk && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full uppercase">Fraud</span>}
                        {risk.significantRisk && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full uppercase">Significant</span>}
                        {!risk.fraudRisk && !risk.significantRisk && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={risk.inherent} /></td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={risk.control} /></td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={combinedRomm(risk)} /></td>
                    <td className="px-4 py-3">
                      <textarea
                        rows={2}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        placeholder="e.g., Extended cut-off testing, external confirmations..."
                        value={risk.response}
                        onChange={(e) => updateRiskResponse(risk.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeRisk(risk.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-300">
            <p className="text-slate-500">No risks identified yet.</p>
            <p className="text-xs text-slate-400 mt-1">Every audit should document at least the presumed risks: revenue recognition fraud risk (NSA 240) and management override of controls.</p>
          </div>
        )}
      </div>

      {/* Section D: Comparative Analytical Review (NSA 520) */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="mb-6 border-b pb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">D. Comparative Analytical Review (NSA 520)</h3>
            <p className="text-slate-500 mt-1">
              Compare current year balances with the prior year. Variances beyond the threshold are flagged for investigation and commentary.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-sm font-medium text-slate-600">Flag variances over</label>
            <input
              type="number"
              value={data.analyticalThreshold}
              onChange={(e) => updateData('analyticalThreshold', parseFloat(e.target.value) || 0)}
              className="w-20 p-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-center focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-600">%</span>
          </div>
        </div>

        {/* Add row form */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <input
                type="text"
                placeholder="FS Caption (e.g., Revenue, Trade Receivables)"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newAnalytical.caption}
                onChange={(e) => setNewAnalytical({ ...newAnalytical, caption: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 block mb-1">Current Year</label>
              <input
                type="number"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newAnalytical.current || ''}
                onChange={(e) => setNewAnalytical({ ...newAnalytical, current: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 block mb-1">Prior Year (Audited)</label>
              <input
                type="number"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newAnalytical.prior || ''}
                onChange={(e) => setNewAnalytical({ ...newAnalytical, prior: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={addAnalyticalRow}
                disabled={!newAnalytical.caption.trim()}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Line
              </button>
            </div>
          </div>
        </div>

        {data.analyticalRows.length > 0 ? (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">FS Caption</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Current Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Prior Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Variance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Var %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[220px]">Explanation / Commentary</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.analyticalRows.map((row) => {
                  const variance = (row.current || 0) - (row.prior || 0);
                  const variancePct = row.prior ? (variance / Math.abs(row.prior)) * 100 : (row.current ? 100 : 0);
                  const flagged = Math.abs(variancePct) >= (data.analyticalThreshold || 0) && (row.current !== 0 || row.prior !== 0);
                  return (
                    <tr key={row.id} className={`align-top ${flagged ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {flagged && (
                          <span title="Variance exceeds threshold — investigate" className="inline-block mr-1.5 align-middle">
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          </span>
                        )}
                        {row.caption}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{npr(row.current)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{npr(row.prior)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${variance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{npr(variance)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${flagged ? 'text-amber-600' : 'text-slate-500'}`}>{variancePct.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={2}
                          className={`w-full p-2 border rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white ${flagged && !row.commentary.trim() ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
                          placeholder={flagged ? 'Required: explain this significant variance...' : 'Optional commentary...'}
                          value={row.commentary}
                          onChange={(e) => updateAnalyticalCommentary(row.id, e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeAnalyticalRow(row.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-300">
            <p className="text-slate-500">No comparative lines added yet.</p>
            <p className="text-xs text-slate-400 mt-1">Add key financial statement captions to compare against prior year audited figures.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningAndRiskAssessment;

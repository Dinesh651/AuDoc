
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
}

const TextAreaWithAutoFill: React.FC<TextAreaWithAutoFillProps> = ({
  id,
  value,
  onChange,
  placeholder,
  autoFillContent,
  rows = 3,
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
        className="w-full p-3 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y shadow-sm pr-10"
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

interface SamplingPlan {
  id: string;
  area: string;
  population: string;
  method: string;
  sampleSize: string;
  assignedTo?: string;
}

interface Misstatement {
  id: string;
  description: string;
  account: string;
  type: 'Factual' | 'Judgmental' | 'Projected';
  amount: number; // signed: positive = overstatement, negative = understatement
  status: 'Uncorrected' | 'Corrected';
}

const npr = (n: number) => `NPR ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// MUS-style assurance factors (approx. 5% risk of incorrect acceptance)
const ASSURANCE_FACTORS: Record<string, number> = { High: 3.0, Moderate: 2.3, Low: 1.9 };

const AssignModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  teamMembers: { id: string; name: string; role: string }[];
  onAssign: (memberId: string, memberName: string) => void;
}> = ({ isOpen, onClose, teamMembers, onAssign }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Assign to Team Member</h3>
        {teamMembers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-500 mb-4">No team members available. Please add team members in the "Basics" tab first.</p>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-md">Close</button>
          </div>
        ) : (
          <div className="space-y-2">
             {teamMembers.map(member => (
               <button
                 key={member.id}
                 onClick={() => onAssign(member.id, member.name)}
                 className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-md flex justify-between items-center group"
               >
                 <span className="font-medium text-slate-700 group-hover:text-indigo-700">{member.name}</span>
                 <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{member.role}</span>
               </button>
             ))}
             <div className="pt-4 mt-2 border-t">
                <button onClick={onClose} className="w-full py-2 text-slate-500 hover:text-slate-800">Cancel</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};


const MaterialityAndSampling: React.FC<AuditTabProps> = ({ client, engagementId, teamMembers = [] }) => {
  // Combined state for persistence
  const [data, setData] = useState({
    benchmark: 'Profit Before Tax',
    benchmarkAmount: 0,
    overallPercent: 5,
    performancePercent: 75,
    justification: '',
    samplingPlans: [] as SamplingPlan[],
    misstatements: [] as Misstatement[],
    sampleCalc: { population: 0, tolerable: 0, expected: 0, risk: 'Moderate' },
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'materiality', (fetchedData) => {
        if (fetchedData) {
            setData(prev => ({
                 ...prev,
                 ...fetchedData,
                 // Ensure arrays/objects exist if undefined in DB
                 samplingPlans: fetchedData.samplingPlans || [],
                 misstatements: fetchedData.misstatements || [],
                 sampleCalc: { ...prev.sampleCalc, ...(fetchedData.sampleCalc || {}) },
            }));
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const updateData = (updates: Partial<typeof data>) => {
    setData(prev => {
        const newState = { ...prev, ...updates };
        if (isLoaded) {
            updateSectionData(engagementId, 'materiality', updates);
        }
        return newState;
    });
  };

  const [newPlan, setNewPlan] = useState<Omit<SamplingPlan, 'id'>>({
    area: '',
    population: '',
    method: 'Random Selection',
    sampleSize: '',
  });
  
  // Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentPlanIdToAssign, setCurrentPlanIdToAssign] = useState<string | null>(null);


  // Calculations
  const overallMateriality = (data.benchmarkAmount * data.overallPercent) / 100;
  const performanceMateriality = (overallMateriality * data.performancePercent) / 100;
  const trivialAmount = overallMateriality * 0.05; // Usually 5% of OM

  const justificationAutoFill = `1. Benchmark Selection: ${data.benchmark} is considered the most appropriate benchmark as it is the main driver of the entity's value and is critical to users of the financial statements.
2. Percentage Applied: A rate of ${data.overallPercent}% is consistent with industry standards for an entity with this risk profile.
3. Performance Materiality: Set at ${data.performancePercent}% of overall materiality to create a buffer for undetected misstatements.
4. Reassessment: Materiality will be reassessed if actual financial results differ significantly from initial estimates.`;

  const addSamplingPlan = () => {
    if (newPlan.area && newPlan.sampleSize) {
      const newPlans = [
        ...data.samplingPlans,
        { ...newPlan, id: Date.now().toString() },
      ];
      updateData({ samplingPlans: newPlans });
      setNewPlan({
        area: '',
        population: '',
        method: 'Random Selection',
        sampleSize: '',
      });
    }
  };

  const removeSamplingPlan = (id: string) => {
    const newPlans = data.samplingPlans.filter(p => p.id !== id);
    updateData({ samplingPlans: newPlans });
  };

  // --- NSA 450: Misstatements ---
  const emptyMisstatement: Omit<Misstatement, 'id'> = {
    description: '', account: '', type: 'Factual', amount: 0, status: 'Uncorrected',
  };
  const [newMisstatement, setNewMisstatement] = useState<Omit<Misstatement, 'id'>>(emptyMisstatement);

  const addMisstatement = () => {
    if (!newMisstatement.description.trim() || !newMisstatement.amount) return;
    updateData({ misstatements: [...data.misstatements, { ...newMisstatement, id: Date.now().toString() }] });
    setNewMisstatement(emptyMisstatement);
  };

  const removeMisstatement = (id: string) => {
    updateData({ misstatements: data.misstatements.filter(m => m.id !== id) });
  };

  const toggleMisstatementStatus = (id: string) => {
    updateData({
      misstatements: data.misstatements.map(m =>
        m.id === id ? { ...m, status: m.status === 'Corrected' ? 'Uncorrected' : 'Corrected' } : m
      ),
    });
  };

  const uncorrected = data.misstatements.filter(m => m.status === 'Uncorrected');
  const netUncorrected = uncorrected.reduce((sum, m) => sum + (m.amount || 0), 0);
  const grossUncorrected = uncorrected.reduce((sum, m) => sum + Math.abs(m.amount || 0), 0);

  // --- NSA 530: Sample size calculator ---
  const updateSampleCalc = (updates: Partial<typeof data.sampleCalc>) => {
    updateData({ sampleCalc: { ...data.sampleCalc, ...updates } });
  };
  const calcTolerable = data.sampleCalc.tolerable || performanceMateriality;
  const calcFactor = ASSURANCE_FACTORS[data.sampleCalc.risk] || 2.3;
  const calcDenominator = calcTolerable - (data.sampleCalc.expected || 0);
  const suggestedSampleSize = data.sampleCalc.population > 0 && calcDenominator > 0
    ? Math.ceil((data.sampleCalc.population * calcFactor) / calcDenominator)
    : 0;
  const samplingInterval = suggestedSampleSize > 0 ? data.sampleCalc.population / suggestedSampleSize : 0;
  
  const openAssignModal = (id: string) => {
    setCurrentPlanIdToAssign(id);
    setIsAssignModalOpen(true);
  };
  
  const handleAssign = (memberId: string, memberName: string) => {
    if (currentPlanIdToAssign) {
      const newPlans = data.samplingPlans.map(p => 
        p.id === currentPlanIdToAssign ? { ...p, assignedTo: memberName } : p
      );
      updateData({ samplingPlans: newPlans });
    }
    setIsAssignModalOpen(false);
    setCurrentPlanIdToAssign(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-pink-500">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Materiality & Sampling</h3>
        <p className="text-slate-600">
          Determine materiality levels (NSA 320) and design audit sampling procedures (NSA 530) to obtain sufficient appropriate audit evidence.
        </p>
      </div>

      {/* NSA 320: Materiality */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">NSA 320: Materiality in Planning and Performing an Audit</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Benchmark</label>
              <select 
                value={data.benchmark} 
                onChange={(e) => updateData({ benchmark: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-indigo-500"
              >
                <option value="Profit Before Tax">Profit Before Tax</option>
                <option value="Total Revenue">Total Revenue</option>
                <option value="Total Assets">Total Assets</option>
                <option value="Net Assets">Net Assets (Equity)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Benchmark Amount</label>
              <input 
                type="number" 
                value={data.benchmarkAmount || ''} 
                onChange={(e) => updateData({ benchmarkAmount: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-indigo-500"
                placeholder="Enter amount"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Overall %</label>
                <input 
                  type="number" 
                  value={data.overallPercent}
                  onChange={(e) => updateData({ overallPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Standard: 3-7% of PBT, 0.5-1% of Revenue</p>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Performance %</label>
                <input 
                  type="number" 
                  value={data.performancePercent}
                  onChange={(e) => updateData({ performancePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Standard: 60-85% of OM</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 flex flex-col justify-center space-y-6">
            <div>
              <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Overall Materiality (OM)</p>
              <p className="text-3xl font-bold text-indigo-700 mt-1">
                {overallMateriality.toLocaleString('en-US', { style: 'currency', currency: 'NPR' })}
              </p>
            </div>
            <div className="border-t border-indigo-200 pt-4">
              <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Performance Materiality (PM)</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">
                {performanceMateriality.toLocaleString('en-US', { style: 'currency', currency: 'NPR' })}
              </p>
              <p className="text-xs text-indigo-600 mt-1">Applied to account balances to reduce risk.</p>
            </div>
            <div className="border-t border-indigo-200 pt-4">
              <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Clearly Trivial Threshold (CTT)</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">
                {trivialAmount.toLocaleString('en-US', { style: 'currency', currency: 'NPR' })}
              </p>
              <p className="text-xs text-indigo-600 mt-1">Misstatements below this are ignored (approx 5% of OM).</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Basis for Conclusion (Factors Considered)</label>
          <TextAreaWithAutoFill 
            id="materiality-justification"
            value={data.justification}
            onChange={(val) => updateData({ justification: val })}
            placeholder="Document the qualitative factors affecting the benchmark selection..."
            autoFillContent={justificationAutoFill}
            rows={4}
          />
        </div>
      </div>

      {/* NSA 530: Audit Sampling */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">NSA 530: Audit Sampling</h3>

        {/* Sample Size Calculator */}
        <div className="bg-emerald-50 p-5 rounded-md border border-emerald-100 mb-6">
          <h4 className="text-sm font-bold text-emerald-800 uppercase mb-1">Sample Size Calculator (Monetary Unit Sampling)</h4>
          <p className="text-xs text-emerald-700 mb-4">Sample size = Population Value &times; Assurance Factor &divide; (Tolerable &minus; Expected Misstatement)</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Population Value (NPR)</label>
              <input
                type="number"
                value={data.sampleCalc.population || ''}
                onChange={(e) => updateSampleCalc({ population: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 50000000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tolerable Misstatement</label>
              <input
                type="number"
                value={data.sampleCalc.tolerable || ''}
                onChange={(e) => updateSampleCalc({ tolerable: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder={performanceMateriality ? `Default: PM ${npr(performanceMateriality)}` : 'Set materiality above'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expected Misstatement</label>
              <input
                type="number"
                value={data.sampleCalc.expected || ''}
                onChange={(e) => updateSampleCalc({ expected: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assessed ROMM</label>
              <select
                value={data.sampleCalc.risk}
                onChange={(e) => updateSampleCalc({ risk: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Low">Low (factor 1.9)</option>
                <option value="Moderate">Moderate (factor 2.3)</option>
                <option value="High">High (factor 3.0)</option>
              </select>
            </div>
          </div>
          {suggestedSampleSize > 0 ? (
            <div className="flex flex-wrap items-center gap-6 bg-white p-3 rounded-md border border-emerald-200">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Suggested Sample Size</p>
                <p className="text-2xl font-bold text-emerald-700">{suggestedSampleSize.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Sampling Interval</p>
                <p className="text-lg font-bold text-slate-700">{npr(samplingInterval)}</p>
              </div>
              <p className="text-xs text-slate-400 max-w-xs ml-auto">Indicative only — apply professional judgment and document the basis for the final sample size below.</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Enter a population value (and materiality above) to compute a suggested sample size.</p>
          )}
        </div>

        <div className="bg-slate-50 p-5 rounded-md border border-slate-200 mb-6">
          <h4 className="text-sm font-bold text-slate-700 uppercase mb-4">Design New Sample</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <input 
                type="text" 
                placeholder="Area (e.g., Sales)" 
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-indigo-500"
                value={newPlan.area}
                onChange={(e) => setNewPlan({...newPlan, area: e.target.value})}
              />
            </div>
            <div className="md:col-span-1">
              <input 
                type="text" 
                placeholder="Pop. Size (e.g., 500 Inv)" 
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-indigo-500"
                value={newPlan.population}
                onChange={(e) => setNewPlan({...newPlan, population: e.target.value})}
              />
            </div>
            <div className="md:col-span-1">
              <select 
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-indigo-500"
                value={newPlan.method}
                onChange={(e) => setNewPlan({...newPlan, method: e.target.value})}
              >
                <option value="Random Selection">Random Selection</option>
                <option value="Systematic Selection">Systematic Selection</option>
                <option value="Haphazard Selection">Haphazard Selection</option>
                <option value="Block Selection">Block Selection</option>
                <option value="Monetary Unit Sampling">Monetary Unit Sampling</option>
              </select>
            </div>
            <div className="md:col-span-1 flex gap-2">
              <input 
                type="text" 
                placeholder="Sample Size" 
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-indigo-500"
                value={newPlan.sampleSize}
                onChange={(e) => setNewPlan({...newPlan, sampleSize: e.target.value})}
              />
              <button 
                onClick={addSamplingPlan}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {data.samplingPlans.length > 0 ? (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Audit Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Population</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Selection Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sample Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.samplingPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{plan.area}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{plan.population}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{plan.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">{plan.sampleSize}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {plan.assignedTo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {plan.assignedTo}
                        </span>
                      ) : (
                         <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button onClick={() => openAssignModal(plan.id)} className="text-indigo-600 hover:text-indigo-900 font-medium">Assign</button>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => removeSamplingPlan(plan.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-300">
            <p className="text-slate-500">No sampling plans added yet.</p>
            <p className="text-xs text-slate-400 mt-1">Use the form above to document sampling procedures for specific areas.</p>
          </div>
        )}
      </div>

      {/* NSA 450: Evaluation of Misstatements */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-1 border-b pb-4">NSA 450: Evaluation of Misstatements Identified During the Audit</h3>
        <p className="text-sm text-slate-500 mt-3 mb-6">
          Accumulate misstatements identified during the audit (other than those clearly trivial, i.e. below {npr(trivialAmount)}) and evaluate their effect against materiality before forming the opinion.
        </p>

        {/* Add misstatement form */}
        <div className="bg-slate-50 p-5 rounded-md border border-slate-200 mb-6">
          <h4 className="text-sm font-bold text-slate-700 uppercase mb-3">Log Misstatement</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <input
                type="text"
                placeholder="Description (e.g., Unrecorded accrual for utilities)"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newMisstatement.description}
                onChange={(e) => setNewMisstatement({ ...newMisstatement, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Account"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newMisstatement.account}
                onChange={(e) => setNewMisstatement({ ...newMisstatement, account: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <select
                value={newMisstatement.type}
                onChange={(e) => setNewMisstatement({ ...newMisstatement, type: e.target.value as Misstatement['type'] })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option>Factual</option>
                <option>Judgmental</option>
                <option>Projected</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Amount (&minus; = understatement)</label>
              <input
                type="number"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                value={newMisstatement.amount || ''}
                onChange={(e) => setNewMisstatement({ ...newMisstatement, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={addMisstatement}
                disabled={!newMisstatement.description.trim() || !newMisstatement.amount}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {data.misstatements.length > 0 ? (
          <>
            <div className="overflow-x-auto border rounded-md mb-6">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {data.misstatements.map((m) => {
                    const isTrivial = Math.abs(m.amount) < trivialAmount && trivialAmount > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {m.description}
                          {isTrivial && <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase" title="Below the clearly trivial threshold">Trivial</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{m.account}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{m.type}</td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${m.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>{npr(m.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleMisstatementStatus(m.id)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                              m.status === 'Corrected'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                            title="Click to toggle corrected / uncorrected"
                          >
                            {m.status}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => removeMisstatement(m.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Evaluation Summary */}
            <div className={`p-5 rounded-lg border ${
              grossUncorrected > overallMateriality && overallMateriality > 0 ? 'bg-red-50 border-red-200' :
              grossUncorrected > performanceMateriality && performanceMateriality > 0 ? 'bg-amber-50 border-amber-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Uncorrected — Gross (Absolute)</p>
                  <p className="text-xl font-bold text-slate-800">{npr(grossUncorrected)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Uncorrected — Net</p>
                  <p className="text-xl font-bold text-slate-800">{npr(netUncorrected)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Overall / Performance Materiality</p>
                  <p className="text-sm font-bold text-slate-700 mt-1.5">{npr(overallMateriality)} / {npr(performanceMateriality)}</p>
                </div>
              </div>
              {overallMateriality > 0 ? (
                grossUncorrected > overallMateriality ? (
                  <p className="text-sm font-semibold text-red-700">
                    ⚠ Aggregate uncorrected misstatements EXCEED overall materiality. The financial statements may be materially misstated — request management to correct, and consider the impact on the audit opinion (NSA 705).
                  </p>
                ) : grossUncorrected > performanceMateriality ? (
                  <p className="text-sm font-semibold text-amber-700">
                    ⚠ Aggregate uncorrected misstatements exceed performance materiality. Reassess whether the audit strategy and remaining buffer are adequate; consider requesting corrections and performing further procedures.
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-green-700">
                    ✓ Aggregate uncorrected misstatements are below performance materiality. The financial statements are not materially misstated by identified errors, individually or in aggregate.
                  </p>
                )
              ) : (
                <p className="text-sm text-slate-500 italic">Set the materiality benchmark above to evaluate misstatements automatically.</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-md border border-dashed border-slate-300">
            <p className="text-slate-500">No misstatements logged yet.</p>
            <p className="text-xs text-slate-400 mt-1">Record differences identified during fieldwork here — they will be evaluated against materiality automatically.</p>
          </div>
        )}
      </div>

      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        teamMembers={teamMembers}
        onAssign={handleAssign}
      />

    </div>
  );
};

export default MaterialityAndSampling;

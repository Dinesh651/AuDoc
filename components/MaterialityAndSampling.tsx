
import React, { useState, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

const MaterialityAndSampling: React.FC<AuditTabProps> = ({ client, engagementId, teamMembers = [] }) => {
  const [data, setData] = useState({
    benchmark: 'Profit Before Tax',
    benchmarkAmount: 0,
    overallPercent: 5,
    performancePercent: 75,
    justification: '',
    samplingPlans: [] as any[]
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'materiality', (fetchedData) => {
        if (fetchedData) {
            setData(prev => ({ ...prev, ...fetchedData, samplingPlans: fetchedData.samplingPlans || [] }));
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

  const overallMateriality = (data.benchmarkAmount * data.overallPercent) / 100;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">NSA 320: Materiality</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Benchmark</label>
                    <select 
                        value={data.benchmark} 
                        onChange={(e) => updateData({ benchmark: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-indigo-500 bg-slate-50"
                    >
                        <option value="Profit Before Tax">Profit Before Tax</option>
                        <option value="Total Revenue">Total Revenue</option>
                        <option value="Total Assets">Total Assets</option>
                        <option value="Net Assets">Net Assets</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Benchmark Amount</label>
                    <input 
                        type="number" 
                        value={data.benchmarkAmount || ''} 
                        onChange={(e) => updateData({ benchmarkAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-indigo-500 bg-slate-50"
                    />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Overall %</label>
                        <input 
                            type="number" 
                            value={data.overallPercent} 
                            onChange={(e) => updateData({ overallPercent: parseFloat(e.target.value) })}
                            className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-indigo-500 bg-slate-50"
                        />
                    </div>
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Performance %</label>
                        <input 
                            type="number" 
                            value={data.performancePercent} 
                            onChange={(e) => updateData({ performancePercent: parseFloat(e.target.value) })}
                            className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-indigo-500 bg-slate-50"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 flex flex-col justify-center space-y-6">
                <div>
                    <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Overall Materiality (OM)</p>
                    <p className="text-3xl font-bold text-indigo-700 mt-1">
                        {overallMateriality.toLocaleString('en-US', { style: 'currency', currency: 'NPR' })}
                    </p>
                </div>
            </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">NSA 530: Audit Sampling</h3>
        <div className="bg-slate-50 p-5 rounded-md border border-slate-200 mb-6">
            <p className="text-sm text-slate-500 mb-2">Sampling plans would be added here.</p>
        </div>
        {data.samplingPlans.length === 0 && <p className="text-slate-500 italic">No sampling plans defined.</p>}
      </div>
    </div>
  );
};

export default MaterialityAndSampling;


import React, { useState, useEffect } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

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

  const textAreaClass = "w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 resize-y shadow-sm bg-white";

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-4">A. Establishing Strategy and Plan (NSA 300)</h3>
        
        <div className="space-y-6">
            <div>
                <label className="block text-lg font-semibold text-slate-700 mb-2">1. Overall Audit Strategy</label>
                <textarea
                    rows={6}
                    className={textAreaClass}
                    value={data.overallStrategy}
                    onChange={(e) => updateData('overallStrategy', e.target.value)}
                    placeholder="Document strategy..."
                />
            </div>
            <div>
                <label className="block text-lg font-semibold text-slate-700 mb-2">2. Audit Plan</label>
                <textarea
                    rows={6}
                    className={textAreaClass}
                    value={data.auditPlan}
                    onChange={(e) => updateData('auditPlan', e.target.value)}
                    placeholder="Document plan..."
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAndRiskAssessment;


import React, { useState, useEffect } from 'react';
import { AuditReportDetails, AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

const ReportingAndConclusion: React.FC<AuditTabProps> = ({ client, engagementId, onGenerateReport, isReadOnly }) => {
  const [data, setData] = useState({
    engagementPartnerName: '',
    designation: '',
    auditFirmName: '',
    reportDate: new Date().toISOString().split('T')[0],
    reportPlace: '',
    keyAuditMatters: '',
    udin: '',
    firmRegistrationNumber: '',
    includeOtherInformation: true
  });
  
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'reporting', (fetchedData) => {
        if (fetchedData) {
            setData(prev => ({ ...prev, ...fetchedData }));
        }
        setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  const updateData = (updates: Partial<typeof data>) => {
    if (isReadOnly) return;
    setData(prev => {
        const newState = { ...prev, ...updates };
        if (isLoaded) {
            updateSectionData(engagementId, 'reporting', updates);
        }
        return newState;
    });
  };

  const inputClass = `w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 ${isReadOnly ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'}`;

  // ... (Validation and Generate logic unchanged) ...
  const handleGenerate = () => {
       if (onGenerateReport) {
          onGenerateReport({ ...data, includeOtherInformation: client.isListed ? true : data.includeOtherInformation });
       }
  };

  return (
    <div className="animate-fade-in bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Generate Audit Report</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Partner Name</label>
              <input type="text" value={data.engagementPartnerName} onChange={(e) => updateData({ engagementPartnerName: e.target.value })} className={inputClass} disabled={isReadOnly} />
          </div>
          <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Designation</label>
              <input type="text" value={data.designation} onChange={(e) => updateData({ designation: e.target.value })} className={inputClass} disabled={isReadOnly} />
          </div>
           <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Firm Name</label>
              <input type="text" value={data.auditFirmName} onChange={(e) => updateData({ auditFirmName: e.target.value })} className={inputClass} disabled={isReadOnly} />
          </div>
          {/* ... Other inputs ... */}
      </div>

      <div className="pt-4 border-t">
          <button onClick={handleGenerate} className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md">
            {isReadOnly ? 'Preview Report' : 'Generate & Preview Report'}
          </button>
      </div>
    </div>
  );
};

export default ReportingAndConclusion;

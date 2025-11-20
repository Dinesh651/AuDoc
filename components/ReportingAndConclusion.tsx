
import React, { useState, useEffect } from 'react';
import { AuditReportDetails, AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

// Define props for the InputField for type safety
interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, type = 'text', placeholder, error }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${error ? 'border-red-500' : ''} ${type === 'date' ? '[&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}`}
        placeholder={placeholder}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const ReportForm: React.FC<{ 
    onGenerate: (details: AuditReportDetails) => void; 
    client: AuditTabProps['client'];
    engagementId: string;
}> = ({ onGenerate, client, engagementId }) => {
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
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
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
    setData(prev => {
        const newState = { ...prev, ...updates };
        if (isLoaded) {
            updateSectionData(engagementId, 'reporting', updates);
        }
        return newState;
    });
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.engagementPartnerName.trim()) newErrors.engagementPartnerName = 'Engagement Partner Name is required.';
    if (!data.designation.trim()) newErrors.designation = 'Designation is required.';
    if (!data.auditFirmName.trim()) newErrors.auditFirmName = 'Audit Firm Name is required.';
    if (!data.reportDate.trim()) newErrors.reportDate = 'Report Date is required.';
    if (!data.reportPlace.trim()) newErrors.reportPlace = 'Report Place is required.';
    if (!data.udin.trim()) newErrors.udin = 'UDIN is required.';
    if (!data.firmRegistrationNumber.trim()) newErrors.firmRegistrationNumber = 'Firm Registration Number is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (validate()) {
      onGenerate({
        ...data,
        includeOtherInformation: client.isListed ? true : data.includeOtherInformation,
      });
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Generate Unmodified Audit Opinion</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InputField id="engagementPartnerName" label="Engagement Partner Name" value={data.engagementPartnerName} onChange={(e) => updateData({ engagementPartnerName: e.target.value })} placeholder="e.g., John Doe" error={errors.engagementPartnerName}/>
            <InputField id="designation" label="Designation" value={data.designation} onChange={(e) => updateData({ designation: e.target.value })} placeholder="e.g., Partner" error={errors.designation}/>
            <InputField id="auditFirmName" label="Audit Firm Name" value={data.auditFirmName} onChange={(e) => updateData({ auditFirmName: e.target.value })} placeholder="e.g., ABC & Co." error={errors.auditFirmName}/>
            <InputField id="reportDate" label="Report Date" type="date" value={data.reportDate} onChange={(e) => updateData({ reportDate: e.target.value })} error={errors.reportDate}/>
            <InputField id="reportPlace" label="Report Place" value={data.reportPlace} onChange={(e) => updateData({ reportPlace: e.target.value })} placeholder="e.g., Kathmandu" error={errors.reportPlace}/>
            <InputField id="udin" label="UDIN" value={data.udin} onChange={(e) => updateData({ udin: e.target.value })} placeholder="e.g., 21012345ABCDEF1234" error={errors.udin}/>
            <InputField id="firmRegistrationNumber" label="Firm Registration Number" value={data.firmRegistrationNumber} onChange={(e) => updateData({ firmRegistrationNumber: e.target.value })} placeholder="e.g., 123-060/61" error={errors.firmRegistrationNumber}/>
        </div>
        <div>
          <label htmlFor="keyAuditMatters" className="block text-sm font-medium text-slate-600 mb-1">
            Key Audit Matters (Optional)
          </label>
          <textarea id="keyAuditMatters" value={data.keyAuditMatters} onChange={(e) => updateData({ keyAuditMatters: e.target.value })} rows={5} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y" placeholder="Enter one matter per line, or leave blank for the default statement."/>
        </div>
        
        {!client.isListed && (
          <div className="flex items-center bg-slate-50 p-3 rounded-md border border-slate-200">
            <input
              type="checkbox"
              id="includeOtherInformation"
              checked={data.includeOtherInformation}
              onChange={(e) => updateData({ includeOtherInformation: e.target.checked })}
              className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="includeOtherInformation" className="ml-3 block text-sm font-medium text-slate-700">
              Include "Information other than the Financial Statements" section?
            </label>
          </div>
        )}

        <div className="pt-4 border-t">
          <button onClick={handleGenerate} className="w-full md:w-auto py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform transform hover:scale-105">
            Generate & Preview Report
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportPreview: React.FC<{ report: string; onEdit: () => void; client: AuditTabProps['client'] }> = ({ report, onEdit, client }) => {
  const handleDownload = () => {
    const filename = `${client.name.replace(/\s+/g, '_')}_AuditReport_${client.fyPeriodEnd}.doc`;
    const blob = new Blob([report], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b pb-4">
        <h3 className="text-2xl font-bold text-slate-800 mb-2 md:mb-0">Audit Report Preview</h3>
        <div className="flex gap-4">
          <button onClick={onEdit} className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md transition-colors">
            Edit Details
          </button>
          <button onClick={handleDownload} className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-transform transform hover:scale-105">
            Download as .doc
          </button>
        </div>
      </div>
      <div className="bg-slate-50 border p-4 md:p-6 rounded-md max-h-[70vh] overflow-y-auto"
           dangerouslySetInnerHTML={{ __html: report }}
      />
    </div>
  );
};

const ReportingAndConclusion: React.FC<AuditTabProps> = ({ client, engagementId, onGenerateReport }) => {
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [reportContent, setReportContent] = useState<string>('');

  const handleGenerate = (details: AuditReportDetails) => {
    if (onGenerateReport) {
      const generatedReport = onGenerateReport(details);
      setReportContent(generatedReport);
      setView('preview');
    }
  };

  return (
    <div className="animate-fade-in">
      {view === 'form' ? (
        <ReportForm onGenerate={handleGenerate} client={client} engagementId={engagementId} />
      ) : (
        <ReportPreview report={reportContent} onEdit={() => setView('form')} client={client} />
      )}
    </div>
  );
};

export default ReportingAndConclusion;

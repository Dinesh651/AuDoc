
import React, { useState } from 'react';
import { Client } from '../types';

interface ClientOnboardingFormProps {
  onOnboard: (client: Client) => void;
}

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

const InputField: React.FC<InputFieldProps> = ({ id, label, value, onChange, type = 'text', placeholder, error }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          className={`w-full p-3 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${error ? 'border-red-500' : ''} ${type === 'date' ? 'cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:opacity-100' : ''}`}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

const ClientOnboardingForm: React.FC<ClientOnboardingFormProps> = ({ onOnboard }) => {
  const [clientName, setClientName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [fyPeriodEnd, setFyPeriodEnd] = useState<string>('');
  const [frf, setFrf] = useState<string>('NFRS');
  const [isListed, setIsListed] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isPrivateCompany =
    clientName.toLowerCase().includes('pvt ltd') ||
    clientName.toLowerCase().includes('private limited');

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!clientName.trim()) newErrors.clientName = 'Client Name is required.';
    if (!clientAddress.trim()) newErrors.clientAddress = 'Client Address is required.';
    if (!fyPeriodEnd.trim()) newErrors.fyPeriodEnd = 'Fiscal Year End is required.';
    if (!frf.trim()) newErrors.frf = 'Applicable FRF is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onOnboard({
        name: clientName,
        address: clientAddress,
        fyPeriodEnd: fyPeriodEnd,
        frf: frf,
        isListed: isPrivateCompany ? undefined : isListed, // Only set if not private
      });
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">AuDoc</h1>
        <p className="text-slate-500 mt-2">Begin a New Audit Engagement</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField id="clientName" label="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., ABC Pvt Ltd" error={errors.clientName} />
        <InputField id="clientAddress" label="Client Address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="e.g., Kathmandu, Nepal" error={errors.clientAddress} />
        <InputField id="fyPeriodEnd" label="FY Period End" type="date" value={fyPeriodEnd} onChange={(e) => setFyPeriodEnd(e.target.value)} error={errors.fyPeriodEnd} />
        <InputField id="frf" label="Applicable FRF" value={frf} onChange={(e) => setFrf(e.target.value)} placeholder="e.g., NFRS" error={errors.frf} />

        {!isPrivateCompany && (
          <div className="flex items-center bg-slate-50 p-3 rounded-md border border-slate-200">
            <input
              type="checkbox"
              id="isListed"
              checked={isListed}
              onChange={(e) => setIsListed(e.target.checked)}
              className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isListed" className="ml-3 block text-sm font-medium text-slate-700">
              Is the company listed on a stock exchange?
            </label>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
          Onboard Client & Start Audit
        </button>
      </form>
    </div>
  );
};

export default ClientOnboardingForm;

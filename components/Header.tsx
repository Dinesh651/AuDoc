
import React from 'react';
import { Client } from '../types';
import { formatDateToMonthDayYear } from '../utils/dateFormatter';

interface HeaderProps {
  client: Client;
  onMenuClick: () => void;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ client, onMenuClick, onBack }) => {
  return (
    <header className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="group flex items-center gap-2 px-3 py-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all"
              title="Back to Dashboard"
            >
              <div className="p-1 rounded-full bg-slate-100 group-hover:bg-white shadow-sm border border-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
              </div>
              <span className="hidden md:inline text-sm font-semibold">Dashboard</span>
            </button>
          )}
          <div className={`${onBack ? 'border-l pl-4 border-slate-200' : ''}`}>
            <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
            <p className="text-sm text-slate-500">
              FY Ending: {formatDateToMonthDayYear(client.fyPeriodEnd)}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-6 text-right">
          <div>
            <p className="text-xs text-slate-500 font-semibold">FRF</p>
            <p className="text-sm text-slate-800">{client.frf}</p>
          </div>
          {client.isListed !== undefined && (
            <div>
              <p className="text-xs text-slate-500 font-semibold">Listed</p>
              <p className={`text-sm font-medium ${client.isListed ? 'text-green-600' : 'text-red-600'}`}>
                {client.isListed ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;

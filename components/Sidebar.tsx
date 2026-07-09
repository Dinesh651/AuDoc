import React from 'react';
import { AuditTabInfo, SectionSignOff } from '../types';

interface SidebarProps {
  tabs: AuditTabInfo[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  isSidebarOpen: boolean;
  signOffs?: Record<string, SectionSignOff>;
}

const Sidebar: React.FC<SidebarProps> = ({ tabs, activeTabId, setActiveTabId, isSidebarOpen, signOffs = {} }) => {
  const navClass = `
    absolute md:relative z-20 flex flex-col
    bg-slate-800 text-white
    w-64 md:w-72
    min-h-screen
    shadow-lg
    transform transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0
  `;

  return (
    <nav className={navClass}>
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">AuDoc</h1>
        <p className="text-sm text-slate-400">Your Audit Companion</p>
      </div>
      <ul className="flex-grow p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabId === tab.id;
          const so = signOffs[tab.id];
          const status: 'reviewed' | 'prepared' | 'none' = so?.reviewedBy ? 'reviewed' : so?.preparedBy ? 'prepared' : 'none';
          const linkClasses = `
            flex items-center p-3 rounded-lg
            text-slate-300
            hover:bg-slate-700 hover:text-white
            transition-colors duration-200
            ${isActive ? 'bg-indigo-600 text-white' : ''}
          `;
          return (
            <li key={tab.id}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTabId(tab.id);
                }}
                className={linkClasses}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-6 h-6 mr-4 flex-shrink-0" />
                <span className="font-medium flex-grow">{tab.title}</span>
                {status === 'reviewed' && (
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center" title="Prepared & reviewed">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </span>
                )}
                {status === 'prepared' && (
                  <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-amber-400" title="Prepared — awaiting review" />
                )}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="p-4 mt-auto text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} AuDoc</p>
      </div>
    </nav>
  );
};

export default Sidebar;

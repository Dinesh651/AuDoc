import React from 'react';
import { AuditTabInfo } from '../types';

interface SidebarProps {
  tabs: AuditTabInfo[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ tabs, activeTabId, setActiveTabId, isSidebarOpen }) => {
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
                <span className="font-medium">{tab.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <div className="p-4 mt-auto text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} AuditFlow Inc.</p>
      </div>
    </nav>
  );
};

export default Sidebar;
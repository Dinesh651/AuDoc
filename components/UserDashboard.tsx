
import React from 'react';
import { Client } from '../types';
import { formatDateToMonthDayYear } from '../utils/dateFormatter';

interface EngagementSummary {
  id: string;
  client: Client;
  status: string;
  createdAt: string;
}

interface UserDashboardProps {
  user: { displayName: string | null; email: string | null; photoURL: string | null };
  engagements: EngagementSummary[];
  onNewEngagement: () => void;
  onSelectEngagement: (id: string, client: Client) => void;
  onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  user, 
  engagements, 
  onNewEngagement, 
  onSelectEngagement,
  onLogout 
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <span className="text-xl font-bold text-slate-800">AuDoc</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-full">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-slate-700">{user.displayName || user.email}</span>
            </div>
            <button 
              onClick={onLogout}
              className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Engagements</h1>
            <p className="text-slate-500 mt-1">Manage your active audit files and history.</p>
          </div>
          <button
            onClick={onNewEngagement}
            className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Engagement
          </button>
        </div>

        {engagements.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900">No engagements yet</h3>
            <p className="text-slate-500 mt-1 mb-6 max-w-sm mx-auto">Get started by onboarding your first client and setting up the audit plan.</p>
            <button
               onClick={onNewEngagement}
               className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
            >
              Start your first audit &rarr;
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engagements.map((engagement) => (
              <div 
                key={engagement.id}
                onClick={() => onSelectEngagement(engagement.id, engagement.client)}
                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    {engagement.client.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${engagement.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {engagement.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                  {engagement.client.name}
                </h3>
                <div className="text-sm text-slate-500 mt-2 space-y-1">
                  <p>FY Ending: <span className="font-medium">{formatDateToMonthDayYear(engagement.client.fyPeriodEnd)}</span></p>
                  <p>Framework: <span className="font-medium">{engagement.client.frf}</span></p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                  <span>Started {new Date(engagement.createdAt).toLocaleDateString()}</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;

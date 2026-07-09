import React from 'react';
import { auth } from '../firebase';
import { updateSectionData } from '../services/db';
import { SectionSignOff } from '../types';

interface SignOffBarProps {
  engagementId: string;
  sectionId: string;
  signOff?: SectionSignOff;
  isClosed?: boolean;
}

const formatSignDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const SignOffBar: React.FC<SignOffBarProps> = ({ engagementId, sectionId, signOff, isClosed }) => {
  const currentName = auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown User';

  const sign = (role: 'prepared' | 'reviewed') => {
    updateSectionData(engagementId, `signoffs/${sectionId}`, {
      [`${role}By`]: currentName,
      [`${role}At`]: new Date().toISOString(),
    });
  };

  const clear = (role: 'prepared' | 'reviewed') => {
    if (!window.confirm(`Remove the ${role === 'prepared' ? 'preparer' : 'reviewer'} sign-off for this section?`)) return;
    updateSectionData(engagementId, `signoffs/${sectionId}`, {
      [`${role}By`]: null,
      [`${role}At`]: null,
    });
  };

  const Slot: React.FC<{ role: 'prepared' | 'reviewed'; label: string; by?: string; at?: string }> = ({ role, label, by, at }) => (
    <div className="flex items-center gap-3 flex-1 min-w-[220px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${by ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
        {by ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {by ? (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800 truncate">{by} <span className="text-slate-400 font-normal">&bull; {formatSignDate(at)}</span></p>
            {!isClosed && (
              <button onClick={() => clear(role)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove sign-off">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ) : isClosed ? (
          <p className="text-sm text-slate-400 italic">Not signed</p>
        ) : (
          <button
            onClick={() => sign(role)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Sign as {currentName.split(' ')[0]}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <h4 className="text-sm font-bold text-slate-700">Section Sign-off</h4>
        <span className="text-xs text-slate-400">(NSA 230: Audit Documentation)</span>
      </div>
      <div className="flex flex-wrap gap-6">
        <Slot role="prepared" label="Prepared by" by={signOff?.preparedBy} at={signOff?.preparedAt} />
        <Slot role="reviewed" label="Reviewed by" by={signOff?.reviewedBy} at={signOff?.reviewedAt} />
      </div>
      {signOff?.preparedBy && signOff?.reviewedBy && signOff.preparedBy === signOff.reviewedBy && (
        <p className="mt-2 text-xs text-amber-600">Note: The preparer and reviewer are the same person. Consider an independent review where practicable.</p>
      )}
    </div>
  );
};

export default SignOffBar;

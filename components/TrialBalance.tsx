import React, { useState, useEffect, useMemo } from 'react';
import { AuditTabProps } from '../types';
import { updateSectionData, subscribeToSection } from '../services/db';

interface TBAccount {
  id: string;
  name: string;
  group: string;
  current: number;
  prior: number;
}

const LEAD_SCHEDULE_GROUPS = [
  // Balance Sheet
  'Property, Plant & Equipment',
  'Intangible Assets',
  'Investments',
  'Inventories',
  'Trade & Other Receivables',
  'Cash & Bank',
  'Loans & Advances',
  'Other Assets',
  'Trade & Other Payables',
  'Borrowings',
  'Provisions & Accruals',
  'Other Liabilities',
  'Share Capital',
  'Reserves & Surplus',
  // Profit & Loss
  'Revenue',
  'Other Income',
  'Cost of Sales',
  'Employee Expenses',
  'Administrative Expenses',
  'Selling & Distribution',
  'Finance Costs',
  'Depreciation & Amortisation',
  'Tax Expense',
  'Other Expenses',
  // Fallback
  'Unassigned',
];

// Keyword-based auto grouping for imported accounts
const GROUP_RULES: [RegExp, string][] = [
  [/cash|bank|petty/i, 'Cash & Bank'],
  [/receivab|debtor|accounts rec/i, 'Trade & Other Receivables'],
  [/payab|creditor|accounts pay/i, 'Trade & Other Payables'],
  [/inventor|stock|raw material|finished goods|wip|work.in.progress/i, 'Inventories'],
  [/land|building|plant|machin|equipment|vehicle|furniture|fixture|computer/i, 'Property, Plant & Equipment'],
  [/goodwill|software|licen[cs]e|patent|trademark|intangible/i, 'Intangible Assets'],
  [/invest|share.*(held|in)|mutual fund|fixed deposit/i, 'Investments'],
  [/loan (to|given)|advance|prepaid|deposit (given|paid)/i, 'Loans & Advances'],
  [/loan (from|taken)|borrow|overdraft|term loan|debenture/i, 'Borrowings'],
  [/provision|accrual|accrued|gratuity|leave encashment/i, 'Provisions & Accruals'],
  [/share capital|paid.?up|equity capital/i, 'Share Capital'],
  [/reserve|retained|surplus|accumulated (profit|loss)/i, 'Reserves & Surplus'],
  [/sales|revenue|turnover|income from operations/i, 'Revenue'],
  [/other income|misc.* income|interest income|dividend income|gain on/i, 'Other Income'],
  [/cost of (sales|goods)|cogs|purchase|direct cost|consumption/i, 'Cost of Sales'],
  [/salar|wage|staff|employee|bonus|pf |provident|allowance/i, 'Employee Expenses'],
  [/rent|office|admin|utilit|electricity|water|communication|printing|stationer|legal|professional|audit fee|insurance|repair/i, 'Administrative Expenses'],
  [/advertis|marketing|selling|distribution|commission|carriage outward|freight out/i, 'Selling & Distribution'],
  [/interest expense|finance (cost|charge)|bank charge/i, 'Finance Costs'],
  [/depreciat|amorti[sz]/i, 'Depreciation & Amortisation'],
  [/income tax|tax expense|deferred tax|current tax/i, 'Tax Expense'],
];

const suggestGroup = (name: string): string => {
  for (const [pattern, group] of GROUP_RULES) {
    if (pattern.test(name)) return group;
  }
  return 'Unassigned';
};

const parseAmount = (raw: string): number | null => {
  let s = raw.trim().replace(/["']/g, '').replace(/npr|rs\.?/gi, '').replace(/[,\s]/g, '');
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
};

const npr = (n: number) => `NPR ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TrialBalance: React.FC<AuditTabProps> = ({ client, engagementId }) => {
  const [accounts, setAccounts] = useState<TBAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [materiality, setMateriality] = useState<{ om: number; pm: number }>({ om: 0, pm: 0 });

  const [pasteText, setPasteText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', group: 'Unassigned', current: 0, prior: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'trialBalance', (data) => {
      setAccounts(data?.accounts || []);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [engagementId]);

  useEffect(() => {
    const unsubscribe = subscribeToSection(engagementId, 'materiality', (mat) => {
      const om = ((Number(mat?.benchmarkAmount) || 0) * (Number(mat?.overallPercent) || 0)) / 100;
      const pm = (om * (Number(mat?.performancePercent) || 0)) / 100;
      setMateriality({ om, pm });
    });
    return () => unsubscribe();
  }, [engagementId]);

  const saveAccounts = (updated: TBAccount[]) => {
    setAccounts(updated);
    if (isLoaded) {
      updateSectionData(engagementId, 'trialBalance', { accounts: updated, updatedAt: new Date().toISOString() });
    }
  };

  // --- Import from pasted text (Excel / CSV) ---
  const handleImport = () => {
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const imported: TBAccount[] = [];
    let skipped = 0;

    lines.forEach((line, idx) => {
      const tokens = line.includes('\t') ? line.split('\t') : line.split(',');
      if (tokens.length < 2) { skipped++; return; }

      // Take up to two numeric values from the tail; the rest is the account name
      const cleaned = tokens.map((t) => t.trim());
      let prior: number | null = null;
      let current: number | null = null;
      let nameEnd = cleaned.length;

      const lastNum = parseAmount(cleaned[cleaned.length - 1]);
      const secondLastNum = cleaned.length >= 3 ? parseAmount(cleaned[cleaned.length - 2]) : null;

      if (lastNum !== null && secondLastNum !== null) {
        current = secondLastNum;
        prior = lastNum;
        nameEnd = cleaned.length - 2;
      } else if (lastNum !== null) {
        current = lastNum;
        nameEnd = cleaned.length - 1;
      } else {
        skipped++;
        return;
      }

      const name = cleaned.slice(0, nameEnd).join(', ').trim();
      if (!name) { skipped++; return; }

      imported.push({
        id: `${Date.now()}_${idx}`,
        name,
        group: suggestGroup(name),
        current: current ?? 0,
        prior: prior ?? 0,
      });
    });

    if (imported.length === 0) {
      setImportMsg('No valid rows found. Expected format per line: Account name, Current year amount, Prior year amount (optional).');
      return;
    }

    const replace = accounts.length > 0
      ? window.confirm(`Import ${imported.length} accounts.\n\nOK = REPLACE the existing ${accounts.length} accounts\nCancel = APPEND to them`)
      : true;

    saveAccounts(replace ? imported : [...accounts, ...imported]);
    setImportMsg(`Imported ${imported.length} accounts (${skipped} lines skipped). Groups were auto-suggested — review the Unassigned ones.`);
    setPasteText('');
  };

  const addManual = () => {
    if (!newAccount.name.trim()) return;
    saveAccounts([...accounts, { ...newAccount, id: Date.now().toString() }]);
    setNewAccount({ name: '', group: 'Unassigned', current: 0, prior: 0 });
  };

  const removeAccount = (id: string) => saveAccounts(accounts.filter((a) => a.id !== id));

  const updateAccount = (id: string, updates: Partial<TBAccount>) => {
    saveAccounts(accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const clearAll = () => {
    if (window.confirm('Delete ALL trial balance accounts? This cannot be undone.')) saveAccounts([]);
  };

  // --- Lead schedule totals ---
  const groups = useMemo(() => {
    const map = new Map<string, { count: number; current: number; prior: number }>();
    accounts.forEach((a) => {
      const g = map.get(a.group) || { count: 0, current: 0, prior: 0 };
      g.count += 1;
      g.current += a.current || 0;
      g.prior += a.prior || 0;
      map.set(a.group, g);
    });
    return Array.from(map.entries())
      .map(([group, totals]) => ({ group, ...totals }))
      .sort((a, b) => Math.abs(b.current) - Math.abs(a.current));
  }, [accounts]);

  const netCY = accounts.reduce((s, a) => s + (a.current || 0), 0);
  const netPY = accounts.reduce((s, a) => s + (a.prior || 0), 0);
  const outOfBalance = accounts.length > 0 && Math.abs(netCY) > 0.5;

  const sendToAnalyticalReview = () => {
    const rows = groups
      .filter((g) => g.group !== 'Unassigned' && (g.current !== 0 || g.prior !== 0))
      .map((g, i) => ({
        id: `tb_${Date.now()}_${i}`,
        caption: g.group,
        current: g.current,
        prior: g.prior,
        commentary: '',
      }));
    if (rows.length === 0) {
      alert('No grouped balances to send. Assign accounts to lead schedule groups first.');
      return;
    }
    if (!window.confirm(`Send ${rows.length} lead schedule totals to the Analytical Review (NSA 520) in the Planning tab?\n\nThis will REPLACE the current analytical review lines.`)) return;
    updateSectionData(engagementId, 'planning', { analyticalRows: rows });
    alert('Lead schedule totals sent to Planning → Comparative Analytical Review.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-sky-500">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Trial Balance & Lead Schedules</h3>
            <p className="text-slate-600">
              Import the trial balance of <strong>{client.name}</strong>, group accounts into lead schedules, and identify material areas against performance materiality.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {showImport ? 'Hide Import' : 'Import TB'}
            </button>
            {accounts.length > 0 && (
              <button onClick={clearAll} className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors">
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-sky-100">
          <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Paste from Excel / CSV</h4>
          <p className="text-xs text-slate-500 mb-3">
            One account per line: <code className="bg-slate-100 px-1.5 py-0.5 rounded">Account name &nbsp; Current year &nbsp; Prior year (optional)</code> — tab or comma separated.
            Enter debits as positive and credits as negative (e.g., <code className="bg-slate-100 px-1.5 py-0.5 rounded">(500000)</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded">-500000</code>).
            Lead schedule groups are suggested automatically.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-sky-500"
            placeholder={'Cash at Bank\t2500000\t1800000\nTrade Debtors\t4200000\t3900000\nSales Revenue\t(45000000)\t(41000000)'}
          />
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleImport}
              disabled={!pasteText.trim()}
              className="px-5 py-2 bg-sky-600 text-white rounded-md text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              Parse & Import
            </button>
            {importMsg && <p className="text-sm text-sky-700">{importMsg}</p>}
          </div>
        </div>
      )}

      {/* Balance check */}
      {accounts.length > 0 && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${outOfBalance ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${outOfBalance ? 'text-amber-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {outOfBalance
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          </svg>
          <div>
            <p className={`text-sm font-semibold ${outOfBalance ? 'text-amber-800' : 'text-green-800'}`}>
              {outOfBalance
                ? `Trial balance is OUT OF BALANCE by ${npr(netCY)} (current year).`
                : 'Trial balance is in balance (debits = credits).'}
            </p>
            <p className={`text-xs mt-0.5 ${outOfBalance ? 'text-amber-600' : 'text-green-600'}`}>
              {accounts.length} accounts &bull; Net CY: {npr(netCY)} &bull; Net PY: {npr(netPY)}
              {outOfBalance && ' — check for missing accounts or sign errors (credits should be negative).'}
            </p>
          </div>
        </div>
      )}

      {/* Lead Schedules Summary */}
      {groups.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Lead Schedules Summary</h3>
              <p className="text-sm text-slate-500 mt-1">
                {materiality.pm > 0
                  ? <>Groups with balances at or above performance materiality ({npr(materiality.pm)}) are flagged as material audit areas.</>
                  : 'Set materiality in the Materiality & Sampling tab to flag material areas automatically.'}
              </p>
            </div>
            <button
              onClick={sendToAnalyticalReview}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Send to Analytical Review
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lead Schedule</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Accounts</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Current Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Prior Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Variance</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Assessment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {groups.map((g) => {
                  const variance = g.current - g.prior;
                  const isMaterial = materiality.pm > 0 && Math.abs(g.current) >= materiality.pm;
                  return (
                    <tr key={g.group} className={g.group === 'Unassigned' ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {g.group}
                        {g.group === 'Unassigned' && <span className="ml-2 text-xs font-normal text-amber-600">— assign these accounts below</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-500">{g.count}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">{npr(g.current)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{npr(g.prior)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${variance < 0 ? 'text-red-600' : 'text-slate-700'}`}>{npr(variance)}</td>
                      <td className="px-4 py-3 text-center">
                        {isMaterial ? (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Material — test</span>
                        ) : materiality.pm > 0 ? (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">Below PM</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accounts detail */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-4">Account Detail</h3>

        {/* Manual add */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <input
                type="text"
                placeholder="Account name"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value, group: suggestGroup(e.target.value) })}
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={newAccount.group}
                onChange={(e) => setNewAccount({ ...newAccount, group: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500"
              >
                {LEAD_SCHEDULE_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Current Year</label>
              <input
                type="number"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                value={newAccount.current || ''}
                onChange={(e) => setNewAccount({ ...newAccount, current: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Prior Year</label>
              <input
                type="number"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                value={newAccount.prior || ''}
                onChange={(e) => setNewAccount({ ...newAccount, prior: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-1">
              <button
                onClick={addManual}
                disabled={!newAccount.name.trim()}
                className="w-full px-4 py-2.5 bg-sky-600 text-white rounded-md text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {accounts.length > 0 ? (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lead Schedule Group</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Current Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Prior Year</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {accounts.map((a) => (
                  <tr key={a.id} className={`hover:bg-slate-50 ${a.group === 'Unassigned' ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-2 text-sm text-slate-800">{a.name}</td>
                    <td className="px-4 py-2">
                      <select
                        value={a.group}
                        onChange={(e) => updateAccount(a.id, { group: e.target.value })}
                        className={`p-1.5 border rounded text-xs focus:ring-2 focus:ring-sky-500 ${a.group === 'Unassigned' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        {LEAD_SCHEDULE_GROUPS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={a.current || ''}
                        onChange={(e) => updateAccount(a.id, { current: parseFloat(e.target.value) || 0 })}
                        className="w-32 p-1.5 border border-slate-200 rounded text-xs text-right focus:ring-2 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={a.prior || ''}
                        onChange={(e) => updateAccount(a.id, { prior: parseFloat(e.target.value) || 0 })}
                        className="w-32 p-1.5 border border-slate-200 rounded text-xs text-right focus:ring-2 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => removeAccount(a.id)} className="text-red-500 hover:text-red-700 text-sm">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-md border border-dashed border-slate-300">
            <p className="text-slate-500">No trial balance imported yet.</p>
            <p className="text-xs text-slate-400 mt-1">Use "Import TB" to paste from Excel, or add accounts manually above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialBalance;

import { Client } from '../types';
import { formatDateToMonthDayYear } from '../utils/dateFormatter';

const checked = (val: boolean | undefined) => (val ? '&#10003; Yes' : '&#9675; No');

const checklistRows = (items: Record<string, boolean | undefined>, labels: Record<string, string>) =>
  Object.entries(labels)
    .map(
      ([key, label]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;width:80px;text-align:center;color:${items?.[key] ? '#16a34a' : '#94a3b8'};">${checked(items?.[key])}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${label}</td></tr>`
    )
    .join('');

const sec = (title: string, nsa?: string) => `
  <h2 style="font-size:13pt;font-weight:bold;color:#1e293b;border-bottom:2px solid #6366f1;padding-bottom:6px;margin-top:28px;margin-bottom:14px;">
    ${title}${nsa ? ` <span style="font-size:9pt;color:#6366f1;font-weight:normal;">(${nsa})</span>` : ''}
  </h2>`;

const sub = (title: string, body: string) => `
  <div style="margin-bottom:18px;">
    <h3 style="font-size:10.5pt;font-weight:bold;color:#334155;border-left:3px solid #6366f1;padding-left:8px;margin-bottom:8px;">${title}</h3>
    ${body}
  </div>`;

const field = (label: string, value: string | undefined | null) =>
  `<p style="margin-bottom:5px;"><strong>${label}:</strong> ${value?.trim() || '<em style="color:#94a3b8;">Not recorded</em>'}</p>`;

const textBox = (text: string | undefined) =>
  `<div style="background:#f8fafc;padding:10px 14px;border-radius:5px;border-left:3px solid #e2e8f0;white-space:pre-wrap;font-size:10pt;">${text?.trim() || '<em style="color:#94a3b8;">Not recorded</em>'}</div>`;

const fmt = (date: string | undefined) => (date ? formatDateToMonthDayYear(date) : '—');

const currency = (n: number) =>
  n ? `NPR ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

export const generateFullEngagementReport = (client: Client, engagementData: any): string => {
  const today = formatDateToMonthDayYear(new Date().toISOString().split('T')[0]);
  const fyEnd = fmt(client.fyPeriodEnd);

  const basics = engagementData?.basics ?? {};
  const planning = engagementData?.planning ?? {};
  const mat = engagementData?.materiality ?? {};
  const ev = engagementData?.auditEvidence ?? {};
  const comm = engagementData?.communication ?? {};
  const rep = engagementData?.reporting ?? {};
  const team: any[] = basics?.teamMembers ?? [];
  const wps: any[] = engagementData?.workingPapers
    ? Object.values(engagementData.workingPapers)
    : [];

  // Materiality
  const benchAmt = Number(mat?.benchmarkAmount) || 0;
  const omPct = Number(mat?.overallPercent) || 0;
  const pmPct = Number(mat?.performancePercent) || 0;
  const om = (benchAmt * omPct) / 100;
  const pm = (om * pmPct) / 100;
  const ctt = om * 0.05;

  const confirmations: any[] = ev?.sa505?.requests ?? [];
  const relatedParties: any[] = ev?.sa550?.parties ?? [];
  const samplingPlans: any[] = mat?.samplingPlans ?? [];

  const body = `
<!-- COVER PAGE -->
<div style="text-align:center;padding:50px 30px;border-bottom:3px solid #6366f1;margin-bottom:24px;page-break-after:always;">
  <p style="color:#6366f1;font-size:9pt;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Audit Engagement Documentation</p>
  <h1 style="font-size:20pt;font-weight:bold;color:#1e293b;margin-bottom:8px;">COMPLETE AUDIT FILE</h1>
  <h2 style="font-size:15pt;color:#334155;margin-bottom:4px;">${client.name}</h2>
  <p style="font-size:11pt;color:#64748b;">Financial Year Ending: <strong>${fyEnd}</strong></p>
  <p style="font-size:10pt;color:#64748b;">Reporting Framework: ${client.frf}${client.isListed !== undefined ? ` &nbsp;|&nbsp; Listed: ${client.isListed ? 'Yes' : 'No'}` : ''}</p>
  ${
    engagementData?.meta?.isClosed
      ? `<div style="display:inline-block;margin-top:16px;padding:6px 20px;background:#fee2e2;border:1px solid #fca5a5;border-radius:20px;color:#dc2626;font-weight:bold;font-size:10pt;">ENGAGEMENT CLOSED &mdash; FINAL DOCUMENTATION</div>`
      : ''
  }
  <p style="font-size:9pt;color:#94a3b8;margin-top:20px;">Generated on ${today} &bull; AuDoc Audit Platform</p>
</div>

<!-- SECTION 1 -->
${sec('Section 1: Engagement Setup', 'NSA 200, 210, SQC 1')}

${sub('1.1 Appointment of Auditor', `
  ${field('AGM Date', fmt(basics?.agmDate))}
  ${field('Appointment Date', fmt(basics?.appointmentDate))}
  ${field('Previous Auditor', basics?.previousAuditor)}
`)}

${sub('1.2 Client Acceptance & Continuance', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(basics?.acceptanceChecks ?? {}, {
      integrity: 'Client integrity is satisfactory',
      competence: 'Firm has required competence and resources',
      ethics: 'No ethical or independence issues identified',
      preconditions: 'Preconditions for the audit are met',
    })}
  </table>
`)}

${sub('1.3 Terms of Engagement (NSA 210)', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(basics?.sa210Checks ?? {}, {
      preconditions: 'Preconditions for audit established',
      responsibilities: 'Management responsibilities agreed',
      termsAgreed: 'Engagement letter prepared and agreed',
    })}
  </table>
`)}

${sub('1.4 Engagement Partner', `
  ${field('Partner Name', basics?.partnerName)}
  ${field('Membership Number', basics?.partnerMembership)}
`)}

${
  team.length > 0
    ? sub('1.5 Audit Team Structure', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <thead><tr style="background:#f1f5f9;">
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Name</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Role</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Email</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Status</th>
    </tr></thead>
    <tbody>
      ${team
        .map(
          (m) =>
            `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">${m.name ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${m.role ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${m.email ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${m.status ?? 'invited'}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>`)
    : ''
}

${sub('1.6 Code of Ethics Compliance', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(basics?.ethicsChecks ?? {}, {
      integrity: 'Independence and integrity maintained',
      objectivity: 'Objectivity maintained throughout',
      competence: 'Professional competence and due care applied',
      confidentiality: 'Confidentiality obligations met',
      behavior: 'Professional behavior standards upheld',
    })}
  </table>
`)}

<!-- SECTION 2 -->
${sec('Section 2: Audit Planning & Risk Assessment', 'NSA 300, 315')}

${sub('2.1 Overall Audit Strategy', textBox(planning?.overallStrategy))}
${sub('2.2 Audit Plan', textBox(planning?.auditPlan))}

${sub('2.3 Risk Assessment Procedures', `
  <p style="font-weight:bold;margin-bottom:4px;">Inquiries:</p>
  ${textBox(planning?.inquiries)}
  <p style="font-weight:bold;margin:10px 0 4px;">Analytical Procedures:</p>
  ${textBox(planning?.analyticalProcedures)}
  <p style="font-weight:bold;margin:10px 0 4px;">Observation and Inspection:</p>
  ${textBox(planning?.observationInspection)}
`)}

${sub('2.4 Understanding of Internal Controls', textBox(planning?.internalControl))}

<!-- SECTION 3 -->
${sec('Section 3: Materiality & Sampling', 'NSA 320, 530')}

${sub('3.1 Materiality Levels', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;">
    <tr style="background:#f1f5f9;"><th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Parameter</th><th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">Value</th></tr>
    <tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">Benchmark Selected</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">${mat?.benchmark ?? '—'}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:7px 10px;border:1px solid #e2e8f0;">Benchmark Amount</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(benchAmt)}</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">Overall Materiality (${omPct}%)</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">${currency(om)}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:7px 10px;border:1px solid #e2e8f0;">Performance Materiality (${pmPct}% of OM)</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">${currency(pm)}</td></tr>
    <tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">Clearly Trivial Threshold (5% of OM)</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">${currency(ctt)}</td></tr>
  </table>
  ${mat?.justification ? `<p><strong>Justification:</strong> ${mat.justification}</p>` : ''}
`)}

${
  samplingPlans.length > 0
    ? sub('3.2 Sampling Plans', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <thead><tr style="background:#f1f5f9;">
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Area</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Population</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Method</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">Sample Size</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Assigned To</th>
    </tr></thead>
    <tbody>
      ${samplingPlans
        .map(
          (sp) =>
            `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">${sp.area ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${sp.population ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${sp.method ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">${sp.sampleSize ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${sp.assignedTo ?? ''}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>`)
    : ''
}

<!-- SECTION 4 -->
${sec('Section 4: Audit Evidence', 'NSA 500–580')}

${sub('4.1 NSA 500 — Evidence Procedures', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(ev?.sa500?.checklist ?? {}, {
      inspection: 'Inspection of records and documents',
      observation: 'Observation of processes and controls',
      externalConfirmation: 'External confirmation procedures',
      recalculation: 'Recalculation of figures',
      reperformance: 'Reperformance of controls',
      analyticalProcedures: 'Analytical procedures applied',
      inquiry: 'Management inquiry conducted',
    })}
  </table>
  ${ev?.sa500?.summary ? `<p style="margin-top:8px;"><strong>Summary:</strong> ${ev.sa500.summary}</p>` : ''}
`)}

${sub('4.2 NSA 501 — Specific Considerations', `
  <p style="font-weight:bold;margin-bottom:4px;">Inventory:</p>
  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;">
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;width:80px;text-align:center;color:${ev?.sa501?.inventory?.attendedCount ? '#16a34a' : '#94a3b8'};">${checked(ev?.sa501?.inventory?.attendedCount)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">Attended physical inventory count</td></tr>
  </table>
  ${ev?.sa501?.inventory?.countDate ? field('Count Date', fmt(ev.sa501.inventory.countDate)) : ''}
  ${ev?.sa501?.inventory?.observations ? field('Observations', ev.sa501.inventory.observations) : ''}
  <p style="font-weight:bold;margin:10px 0 4px;">Litigation & Claims:</p>
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(ev?.sa501?.litigation ?? {}, {
      inquiryManagement: 'Inquiry of management regarding litigation',
      reviewedLegalExpenses: 'Reviewed legal expense accounts',
    })}
  </table>
  ${ev?.sa501?.litigation?.legalCounselResponse ? field('Legal Counsel Response', ev.sa501.litigation.legalCounselResponse) : ''}
`)}

${
  confirmations.length > 0
    ? sub('4.3 NSA 505 — External Confirmations', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <thead><tr style="background:#f1f5f9;">
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Party Name</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Type</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Sent Date</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Status</th>
    </tr></thead>
    <tbody>
      ${confirmations
        .map(
          (r) =>
            `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">${r.partyName ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${r.type ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${fmt(r.sentDate)}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${r.status ?? ''}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>`)
    : sub('4.3 NSA 505 — External Confirmations', '<p style="color:#94a3b8;font-style:italic;">No confirmation requests recorded.</p>')
}

${sub('4.4 NSA 510 — Opening Balances', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(ev?.sa510?.checklist ?? {}, {
      priorPeriod: 'Prior period closing balances verified',
      policies: 'Consistent accounting policies confirmed',
      predecessor: 'Predecessor working papers reviewed',
    })}
  </table>
  ${ev?.sa510?.notes ? field('Notes', ev.sa510.notes) : ''}
`)}

${
  relatedParties.length > 0
    ? sub('4.5 NSA 550 — Related Parties', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;">
    <thead><tr style="background:#f1f5f9;">
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Party Name</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Relationship</th>
    </tr></thead>
    <tbody>
      ${relatedParties
        .map(
          (p) =>
            `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">${p.name ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${p.relationship ?? ''}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>
  ${ev?.sa550?.transactionsReview ? field('Transactions Review', ev.sa550.transactionsReview) : ''}`)
    : ''
}

${sub('4.6 NSA 560 — Subsequent Events', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${checklistRows(ev?.sa560?.checklist ?? {}, {
      managementInquiry: 'Management inquiry on subsequent events',
      minutesReview: 'Board/management meeting minutes reviewed',
      interimFS: 'Interim financial statements reviewed',
    })}
  </table>
  ${ev?.sa560?.eventsNoted ? field('Events Noted', ev.sa560.eventsNoted) : ''}
`)}

${sub('4.7 NSA 570 — Going Concern', `
  <p style="font-weight:bold;margin-bottom:4px;">Indicators Identified:</p>
  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:10px;">
    ${checklistRows(ev?.sa570?.indicators ?? {}, {
      netLiability: 'Net liability position',
      borrowingMaturity: 'Borrowings approaching maturity',
      keyManagementLoss: 'Loss of key management personnel',
      negativeCashFlow: 'Negative operating cash flows',
    })}
  </table>
  ${field('Conclusion', ev?.sa570?.conclusion)}
  ${ev?.sa570?.justification ? field('Justification', ev.sa570.justification) : ''}
`)}

${sub('4.8 NSA 580 — Written Representations', `
  ${field('Representation Letter Date', fmt(ev?.sa580?.letterDate))}
  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-top:8px;">
    ${checklistRows(ev?.sa580?.checklist ?? {}, {
      fsPrepared: 'Financial statements preparation confirmed',
      informationProvided: 'All relevant information provided',
      transactionsRecorded: 'All transactions recorded',
    })}
  </table>
`)}

<!-- SECTION 5 -->
${sec('Section 5: Communications', 'NSA 260, 265')}

${sub('5.1 NSA 260 — Communication with TCWG', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${(comm?.sa260 ?? [])
      .map(
        (item: any, i: number) =>
          `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};"><td style="padding:6px 10px;border:1px solid #e2e8f0;width:80px;text-align:center;color:${item.checked ? '#16a34a' : '#94a3b8'};">${checked(item.checked)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${item.label ?? ''}</td></tr>`
      )
      .join('')}
  </table>
`)}

${sub('5.2 NSA 265 — Internal Control Deficiencies', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    ${(comm?.sa265 ?? [])
      .map(
        (item: any, i: number) =>
          `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'};"><td style="padding:6px 10px;border:1px solid #e2e8f0;width:80px;text-align:center;color:${item.checked ? '#16a34a' : '#94a3b8'};">${checked(item.checked)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${item.label ?? ''}</td></tr>`
      )
      .join('')}
  </table>
`)}

<!-- SECTION 6 -->
${sec('Section 6: Reporting Details', 'NSA 700')}

${
  rep?.engagementPartnerName
    ? sub('6.1 Report Particulars', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;width:40%;background:#f8fafc;"><strong>Engagement Partner</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.engagementPartnerName}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Designation</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.designation ?? '—'}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Audit Firm</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.auditFirmName ?? '—'}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Report Date</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${fmt(rep.reportDate)}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Report Place</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.reportPlace ?? '—'}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>UDIN</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.udin ?? '—'}</td></tr>
    <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;"><strong>Firm Registration No.</strong></td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${rep.firmRegistrationNumber ?? '—'}</td></tr>
  </table>
  ${rep.keyAuditMatters?.trim() ? `<p style="margin-top:10px;"><strong>Key Audit Matters:</strong><br/><span style="white-space:pre-wrap;">${rep.keyAuditMatters}</span></p>` : ''}
`)
    : sub('6.1 Report Particulars', '<p style="color:#94a3b8;font-style:italic;">Report details not yet recorded. Complete the Reporting &amp; Conclusion tab to populate this section.</p>')
}

${
  wps.length > 0
    ? `${sec('Section 7: Working Papers Index')}
${sub('7.1 Document Register', `
  <table style="width:100%;border-collapse:collapse;font-size:10pt;">
    <thead><tr style="background:#f1f5f9;">
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Category</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">File Name</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">Size</th>
      <th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left;">Uploaded</th>
    </tr></thead>
    <tbody>
      ${wps
        .map(
          (wp) =>
            `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;">${
              wp.category === 'prev_year_financials'
                ? 'Previous Year Financials'
                : wp.category === 'current_year_financials'
                ? 'Current Year Financials'
                : 'Other Working Papers'
            }</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${wp.fileName ?? ''}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:right;">${wp.fileSize ? `${(wp.fileSize / 1024).toFixed(0)} KB` : '—'}</td><td style="padding:7px 10px;border:1px solid #e2e8f0;">${wp.uploadedAt ? new Date(wp.uploadedAt).toLocaleDateString() : ''}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>
`)}`
    : ''
}

<!-- FOOTER -->
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:9pt;">
  <p>Generated by AuDoc &bull; ${client.name} &bull; FY Ending ${fyEnd} &bull; ${today}</p>
  <p style="margin-top:4px;">This document contains confidential audit working paper information.</p>
</div>`;

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <meta name=ProgId content=Word.Document>
  <title>${client.name} — Complete Audit File</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 30px; }
    h2 { font-size: 13pt; }
    h3 { font-size: 11pt; }
    p, li { margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; }
    strong { font-weight: bold; }
  </style>
</head>
<body>${body}</body>
</html>`;
};

import React from 'react';

export const AUDIT_REPORT_TEMPLATE = `
<div>
  <p style="text-align: center; margin-bottom: 20px;"><strong>INDEPENDENT AUDITOR’S REPORT</strong></p>

  <p style="margin-bottom: 5px;">To,</p>
  <p style="margin-bottom: 5px;">The Shareholders,</p>
  <p style="margin-bottom: 5px;">[CLIENT_NAME_HEADER]</p>
  <p style="margin-bottom: 20px;">[Address]</p>

  <h3>Report on the Audit of the Financial Statements</h3>

  <h4>Opinion</h4>
  <p style="margin-bottom: 10px;">We have audited the accompanying financial statements of [Name of Entity] (“the Company”), which comprise the Statement of Financial Position as at [FY_PERIOD_END_OPINION], the Statement of Profit or Loss and Other Comprehensive Income, Statement of Changes in Equity, Statement of Cash Flows for the year then ended, and notes to the financial statements, including a summary of significant accounting policies prepared in accordance with [APPLICABLE_FRF].</p>
  <p style="margin-bottom: 20px;">In our opinion, the accompanying financial statements give a true and fair view, in all material respects, of the financial position of the Company as at [FY_PERIOD_END_OPINION], and of its financial performance and cash flows for the year then ended in accordance with [APPLICABLE_FRF].</p>

  <h4>Basis for Opinion</h4>
  <p style="margin-bottom: 20px;">We conducted our audit in accordance with Nepal Standards on Auditing (NSA). Our responsibilities under those standards are further described in the Auditor’s Responsibilities for the Audit of the Financial Statements section of our report. We are independent of the Company in accordance with the ethical requirements of the ICAN Code of Ethics and we have fulfilled our other ethical responsibilities. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.</p>

  <h4>Key Audit Matters</h4>
  <p style="margin-bottom: 10px;">Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period and include most significant assessed risks of material misstatement (whether or not due to fraud) identified including those which has greatest effect on overall audit strategy, allocation of resources in the audit and directing effort of the engagement team. We summarize below key audit matters, in decreasing order of audit significance, in arriving at our audit opinion above, together with our key audit procedures to address those matters and, as required for public interest entities, our results from those procedures. These matters were addressed in the context of our audit of the financial statements as whole, and in forming our opinion thereon, and we did not provide a separate opinion on these matters.</p>
  <div style="margin-left: 20px; margin-bottom: 20px;">[Insert Key Audit Matters and Responses or state “No key audit matters to report.”]</div>

  [OTHER_INFORMATION_SECTION]

  <h4>Management’s Responsibility for the Financial Statements</h4>
  <p style="margin-bottom: 20px;">Management is responsible for the preparation and fair presentation of these financial statements in accordance with [APPLICABLE_FRF] and the Companies Act, 2063, and for such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error.</p>

  <h4>Auditor’s Responsibilities for the Audit of the Financial Statements</h4>
  <p style="margin-bottom: 10px;">Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor’s report that includes our opinion. Reasonable assurance is a high level of assurance but is not a guarantee that an audit conducted in accordance with NSA will always detect a material misstatement when it exists.</p>
  <div style="margin-left: 20px; margin-bottom: 20px;">[Insert full description as per NSA 700/705/706 requirements if needed.]</div>

  <h3>Report on Other Legal and Regulatory Requirements</h3>
  <ol style="margin-left: 20px; margin-bottom: 20px;">
    <li style="margin-bottom: 5px;">We have obtained all the information and explanations required for the audit.</li>
    <li style="margin-bottom: 5px;">Books of accounts are maintained as required by law.</li>
    <li style="margin-bottom: 5px;">The financial statements comply with [APPLICABLE_FRF] and the Companies Act, 2063.</li>
  </ol>

  <p style="margin-top: 40px; margin-bottom: 5px;"><strong>Signature:</strong></p>
  <div style="height: 60px;"></div>
  <p style="margin-bottom: 5px;">----------------------------------</p>
  <p style="margin-bottom: 2px;"><strong>[Name of Engagement Partner]</strong></p>
  <p style="margin-bottom: 2px;"><strong>[Designation]</strong></p>
  <p style="margin-bottom: 15px;"><strong>[Name of Audit Firm]</strong></p>

  <p style="margin-bottom: 2px;">Date: [Date]</p>
  <p style="margin-bottom: 15px;">Place: [Place]</p>

  <p style="margin-bottom: 2px;">Firm Registration Number: [Firm Registration Number]</p>
  <p>UDIN: [UDIN]</p>
</div>
`;
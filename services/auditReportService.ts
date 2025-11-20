import { Client, AuditReportDetails } from '../types';
import { AUDIT_REPORT_TEMPLATE } from '../constants';
import { formatDateToMonthDayYear } from '../utils/dateFormatter'; // Import the new utility

const createWordCompatibleHtml = (content: string, title: string) => `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset='utf-8'>
    <meta name=ProgId content=Word.Document> <!-- Add this line -->
    <title>${title}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        /* Global body styles for Word */
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt; 
            line-height: 1.5; 
            margin: 20px; /* Overall document margin for Word */
        }
        /* Default paragraph margin */
        p { margin-bottom: 10px; } 
        /* Ensure strong text is bold */
        strong { font-weight: bold; }
        
        /* Styles for headings to ensure they are bold and have correct spacing */
        h2, h3, h4 { font-weight: bold; }
        h3 { margin-top: 20px; margin-bottom: 10px; }
        h4 { margin-top: 15px; margin-bottom: 5px; }

        /* Specific overrides for elements within the template, if inline styles are not used */
        p[style*="text-align: center"] { text-align: center; }
        p[style*="margin-bottom: 20px"] { margin-bottom: 20px; }
        p[style*="margin-bottom: 5px"] { margin-bottom: 5px; }
        p[style*="margin-top: 20px"] { margin-top: 20px; }
        p[style*="margin-top: 40px"] { margin-top: 40px; }

        div[style*="margin-left: 20px"] { margin-left: 20px; }
        ol[style*="margin-left: 20px"] { margin-left: 20px; }
        li[style*="margin-bottom: 5px"] { margin-bottom: 5px; }
    </style>
</head>
<body>${content}</body></html>`;

export const generateAuditReport = (
  client: Client,
  reportDetails: AuditReportDetails,
): string => {
  let report = AUDIT_REPORT_TEMPLATE;

  // Format dates before replacement
  const formattedFyPeriodEnd = formatDateToMonthDayYear(client.fyPeriodEnd);
  const formattedReportDate = formatDateToMonthDayYear(reportDetails.reportDate);

  // Replace client-specific details
  report = report.replace(/\[CLIENT_NAME_HEADER\]/g, client.name);
  report = report.replace(/\[Name of Entity\]/g, client.name);
  report = report.replace(/\[Address\]/g, client.address);
  // Use the formatted date for FY period end
  report = report.replace(/\[FY_PERIOD_END_OPINION\]/g, formattedFyPeriodEnd);
  report = report.replace(/\[APPLICABLE_FRF\]/g, client.frf);

  // Replace report-specific details
  const keyAuditMattersContent = reportDetails.keyAuditMatters.trim();
  // Wrap Key Audit Matters in paragraph tags if not empty, otherwise use the default message.
  const formattedKeyAuditMatters = keyAuditMattersContent
    ? keyAuditMattersContent.split('\n').map(line => `<p>${line}</p>`).join('')
    : `<p>No key audit matters to report.</p>`;
  report = report.replace(/\[Insert Key Audit Matters and Responses or state “No key audit matters to report.”\]/g, formattedKeyAuditMatters);

  // Handle "Other Information" section
  const otherInformationText = `
    <h4>Information other than the Financial Statements and Auditors’ Report Thereon</h4>
    <p style="margin-bottom: 10px;">The Management is responsible for the other information. The other information comprises the information included in the annual report, but does not include the financial statements and our auditor’s report thereon.</p>
    <p style="margin-bottom: 10px;">Our opinion on the financial statements does not cover the other information and we do not express any form of assurance conclusion thereon.</p>
    <p style="margin-bottom: 20px;">In connection with our audit of the financial statements, our responsibility is to read the other information and, in doing so, consider whether the other information is materially inconsistent with the financial statements or our knowledge obtained in the audit or otherwise appears to be materially misstated. If, based on the work, we have performed, we conclude that there is a material misstatement of this other information, we are required to report that fact. We have nothing to report in this regard.</p>
  `;
  
  const otherInformationSection = (client.isListed || reportDetails.includeOtherInformation)
    ? otherInformationText
    : '';
  report = report.replace(/\[OTHER_INFORMATION_SECTION\]/g, otherInformationSection);


  report = report.replace(/\[Name of Engagement Partner\]/g, reportDetails.engagementPartnerName);
  report = report.replace(/\[Designation\]/g, reportDetails.designation);
  report = report.replace(/\[Name of Audit Firm\]/g, reportDetails.auditFirmName);
  // Use the formatted date for report date
  report = report.replace(/\[Date\]/g, formattedReportDate);
  report = report.replace(/\[Place\]/g, reportDetails.reportPlace);
  report = report.replace(/\[UDIN\]/g, reportDetails.udin);
  report = report.replace(/\[Firm Registration Number\]/g, reportDetails.firmRegistrationNumber);

  // Placeholder for NSA 700/705/706 requirements - now wrapped in <p> tag as part of HTML template.
  const nsaDescription = 'Our responsibilities under those standards include: identifying and assessing the risks of material misstatement of the financial statements, whether due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit evidence that is sufficient and appropriate to provide a basis for our opinion. The risk of not detecting a material misstatement resulting from fraud is higher than for one resulting from error, as fraud may involve collusion, forgery, intentional omissions, misrepresentations, or the override of internal control. Obtain an understanding of internal control relevant to the audit in order to design audit procedures that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the effectiveness of the Company’s internal control. Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates and related disclosures made by management. Conclude on the appropriateness of management’s use of the going concern basis of accounting and, based on the audit evidence obtained, whether a material uncertainty exists related to events or conditions that may cast significant doubt on the Company’s ability to continue as a going concern. If we conclude that a material uncertainty exists, we are required to draw attention in our auditor’s report to the related disclosures in the financial statements or, if such disclosures are inadequate, to modify our opinion. Our conclusions are based on the audit evidence obtained up to the date of our auditor’s report. However, future events or conditions may cause the Company to cease to continue as a going concern. Evaluate the overall presentation, structure and content of the financial statements, including the disclosures, and whether the financial statements represent the underlying transactions and events in a manner that achieves fair presentation.';
  report = report.replace(/\[Insert full description as per NSA 700\/705\/706 requirements if needed.\]/g, `<p>${nsaDescription}</p>`);


  return createWordCompatibleHtml(report, `${client.name} Audit Report`);
};
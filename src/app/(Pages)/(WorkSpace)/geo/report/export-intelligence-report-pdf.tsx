"use client";

import type { ReportDocumentData } from "./build-report-document-data";
import { slugifyForFilename } from "./build-report-document-data";

export async function downloadIntelligenceReportPdf(data: ReportDocumentData): Promise<void> {
  const [{ pdf }, { IntelligenceReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./IntelligenceReportDocument"),
  ]);

  const blob = await pdf(<IntelligenceReportDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  const slug = slugifyForFilename(data.companyName);
  const filename = `immortell-intelligence-report-${slug}-${date}.pdf`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

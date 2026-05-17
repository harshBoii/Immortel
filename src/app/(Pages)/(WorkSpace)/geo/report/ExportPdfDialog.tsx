"use client";

import { useEffect, useState } from "react";
import type { ReportDocumentData } from "./build-report-document-data";
import { downloadIntelligenceReportPdf } from "./export-intelligence-report-pdf";

type ExportPdfDialogProps = {
  open: boolean;
  onClose: () => void;
  documentData: ReportDocumentData;
};

export function ExportPdfDialog({ open, onClose, documentData }: ExportPdfDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExporting) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, isExporting]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setIsExporting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleVisualExport = () => {
    onClose();
    window.print();
  };

  const handleDocumentExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await downloadIntelligenceReportPdf(documentData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={isExporting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-pdf-dialog-title"
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)]/80 bg-[var(--glass-bg-solid)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ExportDialogHeader onClose={onClose} isExporting={isExporting} />

        <div className="flex flex-col gap-3 p-5">
          <button
            type="button"
            onClick={handleVisualExport}
            disabled={isExporting}
            className="flex flex-col items-start rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/60 px-4 py-3 text-left transition hover:bg-[var(--glass-hover)] disabled:opacity-50"
          >
            <span className="text-sm font-semibold text-foreground">Visual report (page layout)</span>
            <span className="mt-1 text-xs text-muted-foreground">
              Opens the browser print dialog — save as PDF to capture the on-screen design.
            </span>
          </button>

          <button
            type="button"
            onClick={handleDocumentExport}
            disabled={isExporting}
            className="flex flex-col items-start rounded-xl border border-[var(--glass-border)] bg-[var(--sibling-accent)]/10 px-4 py-3 text-left transition hover:bg-[var(--sibling-accent)]/16 disabled:opacity-50"
          >
            <span className="text-sm font-semibold text-[var(--sibling-accent)]">
              {isExporting ? "Generating document…" : "Professional document"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Downloads a structured PDF with all report data, tables, and full prompt lists.
            </span>
          </button>

          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExportDialogHeader({
  onClose,
  isExporting,
}: {
  onClose: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-border)]/80 px-5 py-4">
      <div>
        <h2 id="export-pdf-dialog-title" className="text-lg font-semibold text-foreground">
          Export report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to save this intelligence report.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={isExporting}
        className="flex-shrink-0 rounded-full p-2 text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground transition-colors disabled:opacity-50"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

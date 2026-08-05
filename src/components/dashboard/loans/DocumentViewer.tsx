"use client";

import { FileText, Download } from "lucide-react";

interface Document {
  id: string;
  docType: string;
  fileUrl: string;
  fileName?: string | null;
  uploadedAt: Date;
}

interface DocumentViewerProps {
  documents: Document[];
}

const DOC_LABELS: Record<string, string> = {
  NATIONAL_ID: "National ID",
  BANK_STATEMENT: "Bank Statement",
  PASSPORT: "Passport",
  OTHER: "Document",
};

export function DocumentViewer({ documents }: DocumentViewerProps) {
  if (documents.length === 0) {
    return (
      <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        No documents uploaded.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <FileText size={16} style={{ color: "var(--color-primary)" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {DOC_LABELS[doc.docType] ?? doc.docType}
              </div>
              {doc.fileName && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {doc.fileName}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {new Date(doc.uploadedAt).toLocaleString("en-NG")}
              </div>
            </div>
          </div>
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
          >
            <Download size={13} /> View
          </a>
        </div>
      ))}
    </div>
  );
}

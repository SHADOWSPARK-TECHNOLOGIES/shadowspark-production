"use client";

interface KycStatusBadgeProps {
  status: string;
}

const KYC_COLOURS: Record<string, string> = {
  PENDING: "var(--color-gold)",
  VERIFIED: "var(--color-success)",
  FAILED: "var(--color-notification)",
  MANUAL_REVIEW: "var(--color-primary)",
};

export function KycStatusBadge({ status }: KycStatusBadgeProps) {
  const color = KYC_COLOURS[status] ?? "var(--color-text-muted)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}

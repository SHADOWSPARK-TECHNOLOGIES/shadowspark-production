'use client';

export default function WatchtowerError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-16) var(--space-6)',
      textAlign: 'center',
      gap: 'var(--space-4)',
    }}>
      <span style={{ fontSize: 48 }}>🏛️</span>
      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
        Failed to load Regulatory Watchtower
      </h2>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
        style={{ marginTop: 'var(--space-3)' }}
      >
        Try again
      </button>
    </div>
  );
}

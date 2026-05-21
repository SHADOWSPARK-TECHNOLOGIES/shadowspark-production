'use client';

export interface ChecklistProps {
  items: string[];
  checked: Set<number>;
  onChange: (checked: Set<number>) => void;
}

/**
 * A clickable checklist where each item toggles its checked state.
 * Checked items receive strikethrough styling via the `done` CSS class.
 *
 * Uses the `checklist` / `check-item` / `check-box` / `check-label` CSS classes
 * from the dashboard styling system.
 */
export default function Checklist({ items, checked, onChange }: ChecklistProps) {
  const toggle = (index: number) => {
    const next = new Set(checked);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onChange(next);
  };

  return (
    <div className="checklist" role="list" aria-label="Checklist">
      {items.map((item, i) => (
        <div key={i} className="check-item">
          <div
            className={`check-box ${checked.has(i) ? 'checked' : ''}`}
            onClick={() => toggle(i)}
          >
            {checked.has(i) && (
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="1,6 5,10 11,2" />
              </svg>
            )}
          </div>
          <div className={`check-label ${checked.has(i) ? 'done' : ''}`}>{item}</div>
        </div>
      ))}
    </div>
  );
}

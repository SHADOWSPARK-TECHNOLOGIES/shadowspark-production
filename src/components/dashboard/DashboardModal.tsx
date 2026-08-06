'use client';

import type { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import { useId, useRef, useEffect, useCallback } from 'react';

export interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog for the dashboard, using the `modal-overlay` / `dashboard-modal` CSS classes.
 *
 * - Clicking the overlay (outside the modal content) calls `onClose`.
 * - The modal content click is stopped from propagating to prevent accidental closure.
 * - Renders a close button (✕) in the header.
 * - Supports keyboard accessibility: Escape to close, focus trap, focus restore, aria-labelledby.
 */
export default function DashboardModal({ open, onClose, title, children }: DashboardModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /** Save the currently focused element and focus the first focusable element inside the modal. */
  const handleOpenFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Small delay to ensure the DOM has rendered the modal content
    requestAnimationFrame(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
      }
    });
  }, []);

  /** Restore focus to the element that was focused before the modal opened. */
  const restoreFocus = useCallback(() => {
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  // Focus management and Escape key listener
  useEffect(() => {
    if (open) {
      handleOpenFocus();
    } else {
      restoreFocus();
    }
  }, [open, handleOpenFocus, restoreFocus]);

  // Global Escape key listener (also handles case when focus is outside the modal)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /** Trap focus within the modal: Tab cycles between first and last focusable elements. */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if current is first, jump to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if current is last, jump to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="dashboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

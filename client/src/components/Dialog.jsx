import React, { useEffect } from 'react';
import styles from './Dialog.module.css';

/**
 * Simple modal dialog with optional confirm action.
 * Props:
 *  - open: boolean – whether the dialog is visible
 *  - title: string – dialog heading
 *  - children: content
 *  - onClose: () => void – called when backdrop or close button clicked
 *  - onConfirm: optional () => void – called when confirm button clicked
 *  - confirmLabel: optional string – label for confirm button (default "Confirm")
 */
export default function Dialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className={styles.dialog}>
        <header className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          {onConfirm && (
            <button className={styles.confirmBtn} onClick={onConfirm}>
              {confirmLabel}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

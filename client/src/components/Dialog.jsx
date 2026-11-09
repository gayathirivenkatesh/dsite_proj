import React, { useEffect, useRef } from 'react';
import styles from './Dialog.module.css';

/**
 * Editorial Post Room Dialog.
 * Consequence is stated cleanly in plain language, with safe action focused by default.
 */
export default function Dialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  isDestructive = false,
}) {
  const cancelBtnRef = useRef(null);

  // Close on Escape key & set focus on safe button on open
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handler);
      // Safe default focus
      setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 50);
    }
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog}>
        <header className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footer}>
          <button ref={cancelBtnRef} type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          {onConfirm && (
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={onConfirm}
              style={
                isDestructive
                  ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }
                  : undefined
              }
            >
              {confirmLabel}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

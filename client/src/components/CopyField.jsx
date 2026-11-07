import { useRef, useState } from 'react';
import styles from './CopyField.module.css';

/**
 * Read-only field with a copy-to-clipboard button.
 * Props:
 *   - label: optional string label
 *   - value: string to display & copy
 */
export default function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else if (ref.current) {
        ref.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (ref.current) {
        ref.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.field}>
        <input ref={ref} readOnly className={styles.input} value={value} />
        <button
          type="button"
          className={styles.btn}
          onClick={copy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          title={copied ? 'Copied!' : 'Copy'}
        >
          {copied ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

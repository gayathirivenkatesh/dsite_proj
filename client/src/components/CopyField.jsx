import React, { useRef, useState } from 'react';
import styles from './CopyField.module.css';

/**
 * Editorial CopyField with immediate feedback and accessible mono preview.
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
        <input
          ref={ref}
          readOnly
          className={styles.input}
          value={value}
          onClick={(e) => e.target.select()}
        />
        <button
          type="button"
          className={`${styles.btn} ${copied ? styles.btnCopied : ''}`.trim()}
          onClick={copy}
          aria-label={copied ? 'Key copied to clipboard' : 'Copy key to clipboard'}
        >
          {copied ? 'Copied' : 'Copy Key'}
        </button>
      </div>
    </div>
  );
}

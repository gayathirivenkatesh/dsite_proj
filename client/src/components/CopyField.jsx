import React, { useRef, useState } from 'react';
import styles from './CopyField.module.css';
import { FaCopy, FaCheck } from 'react-icons/fa';

/**
 * Read‑only field with a copy‑to‑clipboard button.
 * Props:
 *   - label: optional string label
 *   - value: string to display & copy
 */
export default function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // fallback: select text and execCommand
      ref.current.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.field}>
        <input ref={ref} readOnly className={styles.input} value={value} />
        <button className={styles.btn} onClick={copy} aria-label="Copy to clipboard">
          {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}


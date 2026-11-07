import React from 'react';
import styles from './Timeline.module.css';

/**
 * Timeline of events.
 * Props:
 *   - items: array of { timestamp: string|Date, label: string, details?: string }
 */
export default function Timeline({ items = [] }) {
  return (
    <ul className={styles.timeline} aria-live="polite">
      {items.map((it, idx) => (
        <li key={idx} className={styles.item}>
          <time className={styles.time} dateTime={new Date(it.timestamp).toISOString()}>
            {new Date(it.timestamp).toLocaleString()}
          </time>
          <div className={styles.content}>
            <strong className={styles.label}>{it.label}</strong>
            {it.details && <p className={styles.details}>{it.details}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}


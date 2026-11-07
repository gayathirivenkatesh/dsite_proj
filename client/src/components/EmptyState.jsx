import React from 'react';
import styles from './EmptyState.module.css';

/**
 * Displayed when a list or view has no data.
 * Props:
 *   - title: string – short heading
 *   - description: optional string – longer help text
 *   - action: optional React node – e.g., a button to create something
 */
export default function EmptyState({ title, description, action }) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}


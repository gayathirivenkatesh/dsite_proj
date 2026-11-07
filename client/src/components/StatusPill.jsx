import React from 'react';
import styles from './StatusPill.module.css';

/**
 * Status pill displaying a label with appropriate colour.
 * Props:
 *   - status: one of 'active', 'expiring', 'exhausted', 'expired', 'revoked'
 *   - children: optional custom text (fallback to capitalised status)
 */
export default function StatusPill({ status, children }) {
  const map = {
    active: styles.active,
    expiring: styles.expiring,
    exhausted: styles.exhausted,
    expired: styles.expired,
    revoked: styles.revoked,
  };
  const className = map[status] || '';
  return (
    <span className={`${styles.pill} ${className}`.trim()}>
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}


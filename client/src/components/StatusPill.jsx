import React from 'react';
import styles from './StatusPill.module.css';

/**
 * Rubber-stamp style status mark.
 * Outlined text in a slightly rotated rectangle with earthy tones.
 * Props:
 *   - status: 'active' | 'expiring' | 'exhausted' | 'expired' | 'revoked'
 *   - children: optional custom text (always paired with words)
 */
export default function StatusStamp({ status = 'active', children, className = '' }) {
  const map = {
    active: styles.active,
    expiring: styles.expiring,
    exhausted: styles.exhausted,
    expired: styles.expired,
    revoked: styles.revoked,
  };

  const statusClass = map[status] || styles.active;

  const defaultWord =
    {
      active: 'Active',
      expiring: 'Expiring soon',
      exhausted: 'Used up',
      expired: 'Expired',
      revoked: 'Revoked',
    }[status] || status;

  return (
    <span className={`${styles.stamp} ${statusClass} ${className}`.trim()}>
      {children || defaultWord}
    </span>
  );
}

// Re-export as StatusPill for backward compatibility
export { StatusStamp as StatusPill };

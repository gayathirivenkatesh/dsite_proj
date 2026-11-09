import React from 'react';
import styles from './EmptyState.module.css';
import { PostLockKeyIllustration } from './PostRoomIcons.jsx';

/**
 * Editorial Empty State for The Post Room.
 */
export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Drop a file to start your vault.',
  action,
}) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.illustration}>
        <PostLockKeyIllustration size={64} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

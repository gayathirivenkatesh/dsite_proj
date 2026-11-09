import React from 'react';
import styles from './Timeline.module.css';

function parseBrowser(ua) {
  if (!ua) return 'a browser';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'a browser';
}

function formatFriendlyDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} at ${time}`;
}

function formatHumanSentence(item) {
  const browser = parseBrowser(item.userAgent);
  const when = formatFriendlyDate(item.timestamp);

  switch (item.outcome) {
    case 'success':
      return `Someone opened this on ${when}, using ${browser}.`;
    case 'wrong_password':
      return `Someone tried to open this with the wrong password on ${when}, using ${browser}.`;
    case 'expired':
      return `An attempt was made on ${when}, but the key had already expired.`;
    case 'exhausted':
      return `Someone arrived on ${when}, but all allowed copies were already used up.`;
    case 'revoked':
      return `An attempt was made on ${when} using a revoked key.`;
    case 'rate_limited':
      return `Access was temporarily paused on ${when} after multiple failed unlock tries.`;
    case 'not_found':
      return `A lookup was made on ${when} for an unknown key.`;
    default:
      return item.label || `Activity recorded on ${when}.`;
  }
}

/**
 * Editorial Timeline rendering access events as calm, human sentences.
 */
export default function Timeline({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
        No access records found yet.
      </p>
    );
  }

  return (
    <ul className={styles.timeline} aria-live="polite">
      {items.map((it, idx) => {
        const sentence = formatHumanSentence(it);
        const isSuccess = it.outcome === 'success';
        const isFailed = it.outcome && it.outcome !== 'success';

        return (
          <li key={it._id || it.id || idx} className={styles.item}>
            <span
              className={`${styles.marker} ${
                isSuccess ? styles.markerSuccess : isFailed ? styles.markerFailed : ''
              }`.trim()}
              aria-hidden="true"
            />
            <div className={styles.content}>
              <p className={styles.sentence}>{sentence}</p>
              <div className={styles.meta}>
                <time dateTime={new Date(it.timestamp).toISOString()}>
                  {new Date(it.timestamp).toLocaleString()}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

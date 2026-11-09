import React from 'react';

/**
 * Hand-drawn feeling lock and turned key illustration.
 * Vintage postal / stationer vault aesthetic, 1.5px stroke, no coloured circles.
 */
export function PostLockKeyIllustration({ size = 80, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Postal vault lock body */}
      <rect x="22" y="42" width="42" height="46" rx="3" stroke="currentColor" />
      {/* Keyhole */}
      <circle cx="43" cy="61" r="3.5" stroke="currentColor" />
      <path d="M43 64.5 L40.5 73.5 L45.5 73.5 Z" stroke="currentColor" fill="none" />
      {/* Lock Shackle */}
      <path d="M29 42 V28 C29 20 35 15 43 15 C51 15 57 20 57 28 V42" stroke="currentColor" />
      {/* Hand-drawn brass key lying across / beside the lock */}
      <circle cx="74" cy="34" r="9" stroke="currentColor" />
      <circle cx="74" cy="34" r="4" stroke="currentColor" />
      <path d="M68 41 L53 66 L59 70 L62 65 L66 68 L71 60" stroke="currentColor" />
      {/* Subtle paper rule accent lines */}
      <line
        x1="14"
        y1="92"
        x2="86"
        y2="92"
        stroke="currentColor"
        strokeDasharray="2 3"
        opacity="0.6"
      />
    </svg>
  );
}

export function KeyIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.8 12.2 L20 3 L23 6 L20 9 L17 6 L14 9" />
    </svg>
  );
}

export function LockIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="11" rx="2" />
      <path d="M7 11 V7 A5 5 0 0 1 17 7 V11" />
      <circle cx="12" cy="16.5" r="1.5" />
    </svg>
  );
}

export function PostBoxIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8 L12 13 L21 8" />
      <line x1="7" y1="17" x2="11" y2="17" strokeDasharray="1 1.5" />
    </svg>
  );
}

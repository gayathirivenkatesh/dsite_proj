import React from 'react';
import styles from './Button.module.css';

export default function Button({ children, onClick, type = 'button', disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.button} ${className}`.trim()}
    >
      {children}
    </button>
  );
}


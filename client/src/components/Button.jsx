import React from 'react';
import styles from './Button.module.css';

/**
 * The Post Room button component.
 * Props:
 *   - variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 *   - type: 'button' | 'submit' | 'reset'
 *   - disabled: boolean
 *   - onClick: () => void
 *   - style: React.CSSProperties
 */
export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  className = '',
  style,
  ...rest
}) {
  const variantClass = styles[variant] || styles.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`${styles.button} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

import React from 'react';
import styles from './Field.module.css';

/**
 * Generic field wrapper for label, input and error message.
 * Props:
 *  - label: string
 *  - htmlFor: id of the input element
 *  - children: the input element (e.g. <input />, <textarea />)
 *  - error: optional error string (shown below the input)
 */
export default function Field({ label, htmlFor, children, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {React.cloneElement(children, { id: htmlFor, className: `${styles.input} ${children.props.className || ''}` })}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}


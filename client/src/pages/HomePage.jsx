export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '3rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <header>
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--accent)',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          Secure File Sharing Vault
        </span>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
          Keep what matters safe. Hand the key to who you choose.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          Self-expiring, password-protected links with exact access limits and an auditable history.
        </p>
      </header>

      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginTop: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          System Foundation Initialized
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Backend REST API, security hardening, rate limiting, and client scaffold are active.
        </p>
      </section>
    </main>
  );
}

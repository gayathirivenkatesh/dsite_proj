import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { linksApi } from '../api/links.js';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function PublicDownload() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // '404', '410_revoked', '410_expired', '410_exhausted', '429'
  const [errorMessage, setErrorMessage] = useState('');
  const [linkMeta, setLinkMeta] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);

  // Password unlock flow
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    async function loadMeta() {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage('');
      try {
        const data = await linksApi.publicMeta(token);
        const link = data?.link || data;
        setLinkMeta(link);
        if (link?.file) {
          setFileMeta(link.file);
        }
      } catch (err) {
        if (err.status === 404) {
          setErrorStatus('404');
          setErrorMessage('This link does not exist or was removed.');
        } else if (err.status === 410) {
          if (err.code === 'LINK_REVOKED') {
            setErrorStatus('410_revoked');
            setErrorMessage('The sender revoked this share link.');
          } else if (err.code === 'LINK_EXHAUSTED') {
            setErrorStatus('410_exhausted');
            setErrorMessage('This link has reached its maximum download limit and is now closed.');
          } else {
            setErrorStatus('410_expired');
            setErrorMessage('This link has expired and is no longer available.');
          }
        } else if (err.status === 429) {
          setErrorStatus('429');
          setErrorMessage('Too many requests. Please wait a few moments and refresh.');
        } else {
          setErrorStatus('500');
          setErrorMessage(err.message || 'Unable to open this link.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadMeta();
  }, [token]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setIsUnlocking(true);
    setUnlockError('');

    try {
      const res = await linksApi.publicUnlock(token, password);
      setIsUnlocked(true);
      if (res.file) {
        setFileMeta(res.file);
      }
    } catch (err) {
      if (err.status === 429) {
        setUnlockError(
          'Too many failed attempts. This link is temporarily locked out for security. Try again in 15 minutes.'
        );
      } else {
        setUnlockError('Incorrect password. Please verify and try again.');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownload = () => {
    const isProtected = Boolean(linkMeta?.isPasswordProtected);

    if (isProtected && !isUnlocked) {
      return;
    }

    if (isProtected && password) {
      // POST form download for password-protected link
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/links/public/${token}/download`;

      const pwdInput = document.createElement('input');
      pwdInput.type = 'hidden';
      pwdInput.name = 'password';
      pwdInput.value = password;
      form.appendChild(pwdInput);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } else {
      // Standard GET download
      window.location.href = linksApi.downloadUrl(token);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Minimal Header */}
      <header
        style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1.5" />
          </svg>
          <span>Vault Share</span>
        </Link>
      </header>

      {/* Main card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            boxShadow: 'var(--shadow-raised)',
            textAlign: 'center',
          }}
        >
          {loading ? (
            <div>
              <Spinner />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Checking security key...
              </p>
            </div>
          ) : errorStatus ? (
            /* Friendly error messages for expired, used-up, revoked, or non-existent links */
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 1.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-expired-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-expired-text)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>

              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                {errorStatus === '410_revoked'
                  ? 'Link Revoked'
                  : errorStatus === '410_exhausted'
                    ? 'Download Limit Reached'
                    : errorStatus === '410_expired'
                      ? 'Link Expired'
                      : errorStatus === '429'
                        ? 'Temporarily Locked'
                        : 'File Not Available'}
              </h1>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                {errorMessage}
              </p>

              <Link to="/">
                <Button style={{ width: '100%' }}>Go to Home</Button>
              </Link>
            </div>
          ) : linkMeta?.isPasswordProtected && !isUnlocked ? (
            /* Password unlock prompt */
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 1.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>

              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Password Protected</h1>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                }}
              >
                The sender protected this file with a password. Enter it below to unlock access.
              </p>

              <form onSubmit={handleUnlock} style={{ textAlign: 'left' }}>
                <Field label="Password" htmlFor="unlockPassword" error={unlockError}>
                  <input
                    type="password"
                    id="unlockPassword"
                    required
                    placeholder="Enter link password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </Field>

                <div style={{ marginTop: '1.25rem' }}>
                  <Button type="submit" disabled={isUnlocking} style={{ width: '100%' }}>
                    {isUnlocking ? 'Unlocking...' : 'Unlock File'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* Unlocked or unprotected file ready for download */
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 1.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-active-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-active-text)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>

              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                {fileMeta?.originalName || 'Ready for Download'}
              </h1>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1.75rem',
                }}
              >
                {fileMeta
                  ? `${formatBytes(fileMeta.size)} • ${fileMeta.mimeType}`
                  : 'Secure attachment'}
              </p>

              <Button onClick={handleDownload} style={{ width: '100%', padding: '0.75rem' }}>
                Download Document
              </Button>

              <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Directly served from a secure encrypted vault.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

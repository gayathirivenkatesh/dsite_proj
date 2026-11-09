import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { linksApi } from '../api/links.js';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusStamp from '../components/StatusPill.jsx';
import { KeyIcon, LockIcon } from '../components/PostRoomIcons.jsx';

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
          setErrorMessage('This key does not exist or has been taken out of service.');
        } else if (err.status === 410) {
          if (err.code === 'LINK_REVOKED') {
            setErrorStatus('410_revoked');
            setErrorMessage('This key was revoked by the sender.');
          } else if (err.code === 'LINK_EXHAUSTED') {
            setErrorStatus('410_exhausted');
            setErrorMessage('This key has been used up. All allowed copies have been retrieved.');
          } else {
            setErrorStatus('410_expired');
            setErrorMessage('This key has expired and the lock is shut.');
          }
        } else if (err.status === 429) {
          setErrorStatus('429');
          setErrorMessage('Too many attempts. The keyhole is locked for fifteen minutes.');
        } else {
          setErrorStatus('500');
          setErrorMessage(err.message || 'We could not reach the post room.');
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
          'Too many failed attempts. For security, this key is locked for 15 minutes.'
        );
      } else {
        setUnlockError('Wrong password. Please verify the phrase and try again.');
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
      {/* Calm, unbranded postal header */}
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
          }}
        >
          <span style={{ color: 'var(--accent)' }}>
            <KeyIcon size={18} />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: '1.125rem',
            }}
          >
            The Post Room
          </span>
        </Link>
      </header>

      {/* Main note slip */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '32rem',
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '2.5rem 2.25rem',
            position: 'relative',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Spinner />
              <p
                style={{
                  marginTop: '1rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                }}
              >
                Opening the vault dispatch...
              </p>
            </div>
          ) : errorStatus ? (
            /* Kindly stated status note */
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <StatusStamp
                  status={
                    errorStatus === '410_revoked'
                      ? 'revoked'
                      : errorStatus === '410_exhausted' || errorStatus === '410_expired'
                        ? 'expired'
                        : 'exhausted'
                  }
                >
                  {errorStatus === '410_revoked'
                    ? 'Revoked'
                    : errorStatus === '410_exhausted'
                      ? 'Used up'
                      : errorStatus === '410_expired'
                        ? 'Expired'
                        : 'Unavailable'}
                </StatusStamp>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  lineHeight: 1.25,
                  marginBottom: '0.75rem',
                }}
              >
                {errorStatus === '410_revoked'
                  ? 'This key was revoked.'
                  : errorStatus === '410_exhausted'
                    ? 'This key has been used up.'
                    : errorStatus === '410_expired'
                      ? 'This key ran out.'
                      : errorStatus === '429'
                        ? 'Temporarily locked.'
                        : 'Key not found.'}
              </h1>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                {errorMessage}
              </p>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" style={{ width: '100%' }}>
                    Return to The Post Room
                  </Button>
                </Link>
              </div>
            </div>
          ) : linkMeta?.isPasswordProtected && !isUnlocked ? (
            /* Password unlock note */
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <LockIcon size={14} />
                <span>Sealed Dispatch</span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  lineHeight: 1.25,
                  marginBottom: '0.5rem',
                }}
              >
                This file needs a password to open.
              </h1>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  marginBottom: '1.75rem',
                }}
              >
                The sender protected this dispatch. Enter the secret word they provided to turn the
                key.
              </p>

              <form onSubmit={handleUnlock}>
                <Field label="Password" htmlFor="unlockPassword" error={unlockError}>
                  <input
                    type="password"
                    id="unlockPassword"
                    required
                    placeholder="Enter key password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </Field>

                <div style={{ marginTop: '1.5rem' }}>
                  <Button
                    type="submit"
                    disabled={isUnlocking}
                    variant="primary"
                    style={{ width: '100%' }}
                  >
                    {isUnlocking ? 'Verifying word...' : 'Turn Key & Unlock'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* Reassuring postal note: Ready for download */
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <StatusStamp status="active">Active Key</StatusStamp>
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}
              >
                A document has been kept for you:
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  lineHeight: 1.35,
                  wordBreak: 'break-all',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                }}
              >
                {fileMeta?.originalName || 'Document'}
              </h1>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '2rem',
                }}
              >
                {fileMeta
                  ? `${formatBytes(fileMeta.size)} • ${fileMeta.mimeType}`
                  : 'Encrypted document'}
              </div>

              <Button
                variant="primary"
                onClick={handleDownload}
                style={{ width: '100%', minHeight: '48px', fontSize: '1rem' }}
              >
                Download File
              </Button>

              <footer
                style={{
                  marginTop: '1.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Direct handoff from The Post Room. No cookies tracked.
              </footer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

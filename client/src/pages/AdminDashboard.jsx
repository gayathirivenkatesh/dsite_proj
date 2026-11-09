import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Dialog from '../components/Dialog.jsx';
import StatusStamp from '../components/StatusPill.jsx';
import Spinner from '../components/Spinner.jsx';
import Navbar from '../components/Navbar.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'files' | 'logs'

  // Users tab
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userConfirmDialog, setUserConfirmDialog] = useState({
    open: false,
    user: null,
    willDisable: false,
  });

  // Files tab
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deleteFileDialog, setDeleteFileDialog] = useState({ open: false, file: null });

  // Logs tab
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.message || 'Failed to consult postmaster user register.');
    } finally {
      setLoadingUsers(false);
    }
  }, [toast]);

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const data = await adminApi.listFiles();
      setFiles(data.files || []);
    } catch (err) {
      toast.error(err.message || 'Failed to consult postmaster vault records.');
    } finally {
      setLoadingFiles(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await adminApi.listLogs();
      setLogs(data.logs || []);
    } catch (err) {
      toast.error(err.message || 'Failed to inspect global dispatch ledger.');
    } finally {
      setLoadingLogs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'files') fetchFiles();
    else if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchUsers, fetchFiles, fetchLogs]);

  const handleToggleUser = async () => {
    const { user, willDisable } = userConfirmDialog;
    try {
      await adminApi.setUserStatus(user.id || user._id, willDisable);
      toast.success(`Account for ${user.email} ${willDisable ? 'disabled' : 're-enabled'}.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Action could not be executed.');
    } finally {
      setUserConfirmDialog({ open: false, user: null, willDisable: false });
    }
  };

  const handleDeleteFile = async () => {
    const { file } = deleteFileDialog;
    try {
      await adminApi.deleteFile(file.id || file._id);
      toast.success(`Document "${file.originalName}" permanently purged from the vault.`);
      fetchFiles();
    } catch (err) {
      toast.error(err.message || 'Purge failed.');
    } finally {
      setDeleteFileDialog({ open: false, file: null });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: '68rem',
          margin: '0 auto',
          width: '100%',
          padding: '2.5rem 1.5rem',
        }}
      >
        <header
          style={{
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '0.25rem',
            }}
          >
            Postmaster Audit Console
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.25rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            System Registry & Audit
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            System-wide vault supervision, account management, and immutable dispatch logs.
          </p>
        </header>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Registered Vaults ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'files' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'files' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Kept Documents ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'logs' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'logs' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Dispatch Ledger ({logs.length})
          </button>
        </div>

        {/* Tab 1: Users */}
        {activeTab === 'users' && (
          <div>
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Spinner />
              </div>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-strong)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>User / Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Account Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id || u._id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {u.name || u.email}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {u.email}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <StatusStamp status={u.role === 'ADMIN' ? 'active' : 'exhausted'}>
                            {u.role === 'ADMIN' ? 'Postmaster' : 'User'}
                          </StatusStamp>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <StatusStamp status={u.isDisabled ? 'revoked' : 'active'}>
                            {u.isDisabled ? 'Disabled' : 'Active'}
                          </StatusStamp>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <Button
                            variant={u.isDisabled ? 'secondary' : 'danger'}
                            onClick={() =>
                              setUserConfirmDialog({
                                open: true,
                                user: u,
                                willDisable: !u.isDisabled,
                              })
                            }
                            style={{
                              minHeight: '32px',
                              padding: '0 0.65rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            {u.isDisabled ? 'Re-enable' : 'Disable'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Files */}
        {activeTab === 'files' && (
          <div>
            {loadingFiles ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Spinner />
              </div>
            ) : files.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No files kept in the vault yet.</p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-strong)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>Document Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vault Owner</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Size</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Kept Since</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        Postmaster Purge
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr
                        key={f.id || f._id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {f.originalName}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {f.owner?.email || f.owner || '-'}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {formatBytes(f.size)}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {new Date(f.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <Button
                            variant="danger"
                            onClick={() => setDeleteFileDialog({ open: true, file: f })}
                            style={{
                              minHeight: '32px',
                              padding: '0 0.65rem',
                              fontSize: '0.75rem',
                            }}
                          >
                            Purge File
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Logs */}
        {activeTab === 'logs' && (
          <div>
            {loadingLogs ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Spinner />
              </div>
            ) : logs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No dispatch events recorded yet.</p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-strong)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.85rem' }}>Timestamp</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Outcome</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>IP Address</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Document Ref</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Client Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr
                        key={log._id || log.id || idx}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <StatusStamp status={log.outcome === 'success' ? 'active' : 'revoked'}>
                            {log.outcome}
                          </StatusStamp>
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {log.ip}
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {log.fileId ? `file:${String(log.fileId).slice(-6)}` : '-'}
                        </td>
                        <td
                          style={{
                            padding: '0.65rem 0.85rem',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {log.userAgent || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* User Toggle Dialog */}
      <Dialog
        open={userConfirmDialog.open}
        title={userConfirmDialog.willDisable ? 'Disable Vault Access' : 'Re-enable Vault Access'}
        onClose={() => setUserConfirmDialog({ open: false, user: null, willDisable: false })}
        onConfirm={handleToggleUser}
        confirmLabel={userConfirmDialog.willDisable ? 'Disable Account' : 'Re-enable Account'}
        isDestructive={userConfirmDialog.willDisable}
      >
        <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Are you sure you want to {userConfirmDialog.willDisable ? 'disable' : 're-enable'} the
          vault for <strong>{userConfirmDialog.user?.email}</strong>?
        </p>
        {userConfirmDialog.willDisable && (
          <div
            style={{
              backgroundColor: 'var(--status-revoked-bg)',
              color: 'var(--status-revoked-text)',
              border: '1px solid var(--status-revoked-border)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
            }}
          >
            This immediately revokes all active refresh tokens and prevents access until re-enabled.
          </div>
        )}
      </Dialog>

      {/* Delete File Dialog */}
      <Dialog
        open={deleteFileDialog.open}
        title="Administrative File Purge"
        onClose={() => setDeleteFileDialog({ open: false, file: null })}
        onConfirm={handleDeleteFile}
        confirmLabel="Purge Document"
        isDestructive
      >
        <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Permanently delete document <strong>{deleteFileDialog.file?.originalName}</strong> across
          the entire vault?
        </p>
        <div
          style={{
            backgroundColor: 'var(--status-revoked-bg)',
            color: 'var(--status-revoked-text)',
            border: '1px solid var(--status-revoked-border)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
          }}
        >
          This immediately purges the binary from storage and permanently invalidates all public
          share keys associated with it.
        </div>
      </Dialog>
    </div>
  );
}

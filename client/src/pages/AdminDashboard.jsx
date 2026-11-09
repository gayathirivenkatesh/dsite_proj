import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Dialog from '../components/Dialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
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
      toast.error(err.message || 'Failed to load users');
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
      toast.error(err.message || 'Failed to load files');
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
      toast.error(err.message || 'Failed to load logs');
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
      await adminApi.setUserStatus(user._id, willDisable);
      toast.success(`User ${user.email} ${willDisable ? 'disabled' : 'enabled'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setUserConfirmDialog({ open: false, user: null, willDisable: false });
    }
  };

  const handleDeleteFile = async () => {
    const { file } = deleteFileDialog;
    try {
      await adminApi.deleteFile(file._id);
      toast.success(`File "${file.originalName}" permanently deleted from vault`);
      fetchFiles();
    } catch (err) {
      toast.error(err.message || 'Failed to delete file');
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
          maxWidth: '64rem',
          margin: '0 auto',
          width: '100%',
          padding: '2rem 1.5rem',
        }}
      >
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Administrator Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            System-wide user governance, global storage inspection, and audit event logs.
          </p>
        </header>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'files' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'files' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All Files ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'logs' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'logs' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Global Audit Logs ({logs.length})
          </button>
        </div>

        {/* Tab 1: Users */}
        {activeTab === 'users' && (
          <div>
            {loadingUsers ? (
              <Spinner />
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-surface-hover)',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {u.name || u.email}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <StatusPill status={u.role === 'ADMIN' ? 'active' : 'revoked'}>
                            {u.role}
                          </StatusPill>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <StatusPill status={u.isDisabled ? 'expired' : 'active'}>
                            {u.isDisabled ? 'Disabled' : 'Active'}
                          </StatusPill>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <Button
                            onClick={() =>
                              setUserConfirmDialog({
                                open: true,
                                user: u,
                                willDisable: !u.isDisabled,
                              })
                            }
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: u.isDisabled
                                ? 'var(--status-active-text)'
                                : 'var(--color-danger)',
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
              <Spinner />
            ) : files.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No files uploaded yet in the system.</p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-surface-hover)',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem' }}>File Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Size</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Uploaded</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        Administrative Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {f.originalName}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {f.owner?.email || f.owner || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{formatBytes(f.size)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {new Date(f.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <Button
                            onClick={() => setDeleteFileDialog({ open: true, file: f })}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: 'var(--color-danger)',
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
              <Spinner />
            ) : logs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No access events recorded yet.</p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        textAlign: 'left',
                        backgroundColor: 'var(--bg-surface-hover)',
                      }}
                    >
                      <th style={{ padding: '0.5rem 0.75rem' }}>Timestamp</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Outcome</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>IP Address</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Resource</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <StatusPill status={log.outcome === 'success' ? 'active' : 'expired'}>
                            {log.outcome}
                          </StatusPill>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{log.ip}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>File: {log.fileId || '-'}</td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
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
        title={userConfirmDialog.willDisable ? 'Disable User Account' : 'Re-enable User Account'}
        onClose={() => setUserConfirmDialog({ open: false, user: null, willDisable: false })}
        onConfirm={handleToggleUser}
        confirmLabel={userConfirmDialog.willDisable ? 'Disable Account' : 'Enable Account'}
      >
        <p>
          Are you sure you want to {userConfirmDialog.willDisable ? 'disable' : 'enable'} the
          account for <strong>{userConfirmDialog.user?.email}</strong>?
        </p>
        {userConfirmDialog.willDisable && (
          <p style={{ marginTop: '0.5rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
            This immediately revokes all active refresh tokens and prevents future logins until
            re-enabled.
          </p>
        )}
      </Dialog>

      {/* Delete File Dialog */}
      <Dialog
        open={deleteFileDialog.open}
        title="Administrative File Purge"
        onClose={() => setDeleteFileDialog({ open: false, file: null })}
        onConfirm={handleDeleteFile}
        confirmLabel="Purge File"
      >
        <p>
          Permanently delete file <strong>{deleteFileDialog.file?.originalName}</strong> across all
          tenants?
        </p>
        <p style={{ marginTop: '0.5rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
          This purges the binary from disk storage and immediately cancels any public access links.
        </p>
      </Dialog>
    </div>
  );
}

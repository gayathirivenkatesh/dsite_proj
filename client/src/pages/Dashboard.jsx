import { useCallback, useEffect, useState } from 'react';
import { filesApi } from '../api/files.js';
import { linksApi } from '../api/links.js';
import { getAccessToken } from '../api/client.js';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Dialog from '../components/Dialog.jsx';
import StatusPill from '../components/StatusPill.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CopyField from '../components/CopyField.jsx';
import Spinner from '../components/Spinner.jsx';
import Timeline from '../components/Timeline.jsx';
import Navbar from '../components/Navbar.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function computeLinkStatus(link) {
  if (link.isRevoked) return { status: 'revoked', text: 'Revoked' };
  if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
    return { status: 'exhausted', text: 'Used up' };
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { status: 'expired', text: 'Expired' };
  }
  if (link.expiresAt) {
    const hoursLeft = (new Date(link.expiresAt) - new Date()) / (1000 * 60 * 60);
    if (hoursLeft <= 24) return { status: 'expiring', text: 'Expiring soon' };
  }
  return { status: 'active', text: 'Active' };
}

export default function Dashboard() {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Dialogs
  const [renameDialog, setRenameDialog] = useState({ open: false, file: null, newName: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });

  // Share Dialog state
  const [shareDialog, setShareDialog] = useState({
    open: false,
    file: null,
    expiresInDays: '7',
    maxDownloads: '5',
    hasPassword: false,
    password: '',
    generatedLink: '',
  });

  // Links list modal
  const [linksModal, setLinksModal] = useState({
    open: false,
    file: null,
    links: [],
    loading: false,
  });

  // Logs modal
  const [logsModal, setLogsModal] = useState({
    open: false,
    file: null,
    logs: [],
    loading: false,
    viewMode: 'timeline', // 'timeline' or 'table'
  });

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await filesApi.list();
      setFiles(data.files || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env.VITE_API_URL ?? ''}/api/v1/files`);
    xhr.withCredentials = true;

    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 201) {
        toast.success(`"${file.name}" uploaded successfully`);
        setShowUpload(false);
        setUploadProgress(0);
        fetchFiles();
      } else {
        let msg = 'Upload failed';
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body?.error?.message || msg;
        } catch {
          // ignore
        }
        toast.error(msg);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast.error('Network error during file upload');
    };

    xhr.send(formData);
  };

  const confirmRename = async () => {
    const { file, newName } = renameDialog;
    if (!newName.trim()) return;
    try {
      await filesApi.rename(file.id || file._id, newName.trim());
      toast.success('File renamed');
      fetchFiles();
    } catch (e) {
      toast.error(e.message || 'Rename failed');
    } finally {
      setRenameDialog({ open: false, file: null, newName: '' });
    }
  };

  const confirmDelete = async () => {
    const { file } = deleteDialog;
    try {
      await filesApi.delete(file.id || file._id);
      toast.success('File and all its share links deleted');
      fetchFiles();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleteDialog({ open: false, file: null });
    }
  };

  // Plain-language summary generator for share dialog
  const getShareSummary = () => {
    const parts = [];
    if (shareDialog.expiresInDays === '0') {
      parts.push('Never expires');
    } else {
      parts.push(
        `Valid for ${shareDialog.expiresInDays} day${shareDialog.expiresInDays === '1' ? '' : 's'}`
      );
    }

    if (shareDialog.maxDownloads === '0') {
      parts.push('unlimited downloads');
    } else {
      parts.push(
        `up to ${shareDialog.maxDownloads} download${shareDialog.maxDownloads === '1' ? '' : 's'}`
      );
    }

    if (shareDialog.hasPassword) {
      parts.push('protected with password');
    } else {
      parts.push('no password required');
    }

    return parts.join(', ') + '.';
  };

  const handleCreateShareLink = async () => {
    try {
      const payload = {};
      if (shareDialog.expiresInDays !== '0') {
        const exp = new Date();
        exp.setDate(exp.getDate() + parseInt(shareDialog.expiresInDays, 10));
        payload.expiresAt = exp.toISOString();
      }
      if (shareDialog.maxDownloads !== '0') {
        payload.maxDownloads = parseInt(shareDialog.maxDownloads, 10);
      }
      if (shareDialog.hasPassword && shareDialog.password.trim()) {
        payload.password = shareDialog.password.trim();
      }

      const res = await linksApi.create(shareDialog.file.id || shareDialog.file._id, payload);
      const publicUrl = `${window.location.origin}/share/${res.token}`;
      setShareDialog((prev) => ({ ...prev, generatedLink: publicUrl }));
      toast.success('Share link generated');
    } catch (err) {
      toast.error(err.message || 'Could not create share link');
    }
  };

  const openLinksModal = async (file) => {
    setLinksModal({ open: true, file, links: [], loading: true });
    try {
      const data = await linksApi.list({ fileId: file.id || file._id });
      setLinksModal({ open: true, file, links: data.links || [], loading: false });
    } catch (err) {
      toast.error(err.message || 'Failed to load links');
      setLinksModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeLink = async (linkId) => {
    try {
      await linksApi.revoke(linkId);
      toast.success('Share link revoked');
      if (linksModal.file) {
        const data = await linksApi.list({ fileId: linksModal.file.id || linksModal.file._id });
        setLinksModal((prev) => ({ ...prev, links: data.links || [] }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to revoke link');
    }
  };

  const openLogsModal = async (file) => {
    setLogsModal({ open: true, file, logs: [], loading: true, viewMode: 'timeline' });
    try {
      const data = await filesApi.logs(file.id || file._id);
      setLogsModal({
        open: true,
        file,
        logs: data.logs || [],
        loading: false,
        viewMode: 'timeline',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to load access logs');
      setLogsModal((prev) => ({ ...prev, loading: false }));
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
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Your Vault</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Files you keep safe, ready to share securely whenever you choose.
            </p>
          </div>

          <Button onClick={() => setShowUpload(true)}>Upload File</Button>
        </header>

        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <Spinner />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Loading your vault...
            </p>
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            title="Your vault is empty"
            description="Upload documents, archives, or images. You can generate self-expiring, password-protected links anytime."
            action={<Button onClick={() => setShowUpload(true)}>Upload Your First File</Button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {files.map((file) => (
              <article
                key={file.id || file._id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: 'var(--shadow-warm)',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <h2
                    style={{
                      fontSize: '1.125rem',
                      marginBottom: '0.25rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {file.originalName}
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{file.mimeType}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  {/* Primary action: Share */}
                  <Button
                    onClick={() =>
                      setShareDialog({
                        open: true,
                        file,
                        expiresInDays: '7',
                        maxDownloads: '5',
                        hasPassword: false,
                        password: '',
                        generatedLink: '',
                      })
                    }
                  >
                    Share
                  </Button>

                  {/* Direct owner download */}
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? ''}/api/v1/files/${file.id || file._id}/download`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: 'var(--space-2) var(--space-4)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                    }}
                  >
                    Download
                  </a>

                  {/* View links */}
                  <Button
                    onClick={() => openLinksModal(file)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Links
                  </Button>

                  {/* Access history */}
                  <Button
                    onClick={() => openLogsModal(file)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    History
                  </Button>

                  {/* Rename */}
                  <Button
                    onClick={() =>
                      setRenameDialog({ open: true, file, newName: file.originalName })
                    }
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Rename
                  </Button>

                  {/* Delete */}
                  <Button
                    onClick={() => setDeleteDialog({ open: true, file })}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog
        open={showUpload}
        title="Upload Document"
        onClose={() => {
          if (!isUploading) setShowUpload(false);
        }}
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Select a file to securely store. Allowed types: PDF, PNG, JPEG, GIF, WEBP, ZIP, TXT.
          Maximum 25MB.
        </p>
        <input
          type="file"
          disabled={isUploading}
          onChange={handleUpload}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
          }}
        />
        {isUploading && (
          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                marginBottom: '0.25rem',
              }}
            >
              <span>Uploading and verifying magic bytes...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div
              style={{
                height: '6px',
                backgroundColor: 'var(--bg-surface-hover)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent)',
                  transition: 'width 200ms ease',
                }}
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.open}
        title="Rename Document"
        onClose={() => setRenameDialog({ open: false, file: null, newName: '' })}
        onConfirm={confirmRename}
        confirmLabel="Save Name"
      >
        <Field label="Document Name" htmlFor="renameInput">
          <input
            id="renameInput"
            value={renameDialog.newName}
            onChange={(e) => setRenameDialog((prev) => ({ ...prev, newName: e.target.value }))}
            autoFocus
          />
        </Field>
      </Dialog>

      {/* Delete Consequence Confirm Dialog */}
      <Dialog
        open={deleteDialog.open}
        title="Confirm Permanent Deletion"
        onClose={() => setDeleteDialog({ open: false, file: null })}
        onConfirm={confirmDelete}
        confirmLabel="Permanently Delete"
      >
        <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Are you sure you want to delete <strong>{deleteDialog.file?.originalName}</strong>?
        </p>
        <div
          style={{
            backgroundColor: 'var(--status-expired-bg)',
            color: 'var(--status-expired-text)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
          }}
        >
          <strong>Warning:</strong> This permanently erases the file from disk storage and
          immediately revokes all public share links associated with it. This action cannot be
          undone.
        </div>
      </Dialog>

      {/* Share Dialog with Progressive Disclosure */}
      <Dialog
        open={shareDialog.open}
        title={`Share "${shareDialog.file?.originalName}"`}
        onClose={() => setShareDialog((prev) => ({ ...prev, open: false }))}
      >
        {!shareDialog.generatedLink ? (
          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
              }}
            >
              Create a cryptographic key to hand to someone. You can revoke it anytime.
            </p>

            {/* Expiration option */}
            <Field label="Link Expiration" htmlFor="expiresInDays">
              <select
                id="expiresInDays"
                value={shareDialog.expiresInDays}
                onChange={(e) =>
                  setShareDialog((prev) => ({ ...prev, expiresInDays: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">Never expires (count only)</option>
              </select>
            </Field>

            {/* Download limit option */}
            <Field label="Max Downloads Allowed" htmlFor="maxDownloads">
              <select
                id="maxDownloads"
                value={shareDialog.maxDownloads}
                onChange={(e) =>
                  setShareDialog((prev) => ({ ...prev, maxDownloads: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="1">Single use (1 download)</option>
                <option value="3">3 downloads</option>
                <option value="5">5 downloads</option>
                <option value="10">10 downloads</option>
                <option value="0">Unlimited downloads</option>
              </select>
            </Field>

            {/* Progressive disclosure: password toggle */}
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={shareDialog.hasPassword}
                  onChange={(e) =>
                    setShareDialog((prev) => ({ ...prev, hasPassword: e.target.checked }))
                  }
                />
                <span>Protect with a password</span>
              </label>

              {shareDialog.hasPassword && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Field label="Access Password" htmlFor="sharePassword">
                    <input
                      type="password"
                      id="sharePassword"
                      placeholder="Enter a secret password"
                      value={shareDialog.password}
                      onChange={(e) =>
                        setShareDialog((prev) => ({ ...prev, password: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Plain language summary */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                marginTop: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <strong>Summary:</strong> {getShareSummary()}
            </div>

            <Button onClick={handleCreateShareLink} style={{ width: '100%' }}>
              Generate Share Key
            </Button>
          </div>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: 'var(--status-active-bg)',
                color: 'var(--status-active-text)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              Key generated! Anyone with this link can download the file according to your rules.
            </div>

            <CopyField label="Public Share Link" value={shareDialog.generatedLink} />

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <Button
                onClick={() => setShareDialog((prev) => ({ ...prev, open: false }))}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Existing Links Modal */}
      <Dialog
        open={linksModal.open}
        title={`Active Links for "${linksModal.file?.originalName}"`}
        onClose={() => setLinksModal((prev) => ({ ...prev, open: false }))}
      >
        {linksModal.loading ? (
          <Spinner />
        ) : linksModal.links.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            No share links generated yet for this file.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {linksModal.links.map((lnk) => {
              const { status, text } = computeLinkStatus(lnk);
              return (
                <div
                  key={lnk.id || lnk._id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-surface-hover)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <StatusPill status={status}>{text}</StatusPill>
                    {!lnk.isRevoked && (
                      <Button
                        onClick={() => handleRevokeLink(lnk.id || lnk._id)}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-danger)',
                        }}
                      >
                        Revoke Now
                      </Button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>
                      Downloads: {lnk.downloadCount} / {lnk.maxDownloads || '∞'}
                    </span>
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span>
                      Expires: {lnk.expiresAt ? new Date(lnk.expiresAt).toLocaleString() : 'Never'}
                    </span>
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span>{lnk.isPasswordProtected ? 'Password protected' : 'No password'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Dialog>

      {/* Access History Logs Modal */}
      <Dialog
        open={logsModal.open}
        title={`Access History for "${logsModal.file?.originalName}"`}
        onClose={() => setLogsModal((prev) => ({ ...prev, open: false }))}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <Button
            onClick={() => setLogsModal((prev) => ({ ...prev, viewMode: 'timeline' }))}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: logsModal.viewMode === 'timeline' ? 'var(--accent)' : 'transparent',
              color: logsModal.viewMode === 'timeline' ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Timeline View
          </Button>
          <Button
            onClick={() => setLogsModal((prev) => ({ ...prev, viewMode: 'table' }))}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: logsModal.viewMode === 'table' ? 'var(--accent)' : 'transparent',
              color: logsModal.viewMode === 'table' ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Raw Table
          </Button>
        </div>

        {logsModal.loading ? (
          <Spinner />
        ) : logsModal.logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No access attempts recorded yet.</p>
        ) : logsModal.viewMode === 'timeline' ? (
          <Timeline
            items={logsModal.logs.map((log) => ({
              timestamp: log.timestamp,
              label: `Outcome: ${log.outcome}`,
              details: `IP: ${log.ip} • Browser: ${log.userAgent || 'Unknown'}`,
            }))}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-strong)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Time</th>
                  <th style={{ padding: '0.5rem' }}>Outcome</th>
                  <th style={{ padding: '0.5rem' }}>IP Address</th>
                  <th style={{ padding: '0.5rem' }}>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logsModal.logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <StatusPill status={log.outcome === 'success' ? 'active' : 'expired'}>
                        {log.outcome}
                      </StatusPill>
                    </td>
                    <td style={{ padding: '0.5rem' }}>{log.ip}</td>
                    <td
                      style={{
                        padding: '0.5rem',
                        maxWidth: '180px',
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
      </Dialog>
    </div>
  );
}

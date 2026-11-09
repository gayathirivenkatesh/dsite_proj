import React, { useCallback, useEffect, useState } from 'react';
import { filesApi } from '../api/files.js';
import { linksApi } from '../api/links.js';
import { getAccessToken } from '../api/client.js';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Dialog from '../components/Dialog.jsx';
import StatusStamp from '../components/StatusPill.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CopyField from '../components/CopyField.jsx';
import Spinner from '../components/Spinner.jsx';
import Timeline from '../components/Timeline.jsx';
import Navbar from '../components/Navbar.jsx';
import { KeyIcon } from '../components/PostRoomIcons.jsx';

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

  // In-place expanded file ID for ruled ledger row
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [rowDetails, setRowDetails] = useState({
    loading: false,
    links: [],
    logs: [],
    viewTab: 'keys', // 'keys' | 'timeline' | 'raw'
  });

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Rename & Delete dialogs
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
    isCreating: false,
  });

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await filesApi.list();
      setFiles(data.files || []);
    } catch (e) {
      toast.error(e.message || 'Could not retrieve your vault documents.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const loadRowDetails = async (fileId) => {
    setRowDetails((prev) => ({ ...prev, loading: true }));
    try {
      const [linksRes, logsRes] = await Promise.allSettled([
        linksApi.list({ fileId }),
        filesApi.logs(fileId),
      ]);

      setRowDetails({
        loading: false,
        links: linksRes.status === 'fulfilled' ? linksRes.value.links || [] : [],
        logs: logsRes.status === 'fulfilled' ? logsRes.value.logs || [] : [],
        viewTab: 'keys',
      });
    } catch {
      setRowDetails((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleRowExpand = (file) => {
    const fileId = file.id || file._id;
    if (expandedFileId === fileId) {
      setExpandedFileId(null);
    } else {
      setExpandedFileId(fileId);
      loadRowDetails(fileId);
    }
  };

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
        toast.success(`"${file.name}" safely kept in your vault.`);
        setShowUpload(false);
        setUploadProgress(0);
        fetchFiles();
      } else {
        let msg = 'File could not be kept';
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
      toast.error('Connection interrupted while placing file into vault.');
    };

    xhr.send(formData);
  };

  const confirmRename = async () => {
    const { file, newName } = renameDialog;
    if (!newName.trim()) return;
    try {
      await filesApi.rename(file.id || file._id, newName.trim());
      toast.success('Document renamed in ledger.');
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
      toast.success('Document and its keys permanently retired.');
      if (expandedFileId === (file.id || file._id)) {
        setExpandedFileId(null);
      }
      fetchFiles();
    } catch (e) {
      toast.error(e.message || 'Deletion failed');
    } finally {
      setDeleteDialog({ open: false, file: null });
    }
  };

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
      parts.push('locked with password');
    } else {
      parts.push('no password required');
    }

    return parts.join(', ') + '.';
  };

  const handleCreateShareLink = async () => {
    setShareDialog((prev) => ({ ...prev, isCreating: true }));
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

      const fileId = shareDialog.file.id || shareDialog.file._id;
      const res = await linksApi.create(fileId, payload);
      const publicUrl = `${window.location.origin}/share/${res.token}`;
      setShareDialog((prev) => ({
        ...prev,
        generatedLink: publicUrl,
        isCreating: false,
      }));
      toast.success('Key created and sealed.');
      if (expandedFileId === fileId) {
        loadRowDetails(fileId);
      }
    } catch (err) {
      setShareDialog((prev) => ({ ...prev, isCreating: false }));
      toast.error(err.message || 'Could not seal share key');
    }
  };

  const handleRevokeKey = async (linkId, fileId) => {
    try {
      await linksApi.revoke(linkId);
      toast.success('Key revoked permanently.');
      if (fileId) {
        loadRowDetails(fileId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to revoke key');
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
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
              }}
            >
              Dispatch Ledger
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.25rem',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Your Vault
            </h1>
            <p
              style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}
            >
              Files you keep safe, ready to issue keys whenever you choose.
            </p>
          </div>

          <Button variant="primary" onClick={() => setShowUpload(true)}>
            Keep a File
          </Button>
        </header>

        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <Spinner />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Consulting the ledger...
            </p>
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            title="Nothing here yet."
            description="Drop a file to start your vault. You can issue self-expiring, password-protected keys anytime."
            action={
              <Button variant="primary" onClick={() => setShowUpload(true)}>
                Keep Your First File
              </Button>
            }
          />
        ) : (
          /* Ruled Ledger Table */
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              overflow: 'hidden',
            }}
          >
            {/* Ledger Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) 110px 140px minmax(0, 2.5fr)',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border-strong)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-primary)',
              }}
              className="ledger-header"
            >
              <span>Document</span>
              <span>Size</span>
              <span>Kept Since</span>
              <span style={{ textAlign: 'right' }}>Actions & Ledger</span>
            </div>

            {/* Ruled rows */}
            {files.map((file, idx) => {
              const fileId = file.id || file._id;
              const isExpanded = expandedFileId === fileId;

              return (
                <div
                  key={fileId}
                  style={{
                    borderBottom:
                      idx === files.length - 1 && !isExpanded
                        ? 'none'
                        : '1px solid var(--border-subtle)',
                    transition: 'background-color var(--transition-fast)',
                    backgroundColor: isExpanded ? 'var(--bg-surface-hover)' : 'transparent',
                  }}
                >
                  {/* Summary row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 2fr) 110px 140px minmax(0, 2.5fr)',
                      padding: '1rem 1.25rem',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    className="ledger-row"
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {file.originalName}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.2rem',
                        }}
                      >
                        {file.mimeType}
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {formatBytes(file.size)}
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button
                        variant="primary"
                        onClick={() =>
                          setShareDialog({
                            open: true,
                            file,
                            expiresInDays: '7',
                            maxDownloads: '5',
                            hasPassword: false,
                            password: '',
                            generatedLink: '',
                            isCreating: false,
                          })
                        }
                        style={{ minHeight: '36px', padding: '0 0.75rem', fontSize: '0.8125rem' }}
                      >
                        Hand Out Key
                      </Button>

                      <a
                        href={`${import.meta.env.VITE_API_URL ?? ''}/api/v1/files/${fileId}/download`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8125rem',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                        }}
                      >
                        Download
                      </a>

                      <Button
                        variant="secondary"
                        onClick={() => toggleRowExpand(file)}
                        style={{
                          minHeight: '36px',
                          padding: '0 0.75rem',
                          fontSize: '0.8125rem',
                          borderColor: isExpanded ? 'var(--accent)' : 'var(--border-subtle)',
                        }}
                      >
                        {isExpanded ? 'Close Entry' : 'Open Ledger'}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() =>
                          setRenameDialog({ open: true, file, newName: file.originalName })
                        }
                        style={{ minHeight: '36px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
                      >
                        Rename
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => setDeleteDialog({ open: true, file })}
                        style={{ minHeight: '36px', padding: '0 0.5rem', fontSize: '0.8125rem' }}
                      >
                        Retire
                      </Button>
                    </div>
                  </div>

                  {/* Expanded In-Place Drawer */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1.5rem',
                        borderTop: '1px dashed var(--border-strong)',
                        backgroundColor: 'var(--bg-primary)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '1rem',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setRowDetails((prev) => ({ ...prev, viewTab: 'keys' }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color:
                                rowDetails.viewTab === 'keys'
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                              cursor: 'pointer',
                              borderBottom:
                                rowDetails.viewTab === 'keys'
                                  ? '2px solid var(--accent)'
                                  : '2px solid transparent',
                              paddingBottom: '0.25rem',
                            }}
                          >
                            Issued Keys ({rowDetails.links.length})
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRowDetails((prev) => ({ ...prev, viewTab: 'timeline' }))
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color:
                                rowDetails.viewTab === 'timeline'
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                              cursor: 'pointer',
                              borderBottom:
                                rowDetails.viewTab === 'timeline'
                                  ? '2px solid var(--accent)'
                                  : '2px solid transparent',
                              paddingBottom: '0.25rem',
                            }}
                          >
                            Access Story ({rowDetails.logs.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => setRowDetails((prev) => ({ ...prev, viewTab: 'raw' }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontFamily: 'var(--font-sans)',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color:
                                rowDetails.viewTab === 'raw'
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                              cursor: 'pointer',
                              borderBottom:
                                rowDetails.viewTab === 'raw'
                                  ? '2px solid var(--accent)'
                                  : '2px solid transparent',
                              paddingBottom: '0.25rem',
                            }}
                          >
                            Raw Log
                          </button>
                        </div>

                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Document ID: {fileId}
                        </span>
                      </div>

                      {rowDetails.loading ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                          <Spinner />
                        </div>
                      ) : rowDetails.viewTab === 'keys' ? (
                        /* Keys Tab */
                        rowDetails.links.length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            No keys have been issued for this document yet. Click &ldquo;Hand Out
                            Key&rdquo; to create one.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {rowDetails.links.map((lnk) => {
                              const { status, text } = computeLinkStatus(lnk);
                              return (
                                <div
                                  key={lnk.id || lnk._id}
                                  style={{
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-xs)',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: 'var(--bg-surface)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem',
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '0.25rem',
                                      }}
                                    >
                                      <StatusStamp status={status}>{text}</StatusStamp>
                                      <span
                                        style={{
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: '0.75rem',
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        Key #{String(lnk.id || lnk._id).slice(-6)}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.8125rem',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      {lnk.maxDownloads
                                        ? `${lnk.downloadCount} of ${lnk.maxDownloads} downloads used`
                                        : `${lnk.downloadCount} downloads (unlimited)`}
                                      {' • '}
                                      {lnk.expiresAt
                                        ? `Expires ${new Date(lnk.expiresAt).toLocaleDateString()}`
                                        : 'Never expires'}
                                      {lnk.isPasswordProtected && ' • Password locked'}
                                    </div>
                                  </div>

                                  {!lnk.isRevoked && (
                                    <Button
                                      variant="danger"
                                      onClick={() => handleRevokeKey(lnk.id || lnk._id, fileId)}
                                      style={{
                                        minHeight: '32px',
                                        padding: '0 0.5rem',
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      Revoke Key
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : rowDetails.viewTab === 'timeline' ? (
                        /* Human Sentences Timeline */
                        <Timeline items={rowDetails.logs} />
                      ) : (
                        /* Raw Log Tab */
                        <div style={{ overflowX: 'auto' }}>
                          <table
                            style={{
                              width: '100%',
                              fontSize: '0.8125rem',
                              borderCollapse: 'collapse',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  borderBottom: '1px solid var(--border-strong)',
                                  textAlign: 'left',
                                }}
                              >
                                <th style={{ padding: '0.5rem' }}>Time</th>
                                <th style={{ padding: '0.5rem' }}>Outcome</th>
                                <th style={{ padding: '0.5rem' }}>IP Address</th>
                                <th style={{ padding: '0.5rem' }}>User Agent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowDetails.logs.map((log, lIdx) => (
                                <tr
                                  key={log._id || log.id || lIdx}
                                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                >
                                  <td style={{ padding: '0.5rem' }}>
                                    {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '0.5rem' }}>
                                    <StatusStamp
                                      status={log.outcome === 'success' ? 'active' : 'revoked'}
                                    >
                                      {log.outcome}
                                    </StatusStamp>
                                  </td>
                                  <td style={{ padding: '0.5rem' }}>{log.ip}</td>
                                  <td
                                    style={{
                                      padding: '0.5rem',
                                      maxWidth: '240px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
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
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog
        open={showUpload}
        title="Keep a Document"
        onClose={() => {
          if (!isUploading) setShowUpload(false);
        }}
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Choose a file to deposit into your private post room vault. Accepted: PDF, PNG, JPEG, GIF,
          WEBP, ZIP, TXT. Up to 25MB.
        </p>
        <input
          type="file"
          disabled={isUploading}
          onChange={handleUpload}
          style={{
            width: '100%',
            padding: '1rem',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-primary)',
          }}
        />
        {isUploading && (
          <div style={{ marginTop: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                marginBottom: '0.35rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>Checking magic bytes and storing securely...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div
              style={{
                height: '4px',
                backgroundColor: 'var(--border-subtle)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent)',
                  transition: 'width 150ms ease',
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
        confirmLabel="Save"
      >
        <Field label="Document Title in Ledger" htmlFor="renameInput">
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
        title="Retire Document Permanently"
        onClose={() => setDeleteDialog({ open: false, file: null })}
        onConfirm={confirmDelete}
        confirmLabel="Retire Document"
        isDestructive
      >
        <p style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Are you sure you want to retire <strong>{deleteDialog.file?.originalName}</strong>?
        </p>
        <div
          style={{
            backgroundColor: 'var(--status-revoked-bg)',
            color: 'var(--status-revoked-text)',
            border: '1px solid var(--status-revoked-border)',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          This permanently erases the document from vault storage. All keys issued for this document
          will immediately shut and cannot be reopened.
        </div>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialog.open}
        title={`Hand Out Key for "${shareDialog.file?.originalName}"`}
        onClose={() => setShareDialog((prev) => ({ ...prev, open: false }))}
      >
        {!shareDialog.generatedLink ? (
          <div>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem',
              }}
            >
              Set the rules for this key. When limits are reached, the lock clicks shut.
            </p>

            <Field label="Key Expiry" htmlFor="expiresInDays">
              <select
                id="expiresInDays"
                value={shareDialog.expiresInDays}
                onChange={(e) =>
                  setShareDialog((prev) => ({ ...prev, expiresInDays: e.target.value }))
                }
              >
                <option value="1">Runs out in 1 day</option>
                <option value="3">Runs out in 3 days</option>
                <option value="7">Runs out in 7 days</option>
                <option value="30">Runs out in 30 days</option>
                <option value="0">Never expires by time</option>
              </select>
            </Field>

            <Field label="Download Allowance" htmlFor="maxDownloads">
              <select
                id="maxDownloads"
                value={shareDialog.maxDownloads}
                onChange={(e) =>
                  setShareDialog((prev) => ({ ...prev, maxDownloads: e.target.value }))
                }
              >
                <option value="1">Single handoff (1 download)</option>
                <option value="3">Up to 3 downloads</option>
                <option value="5">Up to 5 downloads</option>
                <option value="10">Up to 10 downloads</option>
                <option value="0">Unlimited downloads</option>
              </select>
            </Field>

            <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={shareDialog.hasPassword}
                  onChange={(e) =>
                    setShareDialog((prev) => ({ ...prev, hasPassword: e.target.checked }))
                  }
                />
                <span>Lock with a password</span>
              </label>

              {shareDialog.hasPassword && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Field label="Key Password" htmlFor="sharePassword">
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

            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem',
              }}
            >
              <strong>Summary:</strong> {getShareSummary()}
            </div>

            <Button
              variant="primary"
              onClick={handleCreateShareLink}
              disabled={shareDialog.isCreating}
              style={{ width: '100%' }}
            >
              <KeyIcon size={16} />
              <span>{shareDialog.isCreating ? 'Sealing key...' : 'Seal & Issue Key'}</span>
            </Button>
          </div>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: 'var(--status-active-bg)',
                color: 'var(--status-active-text)',
                border: '1px solid var(--status-active-border)',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <KeyIcon size={18} />
              <span>Key issued and ready to hand to someone.</span>
            </div>

            <CopyField label="Public Share Link" value={shareDialog.generatedLink} />

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <Button
                variant="secondary"
                onClick={() => setShareDialog((prev) => ({ ...prev, open: false }))}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <style>{`
        @media (max-width: 820px) {
          .ledger-header {
            display: none !important;
          }
          .ledger-row {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

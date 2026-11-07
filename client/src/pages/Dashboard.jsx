import React, { useEffect, useState } from 'react';
import { filesApi } from '../../api/files.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { useToast } from '../../features/toast/ToastContext.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import Dialog from '../../components/Dialog.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import CopyField from '../../components/CopyField.jsx';
import Spinner from '../../components/Spinner.jsx';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [renameDialog, setRenameDialog] = useState({ open: false, file: null, newName: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await filesApi.list();
      setFiles(data.files || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env.VITE_API_URL ?? ''}/api/v1/files`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = async () => {
      if (xhr.status === 201) {
        toast.success('File uploaded');
        setUploadProgress(0);
        fetchFiles();
      } else {
        toast.error(`Upload failed: ${xhr.statusText}`);
        setUploadProgress(0);
      }
    };
    xhr.onerror = () => {
      toast.error('Network error during upload');
      setUploadProgress(0);
    };
    xhr.send(formData);
  };

  const openRename = (file) => {
    setRenameDialog({ open: true, file, newName: file.originalName });
  };

  const confirmRename = async () => {
    const { file, newName } = renameDialog;
    try {
      await filesApi.rename(file._id, newName);
      toast.success('Renamed');
      fetchFiles();
    } catch (e) {
      toast.error(e.message || 'Rename failed');
    } finally {
      setRenameDialog({ open: false, file: null, newName: '' });
    }
  };

  const openDelete = (file) => {
    setDeleteDialog({ open: true, file });
  };

  const confirmDelete = async () => {
    const { file } = deleteDialog;
    try {
      await filesApi.delete(file._id);
      toast.success('Deleted');
      fetchFiles();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleteDialog({ open: false, file: null });
    }
  };

  if (loading) return <Spinner />;

  return (
    <section className="container" style={{ maxWidth: '48rem', margin: '2rem auto' }}>
      <h1>Welcome, {user?.name}</h1>
      <Button onClick={() => setShowUpload(true)}>Upload File</Button>
      {showUpload && (
        <Dialog open={showUpload} title="Upload" onClose={() => setShowUpload(false)}>
          <input type="file" onChange={handleUpload} />
          {uploadProgress > 0 && <p>Progress: {uploadProgress}%</p>}
        </Dialog>
      )}

      {files.length === 0 ? (
        <EmptyState title="No files yet" description="Upload a file to get started." />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {files.map((f) => (
            <li key={f._id} style={{ borderBottom: '1px solid var(--border-subtle)', padding: '1rem 0' }}>
              <div>
                <strong>{f.originalName}</strong>
                <CopyField label="Link" value={window.location.origin + `/links/${f._id}` } />
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Button onClick={() => openRename(f)}>Rename</Button>
                <Button onClick={() => openDelete(f)} style={{ marginLeft: '0.5rem' }}>Delete</Button>
                <Link to={`/files/${f._id}`} style={{ marginLeft: '0.5rem' }}>Share</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.open}
        title="Rename File"
        onClose={() => setRenameDialog({ open: false, file: null, newName: '' })}
        onConfirm={confirmRename}
        confirmLabel="Rename"
      >
        <Field label="New name" htmlFor="newName">
          <input
            id="newName"
            value={renameDialog.newName}
            onChange={(e) => setRenameDialog((d) => ({ ...d, newName: e.target.value }))}
          />
        </Field>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        title="Delete File"
        onClose={() => setDeleteDialog({ open: false, file: null })}
        onConfirm={confirmDelete}
        confirmLabel="Delete"
      >
        <p>Are you sure you want to delete <strong>{deleteDialog.file?.originalName}</strong>? This action cannot be undone.</p>
      </Dialog>
    </section>
  );
}


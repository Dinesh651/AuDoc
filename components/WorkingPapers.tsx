import React, { useState, useEffect, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { AuditTabProps, WorkingPaper } from '../types';
import { subscribeToWorkingPapers, addWorkingPaperMeta, deleteWorkingPaperMeta } from '../services/db';

const CATEGORIES = [
  {
    id: 'prev_year_financials' as const,
    label: 'Previous Year Financials',
    description: 'Prior period financial statements and working papers',
    colorClass: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'current_year_financials' as const,
    label: 'Current Year Financials',
    description: 'Current year draft financial statements',
    colorClass: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'other' as const,
    label: 'Other Working Papers',
    description: 'Other relevant documents and correspondence',
    colorClass: 'bg-purple-100 text-purple-600',
  },
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileTypeBadge: React.FC<{ fileType: string }> = ({ fileType }) => {
  if (fileType === 'application/pdf')
    return <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><span className="text-red-600 text-xs font-bold">PDF</span></div>;
  if (fileType.startsWith('image/'))
    return <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"><span className="text-green-600 text-xs font-bold">IMG</span></div>;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('xlsx'))
    return <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0"><span className="text-teal-600 text-xs font-bold">XLS</span></div>;
  return <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><span className="text-slate-600 text-xs font-bold">DOC</span></div>;
};

interface PaperRowProps {
  paper: WorkingPaper;
  isClosed?: boolean;
  onDelete: (paper: WorkingPaper) => void;
  onPreview: (paper: WorkingPaper) => void;
}

const PaperRow: React.FC<PaperRowProps> = ({ paper, isClosed, onDelete, onPreview }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white transition-colors group">
    <FileTypeBadge fileType={paper.fileType} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-800 truncate">{paper.fileName}</p>
      <p className="text-xs text-slate-500">{formatSize(paper.fileSize)} &bull; {new Date(paper.uploadedAt).toLocaleDateString()}</p>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ pointerEvents: 'auto' }}>
      <button
        onClick={() => onPreview(paper)}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
        title="View"
        style={{ pointerEvents: 'auto' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </button>
      <a
        href={paper.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
        title="Open / Download"
        style={{ pointerEvents: 'auto' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </a>
      {!isClosed && (
        <button
          onClick={() => onDelete(paper)}
          className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  </div>
);

interface CategorySectionProps {
  cat: typeof CATEGORIES[number];
  papers: WorkingPaper[];
  isClosed?: boolean;
  uploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  onDelete: (paper: WorkingPaper) => void;
  onPreview: (paper: WorkingPaper) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  cat, papers, isClosed, uploading, uploadProgress, onUpload, onDelete, onPreview,
}) => {
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${cat.colorClass} flex items-center justify-center`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{cat.label}</h3>
            <p className="text-sm text-slate-500">{cat.description} &bull; <span className="font-medium">{papers.length} file{papers.length !== 1 ? 's' : ''}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {!isClosed && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
          )}
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          {uploading && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-indigo-700">Uploading...</span>
                <span className="text-sm font-semibold text-indigo-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-1.5">
                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {papers.length === 0 && !uploading ? (
            <div
              className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center transition-colors ${!isClosed ? 'hover:border-indigo-300 cursor-pointer' : ''}`}
              onClick={() => !isClosed && inputRef.current?.click()}
            >
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-400">{isClosed ? 'No files uploaded' : 'Click to upload or drag and drop'}</p>
              {!isClosed && <p className="text-xs text-slate-300 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — max 20 MB</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {papers.map((p) => (
                <PaperRow key={p.id} paper={p} isClosed={isClosed} onDelete={onDelete} onPreview={onPreview} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PreviewModal: React.FC<{ paper: WorkingPaper; onClose: () => void }> = ({ paper, onClose }) => {
  const isPdf = paper.fileType === 'application/pdf';
  const isImage = paper.fileType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-800">{paper.fileName}</h3>
            <p className="text-xs text-slate-500">{formatSize(paper.fileSize)} &bull; {new Date(paper.uploadedAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              Open in New Tab
            </a>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-slate-100 rounded-b-xl min-h-[60vh]">
          {isPdf && <iframe src={paper.fileUrl} className="w-full h-full min-h-[60vh]" title={paper.fileName} />}
          {isImage && (
            <div className="flex items-center justify-center h-full min-h-[60vh] p-4">
              <img src={paper.fileUrl} alt={paper.fileName} className="max-w-full max-h-full object-contain rounded" />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-slate-500 gap-4">
              <svg className="w-14 h-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WorkingPapers: React.FC<AuditTabProps> = ({ client, engagementId, isClosed }) => {
  const [papers, setPapers] = useState<WorkingPaper[]>([]);
  const [uploadingCat, setUploadingCat] = useState<WorkingPaper['category'] | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewPaper, setPreviewPaper] = useState<WorkingPaper | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToWorkingPapers(engagementId, setPapers);
    return () => unsubscribe();
  }, [engagementId]);

  const handleUpload = async (file: File, category: WorkingPaper['category']) => {
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size must be under 20 MB.');
      return;
    }
    setUploadingCat(category);
    setUploadProgress(0);
    setUploadError('');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('You must be signed in to upload files.');

      const paperId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const blob = await upload(
        `engagements/${engagementId}/workingPapers/${paperId}/${file.name}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
          clientPayload: JSON.stringify({ idToken }),
          contentType: file.type || 'application/octet-stream',
          multipart: true,
          onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
        }
      );

      const paper: WorkingPaper = {
        id: paperId,
        category,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileUrl: blob.url,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };
      await addWorkingPaperMeta(engagementId, paper);
    } catch (err: any) {
      const msg: string = err?.message || 'Unknown error';
      if (/not configured|No token found|BLOB_READ_WRITE_TOKEN/i.test(msg)) {
        setUploadError('File storage is not connected yet. In the Vercel dashboard, add a Blob store to this project (see STORAGE.md in the repo), then redeploy.');
      } else if (/Failed to fetch|NetworkError|404/i.test(msg)) {
        setUploadError('Could not reach the upload API. On a local dev server use "vercel dev" instead of "npm run dev" — the /api routes only exist on Vercel.');
      } else {
        setUploadError(`Upload failed: ${msg}`);
      }
    } finally {
      setUploadingCat(null);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (paper: WorkingPaper) => {
    if (!window.confirm(`Delete "${paper.fileName}"? This cannot be undone.`)) return;
    try {
      if (/\.blob\.vercel-storage\.com\//.test(paper.fileUrl)) {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch('/api/blob-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: paper.fileUrl, idToken }),
        });
      } else {
        // Legacy file stored on Firebase Storage before the Vercel Blob migration
        const fileRef = storageRef(storage, `engagements/${engagementId}/workingPapers/${paper.id}/${paper.fileName}`);
        await deleteObject(fileRef);
      }
    } catch {
      // File may already be removed from storage
    }
    await deleteWorkingPaperMeta(engagementId, paper.id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Working Papers & Financial Documents</h2>
        <p className="text-slate-500 mt-1">
          Upload and manage financial statements and supporting documents for <strong>{client.name}</strong>.
          {isClosed && <span className="ml-2 text-amber-600 font-medium">View only — engagement is closed.</span>}
        </p>
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Upload Error</p>
            <p className="text-sm text-red-600 mt-0.5">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.id}
          cat={cat}
          papers={papers.filter((p) => p.category === cat.id)}
          isClosed={isClosed}
          uploading={uploadingCat === cat.id}
          uploadProgress={uploadProgress}
          onUpload={(file) => handleUpload(file, cat.id)}
          onDelete={handleDelete}
          onPreview={setPreviewPaper}
        />
      ))}

      {previewPaper && <PreviewModal paper={previewPaper} onClose={() => setPreviewPaper(null)} />}
    </div>
  );
};

export default WorkingPapers;

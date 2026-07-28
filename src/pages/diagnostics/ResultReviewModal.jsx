import { useState, useEffect, useCallback, useRef } from 'react';
import { diagnosticsService } from '../../services/diagnostics/diagnosticsApi';
import { apiRequestBlob } from '../../services/config/config';
import { staffName } from '../../services/core-modules/staffLookup';
import { toast } from '../../components/Toast';
import Icon from '../../components/dashboard/Icon';
import ImageViewer from './ImageViewer';
import PDFViewer from './PDFViewer';
import { formatDateTime } from '../../utils/dateFormat';

const PRIORITY_COLORS = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  HIGH: { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' },
  MEDIUM: { bg: '#fefce8', text: '#ca8a04', dot: '#eab308' },
  LOW: { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
};

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: c.text, background: c.bg,
        padding: '2px 8px', borderRadius: 4,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {priority}
    </span>
  );
}

export default function ResultReviewModal({ diagnosticId, department, onClose, onFinalized }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draftReport, setDraftReport] = useState('');
  const [finalReport, setFinalReport] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [viewingImage, setViewingImage] = useState(null);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const uploadRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - 560) / 2),
    y: Math.max(36, window.innerHeight * 0.08),
  }));

  function onHeaderMouseDown(e) {
    if (e.target.closest('button, a, input, textarea, select, summary, details')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = pos.x;
    const offsetY = pos.y;

    function onMove(ev) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 120, offsetX + ev.clientX - startX)),
        y: Math.max(0, Math.min(window.innerHeight - 80, offsetY + ev.clientY - startY)),
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const popupStyle = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
  };

  async function handleDeleteAttachment(att) {
    if (!window.confirm('Delete this image?')) return;
    setDeleting(att._id);
    try {
      await diagnosticsService.deleteAttachment(diagnosticId, att._id);
      toast(`Deleted ${att.originalName || 'image'}`);
      setData((prev) => ({
        ...prev,
        attachments: (prev?.attachments || []).filter((a) => a._id !== att._id),
      }));
      if (viewingImage?._id === att._id) setViewingImage(null);
      if (viewingPdf?._id === att._id) setViewingPdf(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  }

  const pdfBlobUrlRef = useRef(null);

  useEffect(() => {
    if (!viewingPdf) { setPdfBlobUrl(null); return undefined; }
    let isCurrent = true;
    const id = viewingPdf._id;
    apiRequestBlob(`/diagnostics/attachments/${id}/file`)
      .then((blob) => {
        if (!isCurrent) return;
        const pdfBlob = blob.type === 'application/pdf'
          ? blob
          : new Blob([blob], { type: viewingPdf.mimeType || 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => toast(err.message || 'Failed to load PDF', 'error'));
    return () => {
      isCurrent = false;
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
    };
  }, [viewingPdf]);

  useEffect(() => {
    if (!diagnosticId) return;
    setLoading(true);
    diagnosticsService.getById(diagnosticId)
      .then((res) => {
        const d = res.data || res;
        setData(d);
        setDraftReport(d.review?.draftReport || '');
        setFinalReport(d.review?.finalReport || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [diagnosticId]);

  const handleSaveDraft = useCallback(async () => {
    if (!draftReport.trim()) return;
    setSaving(true);
    try {
      await diagnosticsService.saveDraft(diagnosticId, draftReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [diagnosticId, draftReport]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await diagnosticsService.uploadAttachment(diagnosticId, file);
      toast(`Successful upload for ${file.name}`);
      const res = await diagnosticsService.getById(diagnosticId);
      setData(res.data || res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  }

  const handleFinalize = useCallback(async () => {
    if (!finalReport.trim()) return;
    setFinalizing(true);
    try {
      await diagnosticsService.finalize(diagnosticId, finalReport);
      onFinalized?.(diagnosticId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }, [diagnosticId, finalReport, onClose, onFinalized]);

  if (loading) {
    return (
      <div className="diagnostics-sub-overlay" onClick={onClose}>
        <div className="diagnostics-sub-panel" onClick={(e) => e.stopPropagation()} style={{ ...popupStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diagnostics-sub-overlay" onClick={onClose}>
        <div className="diagnostics-sub-panel" onClick={(e) => e.stopPropagation()} style={popupStyle}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button onClick={onClose} style={{ marginTop: 12, padding: '6px 16px', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  }

  const diagnostic = data?.diagnostic || {};
  const patient = data?.patient || {};
  const aiAnalysis = data?.aiAnalysis || {};
  const review = data?.review || {};
  const isFinalized = diagnostic.status === 'FINALIZED';

  return (
    <>
    <div className="diagnostics-sub-overlay" onClick={onClose}>
      <div className="diagnostics-sub-panel diagnostics-review-panel" onClick={(e) => e.stopPropagation()} style={popupStyle}>
        <div onMouseDown={onHeaderMouseDown} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, margin: '-20px -20px 16px', padding: '16px 20px', borderBottom: '1px solid var(--line)', cursor: 'grab', userSelect: 'none' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{diagnostic.testType}</h2>
              <PriorityBadge priority={diagnostic.priority} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              {patient.fullName || diagnostic.ellyId} &middot; {diagnostic.ellyId} &middot; {diagnostic.department}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input ref={uploadRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleUpload} style={{ display: 'none' }} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => uploadRef.current?.click()}
              title="Upload file"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', fontSize: 12, fontWeight: 600,
                border: '1px solid var(--line)', borderRadius: 6,
                background: 'var(--surface-muted)', color: 'var(--text)',
                cursor: 'pointer', opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? <span>...</span> : <Icon name="upload" size={14} />}
              {uploading ? 'Uploading' : 'Upload'}
            </button>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface-muted)', cursor: 'pointer' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {data?.attachments?.some((a) => a.storagePath) && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Attachments ({data.attachments.filter((a) => a.storagePath).length})
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {data.attachments.filter((a) => a.storagePath).map((att) => {
                const isImage = att.fileType === 'IMAGE' || att.mimeType?.startsWith('image/');
                const isPdf = att.mimeType === 'application/pdf' || att.originalName?.toLowerCase().endsWith('.pdf');
                return (
                <div key={att._id} style={{ position: 'relative', width: 80, height: 80 }}>
                  {isImage ? (
                    <button
                      onClick={() => setViewingImage(att)}
                      title="View image"
                      style={{ width: '100%', height: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--surface-muted)', cursor: 'pointer', padding: 0, display: 'block' }}
                    >
                      <img
                        src={att.storagePath}
                        alt={att.originalName || 'Attachment'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </button>
                  ) : isPdf ? (
                    <button
                      onClick={() => setViewingPdf(att)}
                      title="View PDF"
                      style={{ width: '100%', height: '100%', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-muted)', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: 'var(--text-muted)', fontSize: 10 }}
                    >
                      <Icon name="file" size={20} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 4px' }}>{att.originalName || 'PDF'}</span>
                    </button>
                  ) : (
                    <a
                      href={att.storagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open file"
                      style={{ width: '100%', height: '100%', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textDecoration: 'none', color: 'var(--text-muted)', fontSize: 10 }}
                    >
                      <Icon name="file" size={20} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 4px' }}>{att.originalName || 'File'}</span>
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteAttachment(att)}
                    disabled={deleting === att._id}
                    title="Delete attachment"
                    style={{
                      position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
                      border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer',
                      display: 'grid', placeItems: 'center', padding: 0, fontSize: 10, lineHeight: 1,
                      color: 'var(--text-muted)', opacity: deleting === att._id ? 0.5 : 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {aiAnalysis?.observations?.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--surface-muted)', border: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              AI Observations
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)' }}>
              This is only a placeholder for later AI implementation.
            </p>
            {aiAnalysis.observations.map((obs, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13, color: 'var(--text)' }}>
                <span style={{ flexShrink: 0, width: 6, height: 6, marginTop: 5, borderRadius: '50%', background: obs.severity === 'HIGH' ? '#ef4444' : obs.severity === 'MEDIUM' ? '#f97316' : '#eab308' }} />
                <span>{obs.text}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
            Draft Report
          </label>
          <textarea
            value={draftReport}
            onChange={(e) => setDraftReport(e.target.value)}
            disabled={isFinalized}
            placeholder="Enter preliminary observations..."
            rows={3}
            style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }}
          />
          <button
            onClick={handleSaveDraft}
            disabled={saving || isFinalized || !draftReport.trim()}
            style={{ marginTop: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', opacity: saving || isFinalized || !draftReport.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
            Final Report
          </label>
          <textarea
            value={finalReport}
            onChange={(e) => setFinalReport(e.target.value)}
            disabled={isFinalized}
            placeholder="Enter final interpretation..."
            rows={4}
            style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }}
          />
        </div>

        {isFinalized ? (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
            Finalized{formatDateTime(review?.finalizedAt || diagnostic.updatedAt) ? ` on ${formatDateTime(review?.finalizedAt || diagnostic.updatedAt)}` : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleFinalize}
              disabled={finalizing || !finalReport.trim()}
              style={{
                padding: '8px 24px', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 6,
                background: '#16a34a', color: '#fff', cursor: 'pointer',
                opacity: finalizing || !finalReport.trim() ? 0.5 : 1,
              }}
            >
              {finalizing ? 'Finalizing...' : 'Finalize'}
            </button>
          </div>
        )}

        {data?.auditLogs?.length > 0 && (
          <details style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Audit Trail</summary>
            <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
              {data.auditLogs.map((log, i) => (
                <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid var(--line)' }}>
                  <strong>{log.action}</strong> by {staffName(log.user)} &middot; {formatDateTime(log.timestamp)}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>

    {viewingImage && (
      <ImageViewer
        src={viewingImage.storagePath}
        alt={viewingImage.originalName || 'Attachment'}
        onClose={() => setViewingImage(null)}
        onDelete={() => handleDeleteAttachment(viewingImage)}
      />
    )}
    {viewingPdf && pdfBlobUrl && (
      <PDFViewer
        src={pdfBlobUrl}
        name={viewingPdf.originalName || 'PDF'}
        onClose={() => setViewingPdf(null)}
        onDelete={() => handleDeleteAttachment(viewingPdf)}
      />
    )}
    </>
  );
}

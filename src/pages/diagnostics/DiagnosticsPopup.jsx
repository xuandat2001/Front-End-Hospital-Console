import { useState, useEffect, useRef } from 'react';
import { diagnosticsService } from '../../services/diagnostics/diagnosticsApi';
import { staffName, ensureStaffLoaded } from '../../services/core-modules/staffLookup';
import { toast } from '../../components/Toast';
import ResultReviewModal from './ResultReviewModal';
import Icon from '../../components/dashboard/Icon';
import useSessionStore from '../../store/useSessionStore';

const QUEUE_TABS = [
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'FINALIZED', label: 'Finalized' },
  { id: 'IMAGES', label: 'Images' },
];

const PRIORITY_COLORS = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  HIGH: { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' },
  MEDIUM: { bg: '#fefce8', text: '#ca8a04', dot: '#eab308' },
  LOW: { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
};

const ADMIN_STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
];

function QueueCard({ item, canManageStatus, canDeleteOrder, updatingStatus, deletingOrder, onClick, onStatusChange, onDeleteOrder }) {
  const c = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.MEDIUM;
  const statusValue = item.status;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await diagnosticsService.uploadAttachment(item._id, file);
      toast(`Successful upload for ${file.name}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px',
        border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)',
        fontSize: 13, color: 'var(--text)',
      }}
    >
      <button
        onClick={() => onClick(item._id)}
        style={{
          flex: 1, minWidth: 0, display: 'block', textAlign: 'left',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <strong style={{ fontSize: 14 }}>{item.testType}</strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.ellyId}</span>
          {item.patientName && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>&middot; {item.patientName}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{item.department}</span>
          {item.bodyRegion && <span>&middot; {item.bodyRegion}</span>}
          {item.sampleType && <span>&middot; {item.sampleType}</span>}
          {item.assignedReviewer && <span>&middot; {staffName(item.assignedReviewer)}</span>}
        </div>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {canManageStatus && item.status !== 'FINALIZED' && (
          <select
            value={statusValue}
            disabled={updatingStatus}
            onChange={(e) => onStatusChange(item._id, e.target.value)}
            title="Change order status"
            style={{
              height: 28, maxWidth: 142, border: '1px solid var(--line)', borderRadius: 6,
              background: 'var(--surface)', color: 'var(--text)', fontSize: 11,
              fontWeight: 700, padding: '0 6px', outline: 'none',
              cursor: updatingStatus ? 'wait' : 'pointer',
            }}
          >
            {ADMIN_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
        {canDeleteOrder && item.status !== 'FINALIZED' && (
          <button
            type="button"
            disabled={deletingOrder}
            onClick={() => onDeleteOrder(item)}
            title="Delete order"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, border: '1px solid var(--line)', borderRadius: 6,
              background: 'var(--surface)', color: '#dc2626', cursor: deletingOrder ? 'wait' : 'pointer',
              padding: 0, opacity: deletingOrder ? 0.5 : 1,
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', color: c.text, background: c.bg,
            padding: '2px 6px', borderRadius: 4,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
          {item.priority}
        </span>
        {item.aiReviewStatus === 'COMPLETED' && (
          <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>AI ✓</span>
        )}
        {item.status === 'FINALIZED' && (
          <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>Finalized</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          title="Upload file"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, border: '1px solid var(--line)', borderRadius: 6,
            background: 'var(--surface)', cursor: 'pointer', padding: 0,
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>...</span>
          ) : (
            <Icon name="upload" size={14} />
          )}
        </button>
        <Icon name="chevronDown" size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--text-muted)' }} />
      </div>
    </div>
  );
}

export default function DiagnosticsPopup({ department, patientEllyId, onClose, offsetIndex = 0 }) {
  const sessionRole = useSessionStore((state) => state.role || state.currentUser?.role);
  const normalizedPatientEllyId = patientEllyId ? String(patientEllyId).trim() : '';
  const [activeTab, setActiveTab] = useState(() => (normalizedPatientEllyId ? 'FINALIZED' : 'IN_PROGRESS'));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - 680) / 2 + offsetIndex * 320 - (offsetIndex > 0 ? 160 : 0)),
    y: Math.max(36, window.innerHeight * 0.06 + offsetIndex * 50),
  }));
  const imageUploadRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploadTarget, setImageUploadTarget] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const canManageOrderStatus = sessionRole === 'HOSPITAL_ADMIN';
  const canDeleteOrders = sessionRole === 'HOSPITAL_ADMIN';

  useEffect(() => {
    if (normalizedPatientEllyId) setActiveTab('FINALIZED');
  }, [normalizedPatientEllyId]);

  useEffect(() => { ensureStaffLoaded(); }, []);
  function onHeaderMouseDown(e) {
    if (e.target.closest('.diagnostics-close-btn, .diagnostics-tabs, .diagnostics-queue, .diagnostics-empty')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = pos.x;
    const offsetY = pos.y;

    function onMove(ev) {
      setPos({
        x: Math.max(0, offsetX + ev.clientX - startX),
        y: Math.max(0, offsetY + ev.clientY - startY),
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { department, limit: 50 };
        if (normalizedPatientEllyId) params.ellyId = normalizedPatientEllyId;
        if (activeTab !== 'IMAGES') {
          params.status = activeTab;
        }
        if (debouncedSearch.trim() && activeTab !== 'IMAGES') params.search = debouncedSearch.trim();
        const [listRes, statsRes] = await Promise.all([
          diagnosticsService.list(params),
          diagnosticsService.getStats(department),
        ]);
        if (cancelled) return;
        setItems(listRes.data?.diagnostics || []);
        setStats(statsRes.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [department, normalizedPatientEllyId, activeTab, debouncedSearch]);

  const getTabCount = (tabId) => {
    if (!stats) return '';
    if (tabId === 'IN_PROGRESS') return stats.inProgress ?? '';
    if (tabId === 'IN_REVIEW') return stats.inReview ?? '';
    if (tabId === 'FINALIZED') return stats.finalized ?? '';
    return '';
  };

  function reload() {
    setLoading(true);
    setError('');
    const params = { department, limit: 50 };
    if (normalizedPatientEllyId) params.ellyId = normalizedPatientEllyId;
    if (activeTab !== 'IMAGES') {
      params.status = activeTab;
    }
    if (search.trim() && activeTab !== 'IMAGES') params.search = search.trim();
    Promise.all([
      diagnosticsService.list(params),
      diagnosticsService.getStats(department),
    ]).then(([listRes, statsRes]) => {
      setItems(listRes.data?.diagnostics || []);
      setStats(statsRes.data);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }

  async function handleImageUpload() {
    if (!imageFile || !imageUploadTarget) return;
    setImageUploading(true);
    try {
      await diagnosticsService.uploadAttachment(imageUploadTarget, imageFile);
      toast(`Successful upload for ${imageFile.name}`);
      setImageFile(null);
      setImageUploadTarget('');
      if (imageUploadRef.current) imageUploadRef.current.value = '';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleStatusChange(id, status) {
    setUpdatingStatusId(id);
    try {
      await diagnosticsService.updateStatus(id, status);
      toast('Diagnostic order status updated');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteOrder(item) {
    if (!window.confirm(`Delete ${item.testType} order for ${item.patientName || item.ellyId}?`)) return;
    setDeletingOrderId(item._id);
    try {
      await diagnosticsService.deleteOrder(item._id);
      toast('Diagnostic order deleted');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeletingOrderId(null);
    }
  }

  const departmentLabel = department === 'RADIOLOGY' ? 'Radiology' : 'Laboratory';
  const patientContextLabel = normalizedPatientEllyId ? ` · ${normalizedPatientEllyId}` : '';

  return (
    <div className="diagnostics-overlay">
      <button
        className="diagnostics-backdrop"
        onClick={onClose}
        aria-label="Close diagnostics"
      />
      <section
        className="diagnostics-panel"
        aria-label={`${departmentLabel} Review Queue${patientContextLabel}`}
        role="dialog"
        aria-modal="true"
        style={{ top: pos.y, left: pos.x }}
      >
        <div className="diagnostics-header" onMouseDown={onHeaderMouseDown}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="diagnostics-drag-handle" aria-hidden="true">
              <span /><span /><span /><span /><span /><span />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Diagnostics
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 21, fontWeight: 820 }}>{departmentLabel} Review Queue{patientContextLabel}</h2>
            </div>
          </div>
          <button
            aria-label="Close diagnostics"
            className="icon-button diagnostics-close-btn"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="diagnostics-tabs">
          {QUEUE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`diagnostics-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              {getTabCount(tab.id) !== '' && (
                <span className="diagnostics-tab-count">{getTabCount(tab.id)}</span>
              )}
            </button>
          ))}
        </div>

        <div className="diagnostics-queue">
          {activeTab !== 'IMAGES' && (
            <input
              type="text"
              placeholder="Search by Elly ID or patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6,
                border: '1px solid var(--line)', background: 'var(--surface)',
                color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                marginBottom: 8,
              }}
            />
          )}
          {activeTab === 'IMAGES' ? (
            <div style={{ padding: 4 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Upload Image</p>
              <input
                ref={imageUploadRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => imageUploadRef.current?.click()}
                style={{
                  border: '2px dashed var(--line)', borderRadius: 8, padding: '24px 16px',
                  textAlign: 'center', cursor: 'pointer', marginBottom: 10,
                  background: 'var(--surface-muted)', color: 'var(--text-muted)', fontSize: 13,
                }}
              >
                {imageFile ? (
                  <span style={{ color: 'var(--text)' }}>{imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)</span>
                ) : (
                  <span>Click to select an image file</span>
                )}
              </div>
              <select
                value={imageUploadTarget}
                onChange={(e) => setImageUploadTarget(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6,
                  border: '1px solid var(--line)', background: 'var(--surface)',
                  color: 'var(--text)', outline: 'none', marginBottom: 10, boxSizing: 'border-box',
                }}
              >
                <option value="">Select a diagnostic…</option>
                {items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.testType} — {item.ellyId}{item.patientName ? ` (${item.patientName})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!imageFile || !imageUploadTarget || imageUploading}
                onClick={handleImageUpload}
                style={{
                  width: '100%', padding: '8px 0', fontSize: 13, fontWeight: 700,
                  border: 'none', borderRadius: 6, background: !imageFile || !imageUploadTarget || imageUploading ? 'var(--surface-muted)' : '#2563eb',
                  color: !imageFile || !imageUploadTarget || imageUploading ? 'var(--text-muted)' : '#fff',
                  cursor: !imageFile || !imageUploadTarget || imageUploading ? 'default' : 'pointer',
                }}
              >
                {imageUploading ? 'Uploading…' : 'Upload Image'}
              </button>
            </div>
          ) : loading ? (
            <div className="diagnostics-empty">
              <p>Loading results...</p>
            </div>
          ) : error ? (
            <div className="diagnostics-empty">
              <p style={{ color: '#dc2626' }}>{error}</p>
              <button className="diagnostics-retry-btn" onClick={reload}>Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div className="diagnostics-empty">
              <Icon name="sparkle" size={32} />
              <p>No {activeTab === 'IN_PROGRESS' ? 'in-progress' : activeTab === 'IN_REVIEW' ? 'in-review' : activeTab === 'FINALIZED' ? 'finalized' : ''} results</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item) => (
                <QueueCard
                  key={item._id}
                  item={item}
                  canManageStatus={canManageOrderStatus}
                  canDeleteOrder={canDeleteOrders}
                  updatingStatus={updatingStatusId === item._id}
                  deletingOrder={deletingOrderId === item._id}
                  onClick={setReviewingId}
                  onStatusChange={handleStatusChange}
                  onDeleteOrder={handleDeleteOrder}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {reviewingId && (
        <ResultReviewModal
          diagnosticId={reviewingId}
          department={department}
          onClose={() => setReviewingId(null)}
          onFinalized={reload}
        />
      )}
    </div>
  );
}

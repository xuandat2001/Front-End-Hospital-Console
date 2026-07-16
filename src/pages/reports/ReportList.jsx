import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { reportService } from '../../services/report/reportApi';

const PRIORITY_COLORS = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const CATEGORY_LABELS = {
  INCIDENT: 'Incident',
  EQUIPMENT: 'Equipment',
  STAFF: 'Staff',
  DAILY_DEPARTMENT: 'Daily Department',
  EMERGENCY: 'Emergency',
  MAINTENANCE: 'Maintenance',
};

const SUBCATEGORY_LABELS = {
  MEDICATION_ERROR: 'Medication Error',
  PATIENT_FALL: 'Patient Fall',
  TREATMENT_DELAY: 'Treatment Delay',
  DEVICE_FAILURE: 'Device Failure',
  CALIBRATION: 'Calibration',
  REPLACEMENT: 'Replacement',
  STAFF_SHORTAGE: 'Staff Shortage',
  LEAVE_REQUEST: 'Leave Request',
  SHIFT_CHANGE: 'Shift Change',
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  HVAC: 'HVAC',
  DAILY_SUMMARY: 'Daily Summary',
  DISASTER_EVENT: 'Disaster Event',
  MASS_CASUALTY: 'Mass Casualty',
};

function formatReportDataKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportList({ category, title, showCreate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = category ? { reportCategory: category } : {};
      const res = await reportService.getAllReports(params);
      setReports(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (!startDate && !endDate) return true;
      const d = new Date(r.createdAt);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [reports, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredReports.length;
    const open = filteredReports.filter((r) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).length;
    const resolved = filteredReports.filter((r) => ['RESOLVED', 'CLOSED'].includes(r.status)).length;
    const critical = filteredReports.filter((r) => r.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).length;
    return { total, open, resolved, critical };
  }, [filteredReports]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{title || 'Reports'}</h1>
          {category && (
            <p className="text-sm text-slate-500">
              Showing {CATEGORY_LABELS[category] || category} reports
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
          {showCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'New Report'}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="self-end rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard label="Total Reports" value={stats.total} color="text-slate-900 dark:text-white" />
        <StatCard label="Open" value={stats.open} color="text-amber-600" />
        <StatCard label="Resolved" value={stats.resolved} color="text-green-600" />
        <StatCard label="Critical" value={stats.critical} color="text-red-600" />
      </div>

      {showForm && (
        <ReportForm
          category={category}
          onCreated={() => {
            setShowForm(false);
            loadReports();
          }}
        />
      )}

      {reports.length > 0 && filteredReports.length !== reports.length && (
        <p className="mb-4 text-sm text-slate-500">
          Showing {filteredReports.length} of {reports.length} reports
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Report ID</th>
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Title</th>
              {!category && <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>}
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Priority</th>
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Submitted By</th>
              <th className="p-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredReports.length === 0 && (
              <tr>
                <td colSpan={category ? 6 : 7} className="p-8 text-center text-sm text-slate-400">
                  No reports found
                </td>
              </tr>
            )}
            {filteredReports.map((r) => {
              const isExpanded = expandedId === r.reportId;
              return (
                <>
                  <tr
                    key={r.reportId}
                    className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                    onClick={() => setExpandedId(isExpanded ? null : r.reportId)}
                  >
                    <td className="p-3 text-sm font-medium text-blue-600 dark:text-blue-400">{r.reportId}</td>
                    <td className="p-3 text-sm dark:text-white">{r.title}</td>
                    {!category && (
                      <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                        {CATEGORY_LABELS[r.reportCategory] || r.reportCategory}
                      </td>
                    )}
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[r.priority] || ''}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{r.submittedBy?.staffName}</td>
                    <td className="p-3 text-sm text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.reportId}-detail`} className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan={category ? 6 : 7} className="p-4">
                        <ReportDetail
                          report={r}
                          onUpdated={loadReports}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="h-16" />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ReportDetail({ report, onUpdated }) {
  const [comment, setComment] = useState('');

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await reportService.addComment(report.reportId, {
        staffId: report.submittedBy.staffId,
        staffName: report.submittedBy.staffName,
        comment: comment.trim(),
      });
      setComment('');
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async () => {
    try {
      await reportService.resolveReport(report.reportId);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async () => {
    try {
      await reportService.closeReport(report.reportId);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 190;
    let y = 20;

    const title = (text, size = 14, bold = true) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, 10, y);
      y += size * 0.5;
    };

    const field = (label, value) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100);
      doc.text(label, 10, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      doc.text(String(value || "—"), 10, y + 4);
      y += 10;
    };

    const categoryLabel = CATEGORY_LABELS[report.reportCategory] || report.reportCategory;
    const subcategoryLabel = SUBCATEGORY_LABELS[report.reportSubcategory] || '';

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(report.title, 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`${report.reportId} | ${categoryLabel}${subcategoryLabel ? ` / ${subcategoryLabel}` : ''} | ${report.priority} | ${report.status}`, 10, y);
    y += 12;

    doc.setDrawColor(200);
    doc.line(10, y, pageW, y);
    y += 8;

    title("Report Details", 12);
    field("Submitted By", `${report.submittedBy?.staffName || '—'} (${report.submittedBy?.role || '—'})`);
    field("Department", report.departmentId || '—');
    field("Hospital", report.hospitalId || '—');
    field("Created At", report.createdAt ? new Date(report.createdAt).toLocaleString() : '—');
    field("Assigned To", report.assignedTo ? `${report.assignedTo.staffName} (${report.assignedTo.role})` : '—');
    field("Resolved At", report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : '—');
    y += 4;

    doc.setDrawColor(200);
    doc.line(10, y, pageW, y);
    y += 8;

    title("Description", 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    const descLines = doc.splitTextToSize(report.description || '—', pageW - 20);
    if (y + descLines.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.text(descLines, 10, y);
    y += descLines.length * 5 + 6;

    if (report.reportData && Object.keys(report.reportData).length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(200);
      doc.line(10, y, pageW, y);
      y += 8;
      title("Report Data", 12);
      const entries = Object.entries(report.reportData);
      const half = Math.ceil(entries.length / 2);
      const col1 = entries.slice(0, half);
      const col2 = entries.slice(half);
      let maxRows = Math.max(col1.length, col2.length);
      for (let i = 0; i < maxRows; i++) {
        if (y > 275) { doc.addPage(); y = 20; }
        if (col1[i]) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80);
          doc.text(formatReportDataKey(col1[i][0]), 10, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30);
          doc.text(String(col1[i][1]), 10, y + 4);
        }
        if (col2[i]) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80);
          doc.text(formatReportDataKey(col2[i][0]), 100, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30);
          doc.text(String(col2[i][1]), 100, y + 4);
        }
        y += 12;
      }
    }

    if (report.comments && report.comments.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(200);
      doc.line(10, y, pageW, y);
      y += 8;
      title(`Comments (${report.comments.length})`, 12);
      report.comments.forEach((c) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(c.staffName, 10, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140);
        doc.text(new Date(c.createdAt).toLocaleString(), 60, y);
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(60);
        const commentLines = doc.splitTextToSize(c.comment, pageW - 20);
        doc.text(commentLines, 10, y);
        y += commentLines.length * 4 + 4;
      });
    }

    doc.save(`${report.reportId}-${report.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{report.description}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{report.reportCategory}{report.reportSubcategory ? ` / ${report.reportSubcategory}` : ''}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Department</p>
          <p className="text-slate-700 dark:text-slate-300">{report.departmentId}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned To</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            {report.assignedTo ? `${report.assignedTo.staffName} (${report.assignedTo.role})` : '—'}
          </p>
          {report.resolvedAt && (
            <>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolved At</p>
              <p className="text-slate-700 dark:text-slate-300">{new Date(report.resolvedAt).toLocaleString()}</p>
            </>
          )}
        </div>
      </div>

      {report.reportData && Object.keys(report.reportData).length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Report Data</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            {Object.entries(report.reportData).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between border-b border-slate-200/50 pb-1 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500">{formatReportDataKey(key)}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.comments && report.comments.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Comments</p>
          <div className="space-y-2">
            {report.comments.map((c, i) => (
              <div key={i} className="rounded-lg bg-white p-2 dark:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{c.staffName}</span>
                  <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownloadPdf}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
        >
          Download PDF
        </button>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
        />
        <button
          onClick={handleAddComment}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
        >
          Comment
        </button>
        {report.status !== 'RESOLVED' && report.status !== 'CLOSED' && (
          <>
            <button onClick={handleResolve} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700">
              Resolve
            </button>
            <button onClick={handleClose} className="rounded-lg bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-500">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReportForm({ category, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    hospitalId: 'ELLY-HOSP-001',
    departmentId: '',
    reportCategory: category || 'INCIDENT',
    reportSubcategory: '',
    submittedBy: {
      staffId: 'STAFF-001',
      staffName: 'Current User',
      role: 'Doctor',
    },
    reportData: {},
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await reportService.createReport(form);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 font-semibold dark:text-white">New Report</h3>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
          <select
            value={form.reportCategory}
            onChange={(e) => set('reportCategory', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            disabled={!!category}
          >
            <option value="INCIDENT">Incident</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="STAFF">Staff</option>
            <option value="DAILY_DEPARTMENT">Daily Department</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Subcategory</label>
          <select
            value={form.reportSubcategory}
            onChange={(e) => set('reportSubcategory', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">None</option>
            <option value="MEDICATION_ERROR">Medication Error</option>
            <option value="PATIENT_FALL">Patient Fall</option>
            <option value="TREATMENT_DELAY">Treatment Delay</option>
            <option value="DEVICE_FAILURE">Device Failure</option>
            <option value="CALIBRATION">Calibration</option>
            <option value="REPLACEMENT">Replacement</option>
            <option value="STAFF_SHORTAGE">Staff Shortage</option>
            <option value="LEAVE_REQUEST">Leave Request</option>
            <option value="SHIFT_CHANGE">Shift Change</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="HVAC">HVAC</option>
            <option value="DAILY_SUMMARY">Daily Summary</option>
            <option value="DISASTER_EVENT">Disaster Event</option>
            <option value="MASS_CASUALTY">Mass Casualty</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => set('priority', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Department ID</label>
          <input
            type="text"
            required
            value={form.departmentId}
            onChange={(e) => set('departmentId', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Hospital ID</label>
          <input
            type="text"
            value={form.hospitalId}
            onChange={(e) => set('hospitalId', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
        <textarea
          required
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Report'}
      </button>
    </form>
  );
}

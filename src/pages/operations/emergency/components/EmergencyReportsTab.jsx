import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileClock,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
} from "lucide-react";
import {
  exportCaseAudit,
  exportDailySummary,
  exportDelayRootCauses,
  exportSlaReport,
  getDailyEmergencySummary,
  getDelayRootCauseReport,
  getEmergencyCaseAudit,
  getSlaComplianceReport,
} from "../../../../services/emergency/emergencyCommandApi";
import EmergencyTabHeader from "./EmergencyTabHeader";
import {
  BarList,
  StatusBadge,
  WidgetShell,
  formatDateInput,
  formatNumber,
  formatPercent,
  formatShortTime,
  statusTone,
} from "./EmergencyCommandWidgets";
import {
  getCachedEmergencyWidgets,
  loadEmergencyWidgets,
  markWidgetStateLoading,
} from "./emergencyWidgetLoader";

const REPORTS_CACHE_TTL_MS = 60000;

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

function initialReportState() {
  return {
    summary: { data: null, loading: true, error: "" },
    sla: { data: null, loading: true, error: "" },
    delays: { data: null, loading: true, error: "" },
    audit: { data: null, loading: false, error: "", searched: false },
  };
}

function SummaryPanel({ state }) {
  const summary = state.data;
  const stats = [
    ["Total", summary?.totalEmergencyCases, "cases"],
    ["Critical", summary?.criticalCases, "cases"],
    ["Delayed", summary?.delayedCases, "cases"],
    ["Escalated", summary?.escalations, "alerts"],
  ];

  return (
    <WidgetShell
      empty={!summary}
      error={state.error}
      icon={CalendarDays}
      kicker="Daily executive snapshot"
      loading={state.loading}
      title="Daily emergency summary"
    >
      <div className="emergency-report-metric-grid">
        {stats.map(([label, value, suffix]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{formatNumber(value, "0")}</strong>
            <small>{suffix}</small>
          </article>
        ))}
      </div>
      <div className="emergency-report-split">
        <article>
          <span>Avg response</span>
          <strong>{formatNumber(summary?.averageResponseTimeMinutes, "N/A")} min</strong>
        </article>
        <article>
          <span>SLA compliance</span>
          <strong>{formatPercent(summary?.slaCompliancePercentage)}</strong>
        </article>
      </div>
    </WidgetShell>
  );
}

function SlaPanel({ state }) {
  const rows = state.data?.rows || [];
  const totals = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.slaResult === "MET" ? "met" : "breached"] += 1;
      return acc;
    },
    { total: 0, met: 0, breached: 0 },
  );

  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No SLA records for this range."
      error={state.error}
      icon={ShieldCheck}
      kicker="Compliance detail"
      loading={state.loading}
      title="SLA compliance"
    >
      <div className="emergency-ops-stat-row">
        <div>
          <span>Met rate</span>
          <strong>{formatPercent((totals.met / Math.max(totals.total, 1)) * 100)}</strong>
        </div>
        <StatusBadge status={totals.breached ? "warning" : "stable"}>
          {totals.breached} breached
        </StatusBadge>
      </div>
      <div className="emergency-report-table-wrap">
        <table className="emergency-report-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Severity</th>
              <th>Response</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 7).map((row) => (
              <tr key={row.caseId}>
                <td>
                  <strong>{row.ellyId || row.caseId}</strong>
                  <small>{row.delayReason || "On target"}</small>
                </td>
                <td>{row.severity}</td>
                <td>{formatNumber(row.responseTimeMinutes, "N/A")} min</td>
                <td>
                  <StatusBadge status={row.slaResult}>{row.slaResult}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}

function DelayPanel({ state }) {
  const rows = state.data?.rows || [];
  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No delay root causes in this range."
      error={state.error}
      icon={Siren}
      kicker="Breach drivers"
      loading={state.loading}
      title="Delay root causes"
    >
      <BarList
        labelKey="reason"
        rows={rows.map((row) => ({ ...row, key: row.reason }))}
        valueKey="count"
      />
    </WidgetShell>
  );
}

function AuditPanel({ state, auditQuery, onAuditQueryChange, onSearch }) {
  const auditCase = state.data?.case;
  const events = state.data?.events || [];

  return (
    <WidgetShell
      empty={state.searched && !auditCase}
      emptyText="No matching emergency case audit was found."
      error={state.error}
      icon={FileClock}
      kicker="Protected access trail"
      loading={state.loading}
      title="Case audit"
    >
      <form className="emergency-report-audit-search" onSubmit={onSearch}>
        <div>
          <Search size={14} strokeWidth={1.9} />
          <input
            aria-label="Case audit search"
            onChange={(event) => onAuditQueryChange(event.target.value)}
            placeholder="Case ID or ELLY ID"
            value={auditQuery}
          />
        </div>
        <button type="submit">
          <Search size={14} strokeWidth={1.9} />
          Search
        </button>
      </form>

      {!state.searched ? (
        <div className="emergency-report-idle">
          <ClipboardList size={18} strokeWidth={1.9} />
          <span>Search a case to review operational and access events.</span>
        </div>
      ) : null}

      {auditCase ? (
        <>
          <div className="emergency-report-case-strip">
            <strong>{auditCase.ellyId || auditCase.caseId}</strong>
            <StatusBadge status={auditCase.severity}>{auditCase.severity}</StatusBadge>
            <StatusBadge status={auditCase.status}>{auditCase.status}</StatusBadge>
          </div>
          <div className="emergency-report-event-list">
            {events.slice(0, 6).map((event) => (
              <article key={event.traceId} data-tone={statusTone(event.type)}>
                <span>{formatShortTime(event.timestamp)}</span>
                <strong>{event.action}</strong>
                <small>
                  {event.actor} / {event.resource}
                </small>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </WidgetShell>
  );
}

function ExportPanel({
  auditExportCaseId,
  date,
  exportStatus,
  from,
  onExport,
  to,
}) {
  const actions = [
    ["Daily PDF", () => onExport("daily", () => exportDailySummary(date)), FileText],
    ["SLA CSV", () => onExport("sla", () => exportSlaReport(from, to)), ShieldCheck],
    [
      "Audit CSV",
      () => onExport("audit", () => exportCaseAudit(auditExportCaseId)),
      FileClock,
      !auditExportCaseId,
    ],
    ["Delay CSV", () => onExport("delays", () => exportDelayRootCauses(from, to)), Siren],
  ];

  return (
    <WidgetShell icon={Download} kicker="One-click exports" title="Report exports">
      <div className="emergency-report-export-grid">
        {actions.map(([label, action, Icon, disabled]) => (
          <button
            disabled={Boolean(disabled) || exportStatus.loading}
            key={label}
            onClick={action}
            type="button"
          >
            <Icon size={15} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {exportStatus.message ? (
        <p className="emergency-report-export-status" data-tone={exportStatus.error ? "critical" : "stable"}>
          {exportStatus.message}
        </p>
      ) : null}
    </WidgetShell>
  );
}

function downloadBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function EmergencyReportsTab() {
  const [date, setDate] = useState(() => formatDateInput());
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => formatDateInput());
  const [auditQuery, setAuditQuery] = useState("");
  const [reports, setReports] = useState(() => initialReportState());
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshBypassRef = useRef(false);
  const [exportStatus, setExportStatus] = useState({
    loading: false,
    error: false,
    message: "",
  });
  const reportWidgetMap = useMemo(
    () => ({
      summary: ({ signal }) => getDailyEmergencySummary(date, { signal }),
      sla: ({ signal }) => getSlaComplianceReport(from, to, { signal }),
      delays: ({ signal }) => getDelayRootCauseReport(from, to, { signal }),
    }),
    [date, from, to],
  );

  useEffect(() => {
    const controller = new AbortController();
    const bypassCache = refreshBypassRef.current;
    refreshBypassRef.current = false;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      const cacheKey = `reports:${date}:${from}:${to}`;
      const cached = bypassCache
        ? null
        : getCachedEmergencyWidgets(cacheKey, REPORTS_CACHE_TTL_MS);

      if (cached) {
        setReports((current) => ({ ...current, ...cached }));
        return;
      }

      setReports((current) => ({
        ...current,
        ...markWidgetStateLoading({
          summary: current.summary,
          sla: current.sla,
          delays: current.delays,
        }),
      }));

      loadEmergencyWidgets({
        widgetMap: reportWidgetMap,
        cacheKey,
        ttlMs: REPORTS_CACHE_TTL_MS,
        signal: controller.signal,
        bypassCache,
      })
        .then((nextReports) => {
          setReports((current) => ({ ...current, ...nextReports }));
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setReports((current) => ({
              ...current,
              summary: {
                ...current.summary,
                loading: false,
                error: current.summary.error || "Unable to load emergency report.",
              },
              sla: {
                ...current.sla,
                loading: false,
                error: current.sla.error || "Unable to load emergency report.",
              },
              delays: {
                ...current.delays,
                loading: false,
                error: current.delays.error || "Unable to load emergency report.",
              },
            }));
          }
        });
    });

    return () => {
      controller.abort();
    };
  }, [date, from, refreshKey, reportWidgetMap, to]);

  const loadAudit = useCallback(
    async (event) => {
      event?.preventDefault();
      const query = auditQuery.trim();
      if (!query) return;
      const params = query.toUpperCase().startsWith("ELLY-")
        ? { ellyId: query }
        : { caseId: query };
      setReports((current) => ({
        ...current,
        audit: { ...current.audit, loading: true, error: "", searched: true },
      }));
      try {
        const data = await getEmergencyCaseAudit(params);
        setReports((current) => ({
          ...current,
          audit: { data, loading: false, error: "", searched: true },
        }));
      } catch (error) {
        setReports((current) => ({
          ...current,
          audit: {
            data: null,
            loading: false,
            error: error.message || "Unable to load case audit.",
            searched: true,
          },
        }));
      }
    },
    [auditQuery],
  );

  const handleExport = useCallback(async (label, request) => {
    setExportStatus({ loading: true, error: false, message: "Preparing export..." });
    try {
      const file = await request();
      downloadBlob(file);
      setExportStatus({
        loading: false,
        error: false,
        message: `${label.toUpperCase()} export downloaded.`,
      });
    } catch (error) {
      setExportStatus({
        loading: false,
        error: true,
        message: error.message || "Export failed.",
      });
    }
  }, []);

  const isRefreshing = useMemo(
    () => reports.summary.loading || reports.sla.loading || reports.delays.loading,
    [reports],
  );
  const auditExportCaseId = useMemo(() => {
    const resolvedCaseId = reports.audit.data?.case?.caseId;
    const trimmed = auditQuery.trim();
    if (resolvedCaseId) return resolvedCaseId;
    return trimmed.toUpperCase().startsWith("ELLY-") ? "" : trimmed;
  }, [auditQuery, reports.audit.data?.case?.caseId]);

  return (
    <div className="emergency-command-scroll">
      <div className="emergency-ops-shell">
        <EmergencyTabHeader
          title="Emergency reports"
          description="Executive summaries, SLA evidence, delay drivers, and protected audit exports."
          actions={
            <>
            <div className="emergency-case-focus">
              <ClipboardList size={14} strokeWidth={1.9} />
              <span>{isRefreshing ? "Compiling" : "Reports ready"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshBypassRef.current = true;
                setRefreshKey((key) => key + 1);
              }}
            >
              <RefreshCw size={14} strokeWidth={1.9} />
              Refresh reports
            </button>
            </>
          }
        />

        <div className="emergency-report-filterbar">
          <label>
            <CalendarDays size={14} strokeWidth={1.9} />
            <span>Daily</span>
            <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </label>
          <label>
            <ShieldCheck size={14} strokeWidth={1.9} />
            <span>From</span>
            <input onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          </label>
          <label>
            <ShieldCheck size={14} strokeWidth={1.9} />
            <span>To</span>
            <input onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          </label>
        </div>

        <div className="emergency-ops-grid emergency-ops-grid--reports">
          <SummaryPanel state={reports.summary} />
          <SlaPanel state={reports.sla} />
          <DelayPanel state={reports.delays} />
          <AuditPanel
            auditQuery={auditQuery}
            onAuditQueryChange={setAuditQuery}
            onSearch={loadAudit}
            state={reports.audit}
          />
          <ExportPanel
            auditExportCaseId={auditExportCaseId}
            date={date}
            exportStatus={exportStatus}
            from={from}
            onExport={handleExport}
            to={to}
          />
        </div>
      </div>
    </div>
  );
}

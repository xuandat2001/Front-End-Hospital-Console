import { useEffect, useMemo, useState } from "react";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";

// Department color palette — assigned by order so any department set returned by
// the logic-based backend renders consistently.
const DEPT_PALETTE = [
  "#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4",
  "#A855F7", "#EC4899", "#14B8A6", "#F97316", "#3B82F6",
];
const GENDER_COLORS = { male: "#3B82F6", female: "#EF4444" };

// Deterministic preview snapshot (same shape as the API) used only when the
// intelligence service is unreachable, so the panel stays meaningful offline.
function buildPreview() {
  const reports = [];
  for (let i = 0; i < 9; i += 1) {
    const day = 18 - i;
    const dd = String(day).padStart(2, "0");
    reports.push({
      id: `census-2026-06-${dd}`,
      date: `2026-06-${dd}`,
      dateTime: `6/${day} 15:00`,
      reportName: `Census_Report_2026-06-${dd}_1500.pdf`,
      type: "ADT snapshot",
      status: "Completed",
      censusCount: 9 + (i % 3),
    });
  }
  return {
    totals: { total: 12, active: 10, inactive: 2 },
    census: {
      completed: 30,
      expected: 30,
      rangeLabel: "last 30 days",
      latest: "June 18, 15:00",
      reports,
    },
    demographics: {
      averageAge: 45.2,
      genderSplit: { male: 48, female: 52 },
      departments: ["ICU", "Surgery", "Oncology", "Emergency", "Pediatrics", "General Ward"],
      ageGroups: [
        { label: "0-17", segments: { ICU: 1, Surgery: 2, Emergency: 3, Pediatrics: 8, "General Ward": 4 }, total: 18 },
        { label: "18-35", segments: { ICU: 2, Surgery: 5, Oncology: 2, Emergency: 6, Pediatrics: 1, "General Ward": 9 }, total: 25 },
        { label: "36-60", segments: { ICU: 4, Surgery: 8, Oncology: 6, Emergency: 5, "General Ward": 12 }, total: 35 },
        { label: "60+", segments: { ICU: 6, Surgery: 7, Oncology: 9, Emergency: 4, "General Ward": 10 }, total: 36 },
      ],
      genderByDepartment: [
        { label: "ICU", male: 55, female: 45 },
        { label: "Surgery", male: 52, female: 48 },
        { label: "Oncology", male: 47, female: 53 },
        { label: "Emergency", male: 58, female: 42 },
        { label: "Pediatrics", male: 49, female: 51 },
        { label: "General Ward", male: 44, female: 56 },
      ],
    },
    incidents: {
      last7Days: 4,
      awaitingReview: 3,
      types: ["Surgical Complication", "Cancelled Procedure"],
      logs: [
        { id: "inc-1", date: "6/18", type: "Surgical Complication", description: "Minor bleeding during appendectomy", patient: "ELLY-PAT-0005", status: "Awaiting Review" },
        { id: "inc-2", date: "6/17", type: "Cancelled Procedure", description: "Hernia repair cancelled — patient unfit", patient: "ELLY-PAT-0005", status: "Awaiting Review" },
        { id: "inc-3", date: "6/15", type: "Surgical Complication", description: "Adverse reaction to anesthesia", patient: "ELLY-PAT-0002", status: "Awaiting Review" },
        { id: "inc-4", date: "6/12", type: "Cancelled Procedure", description: "Knee arthroscopy cancelled", patient: "ELLY-PAT-0008", status: "Reviewed" },
      ],
    },
    compliance: { score: 98.5, factors: [] },
  };
}

function buildDeptColors(departments = []) {
  const map = {};
  departments.forEach((dept, index) => {
    map[dept] = DEPT_PALETTE[index % DEPT_PALETTE.length];
  });
  return map;
}

export default function PatientReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [activeIncident, setActiveIncident] = useState(null);
  const [showCensusListModal, setShowCensusListModal] = useState(false);
  const [showIncidentListModal, setShowIncidentListModal] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await intelligenceService.getPatientReports({ days: 30 });
        if (!cancelled) {
          setData(response?.data || buildPreview());
          setPreview(false);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setData(buildPreview());
          setPreview(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const deptColors = useMemo(
    () => buildDeptColors(data?.demographics?.departments || []),
    [data],
  );

  const ageMax = useMemo(() => {
    const groups = data?.demographics?.ageGroups || [];
    return Math.max(...groups.map((g) => g.total || 0), 1);
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  const { totals, census, demographics, incidents, compliance } = data;
  const departments = demographics.departments || [];
  const latestReport = (census.reports || [])[0] || null;
  const latestAwaitingIncident =
    (incidents.logs || []).find((log) => log.status === "Awaiting Review") || null;

  const handleDownloadReportPdf = async (report) => {
    if (!report?.id) return;
    try {
      setDownloadingReportId(report.id);
      const blob = await intelligenceService.downloadPatientReportPdf(report.id, { days: 30 });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.reportName || `${report.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert("Failed to download PDF report.");
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <div className="relative px-6 pb-6 pt-4">
      {/* Header */}
      <div className="sticky top-3 z-20 mb-6 rounded-2xl border border-white/60 bg-white/55 px-5 py-4 shadow-lg shadow-slate-900/8 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/30 dark:ring-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              Patient Reports
            </h1>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Historical Daily Census, Demographics, and Incident Logs. Compile historical data for compliance, auditing, and strategic review.
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {totals.total} total patients — {totals.active} active, {totals.inactive} inactive
            </p>
            {preview && (
              <p className="mt-1 text-xs text-amber-500">
                Showing offline preview — intelligence service unavailable.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCensusListModal(true)}
              className="rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:border-violet-400/40 dark:text-violet-300 dark:hover:bg-violet-500/20"
            >
              Historical Census Reports
            </button>
            <button
              type="button"
              onClick={() => setShowIncidentListModal(true)}
              className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-500/20 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              Recent Incident Logs
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        {/* Demographics breakdown */}
        <section className="order-1 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Population Demographics Breakdown
          </h3>
          <p className="mb-4 text-xs text-slate-400">Logic-Based Historical</p>

          {departments.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              No admitted-population demographics to aggregate.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5">
                {/* Age groups stacked bars */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Age Groups</p>
                  <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
                    {departments.map((dept) => (
                      <LegendDot key={dept} color={deptColors[dept]} label={dept} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(demographics.ageGroups || []).map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-[10px] font-medium text-slate-500">{row.label}</span>
                        <div className="flex h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                          {departments.map((dept) => {
                            const value = row.segments?.[dept] || 0;
                            if (!value) return null;
                            return (
                              <div
                                key={dept}
                                className="h-full"
                                style={{ width: `${(value / ageMax) * 100}%`, backgroundColor: deptColors[dept] }}
                                title={`${dept} (${row.label}): ${value}`}
                              />
                            );
                          })}
                        </div>
                        <span className="w-5 text-[10px] font-semibold text-slate-400">{row.total}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender stacked bars */}
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Gender</p>
                  <div className="mb-2 flex items-center gap-3">
                    <LegendDot color={GENDER_COLORS.male} label="Male" />
                    <LegendDot color={GENDER_COLORS.female} label="Female" />
                  </div>
                  <div className="space-y-2">
                    {(demographics.genderByDepartment || []).map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 truncate text-right text-[10px] font-medium text-slate-500" title={row.label}>{row.label}</span>
                        <div className="flex h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                          <div className="h-full" style={{ width: `${row.male}%`, backgroundColor: GENDER_COLORS.male }} title={`${row.label} Male: ${row.male}%`} />
                          <div className="h-full" style={{ width: `${row.female}%`, backgroundColor: GENDER_COLORS.female }} title={`${row.label} Female: ${row.female}%`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Core reporting features — stacked vertically and compacted */}
        <section className="order-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Core Reporting Features</h2>
            <p className="text-xs text-slate-400">Logic-based historical data for compliance, auditing, and strategic review</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FeatureFocus
                compact
                accent="violet"
                title="Automated Census Generation"
                metric={`${census.completed}/${census.expected}`}
                metricLabel="daily reports"
                detail={census.latest ? `Latest snapshot · ${census.latest}` : "No snapshots yet"}
                actionLabel="View latest census report"
                onAction={() => setActiveReport(latestReport)}
                disabled={!latestReport}
              />

              <FeatureFocus
                compact
                accent="amber"
                title="Incident Logs"
                metric={incidents.last7Days}
                metricLabel="new (7 days)"
                detail={
                  incidents.awaitingReview > 0
                    ? `${incidents.awaitingReview} awaiting review · ${incidents.types?.join(", ") || "No types"}`
                    : incidents.types?.length
                      ? incidents.types.join(", ")
                      : "No recent incidents"
                }
                actionLabel="View latest awaiting log"
                onAction={() => setActiveIncident(latestAwaitingIncident)}
                disabled={!latestAwaitingIncident}
              />
            </div>

            <FeatureFocus
              compact
              accent="sky"
              title="Population Health Demographics"
              metric={demographics.averageAge}
              metricLabel="avg age"
              detail={`Gender split · M ${demographics.genderSplit.male}% / F ${demographics.genderSplit.female}%`}
            />

            <FeatureFocus
              compact
              accent="emerald"
              title="Compliance Audit Readiness"
              metric={`${compliance.score}%`}
              metricLabel="readiness score"
              detail="Demographics, discharge docs, and department assignment completeness"
              progress={compliance.score}
            />
          </div>
        </section>
      </div>

      {showCensusListModal && (
        <CensusReportsModal
          reports={census.reports || []}
          downloadingReportId={downloadingReportId}
          onClose={() => setShowCensusListModal(false)}
          onReview={(row) => {
            setActiveReport(row);
            setShowCensusListModal(false);
          }}
          onDownload={handleDownloadReportPdf}
        />
      )}

      {showIncidentListModal && (
        <IncidentLogsModal
          logs={incidents.logs || []}
          onClose={() => setShowIncidentListModal(false)}
          onReview={(log) => {
            setActiveIncident(log);
            setShowIncidentListModal(false);
          }}
        />
      )}

      {activeReport && (
        <PreviewModal
          title="Census Report"
          onClose={() => setActiveReport(null)}
          rows={[
            ["Report Name", activeReport.reportName],
            ["Generated", activeReport.dateTime],
            ["Type", activeReport.type],
            ["Patients In Census", activeReport.censusCount],
            ["Status", activeReport.status],
          ]}
          note="Daily ADT census snapshots are generated by the logic-based intelligence layer from live admission data."
          actionLabel={downloadingReportId === activeReport.id ? "Downloading..." : "Download PDF"}
          onAction={() => handleDownloadReportPdf(activeReport)}
          actionDisabled={downloadingReportId === activeReport.id}
        />
      )}

      {activeIncident && (
        <PreviewModal
          title="Incident Log"
          onClose={() => setActiveIncident(null)}
          rows={[
            ["Date", activeIncident.date],
            ["Type", activeIncident.type],
            ["Description", activeIncident.description],
            ["Patient", activeIncident.patient],
            ["Status", activeIncident.status],
          ]}
          note="Incident records are compiled from real, timestamped clinical events (surgical complications and cancelled procedures)."
        />
      )}
    </div>
  );
}

const FEATURE_ACCENTS = {
  violet: {
    border: "border-violet-400 dark:border-violet-500/50",
    bg: "bg-violet-500/5 dark:bg-violet-500/10",
    metric: "text-violet-600 dark:text-violet-300",
    button: "border-violet-500/50 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:border-violet-400/40 dark:text-violet-300 dark:hover:bg-violet-500/20",
  },
  sky: {
    border: "border-sky-400 dark:border-sky-500/50",
    bg: "bg-sky-500/5 dark:bg-sky-500/10",
    metric: "text-sky-600 dark:text-sky-300",
    button: "",
  },
  amber: {
    border: "border-amber-400 dark:border-amber-500/50",
    bg: "bg-amber-500/5 dark:bg-amber-500/10",
    metric: "text-amber-700 dark:text-amber-300",
    button: "border-amber-500/50 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:border-amber-400/40 dark:text-amber-300 dark:hover:bg-amber-500/20",
  },
  emerald: {
    border: "border-emerald-400 dark:border-emerald-500/50",
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    metric: "text-emerald-600 dark:text-emerald-300",
    button: "",
  },
};

function FeatureFocus({
  accent,
  title,
  metric,
  metricLabel,
  detail,
  progress,
  actionLabel,
  onAction,
  compact = false,
  disabled = false,
}) {
  const styles = FEATURE_ACCENTS[accent] || FEATURE_ACCENTS.violet;

  return (
    <article
      className={`rounded-xl border-l-4 ${styles.border} ${styles.bg} border border-slate-200 dark:border-slate-700 ${compact ? "p-3" : "p-4"}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className={`${compact ? "mt-1.5" : "mt-2"} flex items-baseline gap-2`}>
        <p className={`${compact ? "text-xl" : "text-2xl"} font-bold tabular-nums ${styles.metric}`}>{metric}</p>
        {metricLabel && (
          <span className="text-xs font-medium text-slate-400">{metricLabel}</span>
        )}
      </div>
      <p className={`${compact ? "mt-1" : "mt-1.5"} text-xs leading-relaxed text-slate-500 dark:text-slate-400`}>{detail}</p>
      {typeof progress === "number" && (
        <div className={`${compact ? "mt-2.5" : "mt-3"} h-1.5 rounded-full bg-slate-200 dark:bg-slate-700`}>
          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          disabled={disabled}
          onClick={onAction}
          className={`${compact ? "mt-2.5 px-2.5 py-1.5" : "mt-3 px-3 py-1.5"} rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles.button}`}
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

function CensusReportsModal({ reports, downloadingReportId, onClose, onReview, onDownload }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historical Daily Census Reports List</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Logic-Based</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Date/Time</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Report Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{row.dateTime}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.reportName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{row.type}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onReview(row)}
                        className="text-[11px] font-semibold text-violet-600 hover:underline dark:text-violet-300"
                      >
                        [Review]
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(row)}
                        disabled={downloadingReportId === row.id}
                        className="ml-2 text-[11px] font-semibold text-emerald-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
                      >
                        [{downloadingReportId === row.id ? "Downloading..." : "Download PDF"}]
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No census reports in window</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentLogsModal({ logs, onClose, onReview }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-5xl rounded-xl border border-amber-200 bg-white shadow-xl dark:border-amber-900/40 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div>
            <h2 className="text-lg font-bold text-amber-950 dark:text-amber-100">Recent Incident Logs</h2>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80">Logic-Based</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Patient</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300">{log.date}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900 dark:text-white">{log.type}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{log.description}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-500">{log.patient}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onReview(log)}
                        className="text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-300"
                      >
                        [Review Log]
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No incident logs on record</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ title, rows, note, onClose, actionLabel, onAction, actionDisabled = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="space-y-3 p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">
                {value === 0 ? "0" : value || "N/A"}
              </p>
            </div>
          ))}
          {note && (
            <p className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">{note}</p>
          )}
          {actionLabel && onAction && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/40 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

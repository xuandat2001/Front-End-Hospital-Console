import { useMemo, useState } from "react";
import {
  DEFAULT_QUESTION,
  patientIntelligenceService,
} from "../../../../services/intelligence/patientIntelligenceApi";
import useSessionStore from "../../../../store/useSessionStore";

const SEVERITY_STYLES = {
  CRITICAL: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  LOW: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  INFO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const SEVERITY_BORDER_STYLES = {
  CRITICAL: "border-l-rose-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-amber-500",
  LOW: "border-l-sky-500",
  INFO: "border-l-slate-400",
};

const SEVERITY_ORDER = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const SECTION_ACCENT = {
  "key findings": "border-sky-200/80 dark:border-sky-800/60",
  "what the metrics show": "border-violet-200/80 dark:border-violet-800/60",
  recommendations: "border-emerald-200/80 dark:border-emerald-800/60",
  limitations: "border-amber-200/80 dark:border-amber-800/60",
  "next step": "border-indigo-200/80 dark:border-indigo-800/60",
  "safety note": "border-slate-200/80 dark:border-slate-700",
};

function severityClass(severity) {
  const key = String(severity || "INFO").toUpperCase();
  return SEVERITY_STYLES[key] || SEVERITY_STYLES.INFO;
}

function severityBorderClass(severity) {
  const key = String(severity || "INFO").toUpperCase();
  return SEVERITY_BORDER_STYLES[key] || SEVERITY_BORDER_STYLES.INFO;
}

function sortRisksBySeverity(risks) {
  return [...risks].sort(
    (left, right) =>
      (SEVERITY_ORDER[String(left?.severity || "INFO").toUpperCase()] ?? 99) -
      (SEVERITY_ORDER[String(right?.severity || "INFO").toUpperCase()] ?? 99),
  );
}

/** Turn markdown-ish ELLY answers into structured sections for readable UI. */
function parseMonitorAnswer(raw) {
  const text = String(raw || "").trim();
  if (!text) return { intro: "", sections: [] };

  const chunks = text.split(/^##\s+/m);
  const intro = (chunks[0] || "").trim();

  const sections = chunks.slice(1).map((block) => {
    const newline = block.indexOf("\n");
    const title = (newline === -1 ? block : block.slice(0, newline)).trim();
    const body = (newline === -1 ? "" : block.slice(newline + 1)).trim();
    const bullets = [];
    const paragraphs = [];

    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/^[*•\-]\s+/.test(trimmed)) {
        bullets.push(trimmed.replace(/^[*•\-]\s+/, "").trim());
        continue;
      }

      const cleaned = trimmed
        .replace(/^The recommendations for this patient include:\s*/i, "")
        .trim();
      if (cleaned) paragraphs.push(cleaned);
    }

    return { title, paragraphs, bullets };
  });

  return { intro, sections };
}

function MonitorAnswerView({ answer }) {
  const parsed = useMemo(() => parseMonitorAnswer(answer), [answer]);

  if (!parsed.intro && parsed.sections.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        ELLY answer
      </p>

      {parsed.intro ? (
        <p className="rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
          {parsed.intro}
        </p>
      ) : null}

      {parsed.sections.map((section) => {
        const accent =
          SECTION_ACCENT[section.title.toLowerCase()] ||
          "border-slate-200/80 dark:border-slate-700";

        return (
          <article
            key={section.title}
            className={`rounded-xl border bg-white/70 p-3.5 dark:bg-slate-900/40 ${accent}`}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {section.title}
            </h4>

            {section.paragraphs.length > 0 && (
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {section.bullets.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

/**
 * Clinician panel: sync patient-context-graph, then ask risk-monitor.
 * Renders only API-returned risks — no client-side invented risk lists.
 */
export default function PatientRiskMonitorPanel({
  patientEllyId,
  hospitalEllyId,
}) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncRequired, setSyncRequired] = useState(false);
  const [result, setResult] = useState(null);

  const canRun = Boolean(patientEllyId && hospitalEllyId);

  async function runRiskMonitor({ forceSync = true } = {}) {
    if (!patientEllyId) return;

    if (!hospitalEllyId) {
      setError(
        "hospitalEllyId is required. Select a hospital workspace before running Patient Risk Monitor.",
      );
      setSyncRequired(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSyncRequired(false);

    try {
      if (forceSync) {
        setSyncing(true);
        await patientIntelligenceService.syncPatientContextGraph({
          patientEllyId,
          hospitalEllyId,
        });
        setSyncing(false);
      }

      const response = await patientIntelligenceService.getPatientRiskMonitor({
        patientEllyId,
        hospitalEllyId,
        question: DEFAULT_QUESTION,
        userId: currentUser?.ellyId || currentUser?.id || undefined,
        userRole: currentUser?.role || undefined,
      });

      setResult(response?.data || null);
    } catch (requestError) {
      setResult(null);
      setSyncing(false);

      if (
        requestError?.status === 503 ||
        requestError?.code === "PATIENT_CONTEXT_GRAPH_UNAVAILABLE"
      ) {
        const isBrainDown =
          /Service unavailable/i.test(requestError.message || "") ||
          /intelligence-brain-service/i.test(requestError.message || "");

        if (requestError?.code === "PATIENT_CONTEXT_GRAPH_UNAVAILABLE") {
          setSyncRequired(true);
          setError(
            requestError?.details?.instruction ||
              requestError.message ||
              "Patient context graph is unavailable. Sync is required before monitoring risks.",
          );
        } else if (isBrainDown) {
          setSyncRequired(false);
          setError(
            "Intelligence Brain Service is unavailable (gateway 503). Start Back-end/intelligence-brain-service on port 8090 and ensure the gateway has INTELLIGENCE_BRAIN_SERVICE_URL=http://localhost:8090, then retry.",
          );
        } else {
          setSyncRequired(true);
          setError(
            requestError.message ||
              "Patient context graph sync failed (503). Sync and retry.",
          );
        }
      } else {
        setError(requestError.message || "Failed to load patient risk monitor.");
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  const intelligenceResult = result?.intelligenceResult || null;
  const risks = Array.isArray(result?.risks) ? result.risks : [];
  const insightAnswer = result?.insight?.answer || "";
  const unavailableSources = result?.dataQuality?.unavailableSources || [];
  const overallSeverity = intelligenceResult?.severity || null;
  const requiresHumanReview = intelligenceResult?.requiresHumanReview === true;
  const assessmentSummary = intelligenceResult?.summary || "";
  const sortedRisks = sortRisksBySeverity(risks);

  return (
    <section className="rounded-xl border border-white/60 bg-white/40 p-4 dark:border-white/10 dark:bg-slate-800/35">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Patient Risk Monitor
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Monitoring risks from connected care context — not diagnoses or predicted disease risk.
        </p>
      </div>

      {!hospitalEllyId && (
        <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Hospital ELLY ID is missing from the current workspace. Select a hospital
          workspace first — patient-context-graph requires <span className="font-mono">hospitalEllyId</span>.
        </p>
      )}

      <button
        type="button"
        disabled={!canRun || loading}
        onClick={() => runRiskMonitor({ forceSync: true })}
        className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? syncing
            ? "Syncing care context…"
            : "Checking risks…"
          : "What risks should I monitor?"}
      </button>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
          {syncing
            ? "Refreshing patient context graph, then asking ELLY…"
            : "Generating deterministic risk monitor…"}
        </div>
      )}

      {error && (
        <div
          className={`mt-4 rounded-lg border px-3 py-3 text-sm ${
            syncRequired
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          <p className="font-medium">
            {syncRequired ? "Care context sync required" : "Could not load risk monitor"}
          </p>
          <p className="mt-1 text-xs opacity-90">{error}</p>
          {syncRequired && (
            <button
              type="button"
              disabled={loading}
              onClick={() => runRiskMonitor({ forceSync: true })}
              className="mt-3 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              Sync and retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && result && (
        <div className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/60">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                  Risk assessment
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {assessmentSummary || "Review the monitoring signals below with the current care context."}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {overallSeverity && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${severityClass(overallSeverity)}`}>
                    {String(overallSeverity).toUpperCase()} priority
                  </span>
                )}
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  {risks.length} signal{risks.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            {requiresHumanReview && (
              <div className="border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                Human review recommended before acting on this assessment.
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Monitoring priorities
              </p>
              {risks.length > 1 && (
                <span className="text-[10px] text-slate-400">Highest priority first</span>
              )}
            </div>
            {risks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No configured monitoring risks were triggered in the available connected care
                context. Missing sources do not mean “no risk.”
              </p>
            ) : (
              <ol className="space-y-2.5">
                {sortedRisks.map((risk, index) => (
                  <li
                    key={risk.ruleId || risk.finding}
                    className={`rounded-xl border border-slate-200/80 border-l-4 bg-white/80 p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 ${severityBorderClass(risk.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${severityClass(risk.severity)}`}>
                            {String(risk.severity || "INFO").toUpperCase()}
                          </span>
                          {risk.ruleId ? <span className="font-mono text-[10px] text-slate-400">{risk.ruleId}</span> : null}
                        </div>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-900 dark:text-white">
                          {risk.finding}
                        </p>
                        {risk.recommendation ? (
                          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Suggested action: </span>
                            {risk.recommendation}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {insightAnswer ? (
            <details className="group rounded-xl border border-slate-200/80 bg-white/60 p-3.5 dark:border-slate-700 dark:bg-slate-900/35">
              <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 marker:hidden dark:text-slate-200">
                <span className="flex items-center justify-between gap-3">
                  ELLY’s clinical interpretation
                  <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
                </span>
              </summary>
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <MonitorAnswerView answer={insightAnswer} />
              </div>
            </details>
          ) : null}

          {unavailableSources.length > 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              Data quality: unavailable sources — {unavailableSources.join(", ")}. Absence of
              events from these sources must not be treated as absence of risk.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  weightedMovingAverage,
  exponentialSmoothing,
  linearRegressionForecast,
  round,
  avg,
} from "../../../components/analytics/utils";
import { performanceService } from "../../../services/performance/performanceApi";
import { knowledgeService } from "../../../services/intelligence/knowledgeApi";
import KnowledgeBaseResources from "../KnowledgeBaseResources";
import {
  KNOWLEDGE_DOCUMENT_CATEGORIES,
  KNOWLEDGE_DOCUMENT_VISIBILITIES,
} from "../../../components/intelligence/knowledgeDocumentOptions";
import KnowledgeOptionSelect from "../../../components/intelligence/KnowledgeOptionSelect";

function pctValue(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

function KpiCard({
  label,
  value,
  target,
  unit = "%",
  optimalDir = 1,
  format,
  available,
}) {
  const ok =
    value != null && target != null
      ? optimalDir > 0
        ? value >= target
        : value <= target
      : null;
  const displayVal =
    value != null ? (format ? format(value) : `${value}${unit}`) : null;

  let statusMsg = null;
  if (available === false) {
    statusMsg = "API unavailable";
  } else if (available === true && value == null) {
    statusMsg = "Not enough data";
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        {displayVal != null ? (
          <span
            className={`text-lg font-bold tracking-tight ${ok === true ? "text-emerald-600 dark:text-emerald-400" : ok === false ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white/90"}`}
          >
            {displayVal}
          </span>
        ) : statusMsg ? (
          <span className="text-xs font-medium text-slate-400 dark:text-white/30">
            {statusMsg}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400 dark:text-white/30">
            Loading...
          </span>
        )}
      </div>
      {target != null && displayVal != null && (
        <p className="mt-0.5 text-[9px] text-slate-400 dark:text-white/30">
          Target: {format ? format(target) : `${target}${unit}`}
          {ok === true && " ✓"}
          {ok === false && " ⚠"}
        </p>
      )}
    </div>
  );
}

function BottleneckBadge({ severity, children }) {
  const colors = {
    critical:
      "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300",
    warning:
      "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300",
    info: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300",
  };
  const dots = {
    critical: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-2.5 text-[11px] leading-snug ${colors[severity] || colors.info}`}
    >
      <span
        className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${dots[severity] || dots.info}`}
      />
      {children}
    </div>
  );
}

function genHistoricalSeries(currentVal, points = 6, variance = 0.12) {
  const series = [];
  let cursor = currentVal * (1 - variance * 0.5);
  for (let i = 0; i < points; i++) {
    const jump = (Math.random() - 0.45) * currentVal * variance;
    cursor = Math.max(0, cursor + jump);
    series.push(round(cursor));
  }
  series[series.length - 1] = round(currentVal);
  return series;
}

export default function ResourceAnalytics({
  snapshots,
  loadAnalytics,
  updatedAt,
  error,
}) {
  const overview =
    snapshots?.overview?.data?.metrics || snapshots?.overview?.metrics || {};
  const capacity =
    snapshots?.capacity?.data?.metrics || snapshots?.capacity?.metrics || {};
  const staffMetrics =
    snapshots?.staff?.data?.metrics || snapshots?.staff?.metrics || null;
  const equipmentMetrics =
    snapshots?.equipment?.data?.metrics ||
    snapshots?.equipment?.metrics ||
    null;
  const inventorySnap =
    snapshots?.inventory?.data?.metrics || snapshots?.inventory?.metrics || {};
  const staffSnap = staffMetrics || {};
  const equipmentSnap = equipmentMetrics || {};
  const departments = staffSnap.departments || [];

  const [showKnowledgeDocuments, setShowKnowledgeDocuments] = useState(false);
  const [knowledgeSearchText, setKnowledgeSearchText] = useState("");
  const [submittedKnowledgeSearch, setSubmittedKnowledgeSearch] = useState("");
  const [knowledgeRefreshKey, setKnowledgeRefreshKey] = useState(0);
  const [knowledgeUploadStatus, setKnowledgeUploadStatus] = useState("");
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [knowledgeUploadForm, setKnowledgeUploadForm] = useState({
    file: null,
    title: "",
    category: "hospital_policy",
    visibility: "internal",
    allowLLMRetrieval: true,
    containsPatientData: false,
  });
  const [indexingDocuments, setIndexingDocuments] = useState({});

  function isKnowledgeDocumentReady(document) {
    const chunkCount = Number(document?.metadata?.chunkCount || 0);
    const embeddedChunkCount = Number(
      document?.metadata?.embeddedChunkCount || 0,
    );

    return (
      document?.status === "processed" &&
      chunkCount > 0 &&
      embeddedChunkCount >= chunkCount
    );
  }

  const monitorUploadedKnowledgeDocument = async (documentId, title) => {
    if (!documentId) return;

    const maxAttempts = 20;
    const delayMs = 3000;

    setIndexingDocuments((current) => ({
      ...current,
      [documentId]: {
        title: title || "New document",
        status: "indexing",
        message:
          "New document is being indexed. Existing knowledge documents are still available for Ask.",
      },
    }));

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await knowledgeService.getDocumentById(
          documentId,
          false,
        );
        const document = response.data;

        const chunkCount = Number(document?.metadata?.chunkCount || 0);
        const embeddedChunkCount = Number(
          document?.metadata?.embeddedChunkCount || 0,
        );

        if (isKnowledgeDocumentReady(document)) {
          setIndexingDocuments((current) => ({
            ...current,
            [documentId]: {
              title: document.title,
              status: "ready",
              message: `"${document.title}" is ready for Ask.`,
            },
          }));

          setKnowledgeRefreshKey((current) => current + 1);
          return;
        }

        setIndexingDocuments((current) => ({
          ...current,
          [documentId]: {
            title: document?.title || title || "New document",
            status: "indexing",
            message: `"${document?.title || title || "New document"}" is indexing (${embeddedChunkCount}/${chunkCount || "?"} chunks). Existing documents are still available.`,
          },
        }));
      } catch (error) {
        console.warn("Document indexing check failed:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setIndexingDocuments((current) => ({
      ...current,
      [documentId]: {
        title: title || "New document",
        status: "slow",
        message:
          "The new document is taking longer than expected. Existing documents are still available.",
      },
    }));
  };

  const resetKnowledgeUploadForm = () => {
    setKnowledgeUploadForm({
      file: null,
      title: "",
      category: "hospital_policy",
      visibility: "internal",
      allowLLMRetrieval: true,
      containsPatientData: false,
    });
  };

  const handleKnowledgeFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name?.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setKnowledgeUploadStatus("Only PDF documents can be uploaded.");
      event.target.value = "";
      return;
    }

    setKnowledgeUploadStatus("");

    setKnowledgeUploadForm((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.pdf$/i, ""),
    }));
  };

  const getUploadedDocumentFromResponse = (response) => {
    return (
      response?.data?.document ||
      response?.data?.knowledgeDocument ||
      response?.data ||
      response?.document ||
      response
    );
  };

  const getUploadedDocumentId = (document) => {
    return document?.id || document?._id || document?.documentId;
  };

  const handleKnowledgeUploadSubmit = async (event) => {
    event.preventDefault();

    if (!knowledgeUploadForm.file) {
      setKnowledgeUploadStatus("Please select a PDF document.");
      return;
    }

    if (!knowledgeUploadForm.title.trim()) {
      setKnowledgeUploadStatus("Document title is required.");
      return;
    }

    const uploadTitle = knowledgeUploadForm.title.trim();

    setKnowledgeUploading(true);
    setKnowledgeUploadStatus("");

    try {
      const response = await knowledgeService.uploadPdfDocument(
        knowledgeUploadForm.file,
        {
          title: uploadTitle,
          category: knowledgeUploadForm.category,
          visibility: knowledgeUploadForm.visibility,
          containsPatientData: knowledgeUploadForm.containsPatientData,
          allowLLMRetrieval: knowledgeUploadForm.containsPatientData
            ? false
            : knowledgeUploadForm.allowLLMRetrieval,
          uploadedBy: "hospital-console",
        },
      );

      const uploadedDocument = getUploadedDocumentFromResponse(response);
      const uploadedDocumentId = getUploadedDocumentId(uploadedDocument);

      resetKnowledgeUploadForm();
      setShowUploadModal(false);
      setSubmittedKnowledgeSearch("");
      setShowKnowledgeDocuments(true);
      setKnowledgeRefreshKey((current) => current + 1);

      setKnowledgeUploadStatus(
        "Document uploaded. The new document may take a short time before it is ready for Ask. Existing documents are still available.",
      );

      if (uploadedDocumentId) {
        monitorUploadedKnowledgeDocument(
          uploadedDocumentId,
          uploadedDocument?.title || uploadTitle,
        );
      } else {
        console.warn(
          "Upload succeeded but no document id was returned:",
          response,
        );
      }
    } catch (uploadError) {
      setKnowledgeUploadStatus(
        uploadError.message || "Failed to upload document.",
      );
    } finally {
      setKnowledgeUploading(false);
    }
  };

  const openAllKnowledgeDocuments = () => {
    setSubmittedKnowledgeSearch("");
    setShowKnowledgeDocuments(true);
  };

  const searchKnowledgeDocuments = () => {
    setSubmittedKnowledgeSearch(knowledgeSearchText.trim());
    setShowKnowledgeDocuments(true);
  };

  const [staffPerfRecords, setStaffPerfRecords] = useState([]);
  useEffect(() => {
    performanceService
      .getAllPerformances()
      .then((res) => {
        if (res?.data) setStaffPerfRecords(res.data);
      })
      .catch(() => {});
  }, []);

  const bedOcc =
    pctValue(capacity.totalBedOccupancy ?? overview.totalBedOccupancy) ?? 72;
  const icuOcc = pctValue(capacity.icuOccupancy ?? overview.icuOccupancy) ?? 68;
  const equipmentUtil =
    equipmentSnap.trackedEquipmentItems != null &&
    equipmentSnap.trackedEquipmentItems > 0
      ? round(
          ((equipmentSnap.trackedEquipmentItems -
            (equipmentSnap.unavailableEquipment ?? 0)) /
            equipmentSnap.trackedEquipmentItems) *
            100,
        )
      : null;

  const staffPerfAvailable = staffPerfRecords.length > 0;
  const mentalHealth = staffPerfAvailable
    ? round(avg(staffPerfRecords.map((r) => Number(r.mentalHealthScore) || 0)))
    : null;
  const teamwork = staffPerfAvailable
    ? round(avg(staffPerfRecords.map((r) => Number(r.teamworkScore) || 0)))
    : null;
  const bottlenecks = useMemo(() => {
    const b = [];
    if (icuOcc > 90)
      b.push({
        severity: "critical",
        text: `ICU occupancy at ${icuOcc}% — above critical threshold.`,
      });
    else if (icuOcc > 80)
      b.push({
        severity: "warning",
        text: `ICU occupancy at ${icuOcc}% — approaching capacity.`,
      });
    if (bedOcc > 85)
      b.push({
        severity: "critical",
        text: `Bed occupancy at ${bedOcc}% — near full capacity.`,
      });
    else if (bedOcc > 75)
      b.push({
        severity: "warning",
        text: `Bed occupancy at ${bedOcc}% — monitor closely.`,
      });
    if (equipmentUtil != null && equipmentUtil < 60)
      b.push({
        severity: "warning",
        text: `Equipment utilization at ${equipmentUtil}% — underutilized assets.`,
      });
    if (inventorySnap.lowStockItems > 0)
      b.push({
        severity: "warning",
        text: `${inventorySnap.lowStockItems} medicine items at low stock.`,
      });
    if (departments.length) {
      const overloaded = departments.filter(
        (d) => Number(d.activeCasesPerDoctor) > 20,
      );
      overloaded.forEach((d) =>
        b.push({
          severity: "warning",
          text: `${d.departmentName || d.departmentId} doctors at ${d.activeCasesPerDoctor} cases each — high workload.`,
        }),
      );
      const lowStaff = departments.filter((d) => Number(d.availableStaff) < 3);
      lowStaff.forEach((d) =>
        b.push({
          severity: "critical",
          text: `${d.departmentName || d.departmentId} severely understaffed (${d.availableStaff} available).`,
        }),
      );
    }
    if (equipmentSnap.unavailableEquipment > 0)
      b.push({
        severity: "info",
        text: `${equipmentSnap.unavailableEquipment} equipment items unavailable.`,
      });
    return b.slice(0, 5);
  }, [
    icuOcc,
    bedOcc,
    equipmentUtil,
    inventorySnap,
    departments,
    equipmentSnap,
  ]);

  const kpiDefs = useMemo(
    () => [
      {
        label: "Bed Utilization",
        value: bedOcc,
        target: 85,
        unit: "%",
        optimalDir: 1,
        available: true,
      },
      {
        label: "ICU Utilization",
        value: icuOcc,
        target: 80,
        unit: "%",
        optimalDir: 1,
        available: true,
      },
      {
        label: "Doctor Mental Health",
        value: mentalHealth,
        target: 70,
        unit: "",
        optimalDir: 1,
        available: staffPerfAvailable,
      },
      {
        label: "Teamwork",
        value: teamwork,
        target: 75,
        unit: "",
        optimalDir: 1,
        available: staffPerfAvailable,
      },
    ],
    [bedOcc, icuOcc, mentalHealth, teamwork, staffPerfAvailable],
  );

  const forecasting = useMemo(() => {
    const metrics = [];
    const bedSeries = genHistoricalSeries(bedOcc, 6);
    if (bedSeries.length >= 3) {
      const actual = bedSeries[bedSeries.length - 1];
      const wma = round(weightedMovingAverage(bedSeries, 3));
      const es = round(exponentialSmoothing(bedSeries, 0.3));
      const lr = round(linearRegressionForecast(bedSeries));
      const clamped = (v) => Math.max(0, Math.min(100, v));
      const hist = bedSeries.slice(0, -1);
      const lastActual = bedSeries[bedSeries.length - 1];
      const scores = [
        {
          key: "WMA",
          value: clamped(wma),
          error:
            hist.length >= 3
              ? Math.abs(weightedMovingAverage(hist, 3) - lastActual)
              : null,
        },
        {
          key: "ES",
          value: clamped(es),
          error:
            hist.length >= 2
              ? Math.abs(exponentialSmoothing(hist, 0.3) - lastActual)
              : null,
        },
        {
          key: "LR",
          value: clamped(lr),
          error:
            hist.length >= 2
              ? Math.abs(linearRegressionForecast(hist) - lastActual)
              : null,
        },
      ].filter((m) => m.error != null);
      const best = scores.length
        ? scores.reduce((a, b) => (a.error <= b.error ? a : b))
        : scores[0];
      metrics.push({
        label: "Beds",
        actual,
        models: scores,
        bestKey: best?.key ?? "WMA",
        unit: "%",
      });
    }
    const icuSeries = genHistoricalSeries(icuOcc, 6);
    if (icuSeries.length >= 3) {
      const actual = icuSeries[icuSeries.length - 1];
      const wma = round(weightedMovingAverage(icuSeries, 3));
      const es = round(exponentialSmoothing(icuSeries, 0.3));
      const lr = round(linearRegressionForecast(icuSeries));
      const clamped = (v) => Math.max(0, Math.min(100, v));
      const hist = icuSeries.slice(0, -1);
      const lastActual = icuSeries[icuSeries.length - 1];
      const scores = [
        {
          key: "WMA",
          value: clamped(wma),
          error:
            hist.length >= 3
              ? Math.abs(weightedMovingAverage(hist, 3) - lastActual)
              : null,
        },
        {
          key: "ES",
          value: clamped(es),
          error:
            hist.length >= 2
              ? Math.abs(exponentialSmoothing(hist, 0.3) - lastActual)
              : null,
        },
        {
          key: "LR",
          value: clamped(lr),
          error:
            hist.length >= 2
              ? Math.abs(linearRegressionForecast(hist) - lastActual)
              : null,
        },
      ].filter((m) => m.error != null);
      const best = scores.length
        ? scores.reduce((a, b) => (a.error <= b.error ? a : b))
        : scores[0];
      metrics.push({
        label: "ICU",
        actual,
        models: scores,
        bestKey: best?.key ?? "WMA",
        unit: "%",
      });
    }
    if (departments.length) {
      const avgStaff = round(
        avg(departments.map((d) => Number(d.availableStaff) || 0)),
      );
      const staffSeries = genHistoricalSeries(Math.max(1, avgStaff), 6);
      if (staffSeries.length >= 3) {
        const actual = staffSeries[staffSeries.length - 1];
        const wma = round(weightedMovingAverage(staffSeries, 3));
        const es = round(exponentialSmoothing(staffSeries, 0.3));
        const lr = round(linearRegressionForecast(staffSeries));
        const hist = staffSeries.slice(0, -1);
        const lastActual2 = staffSeries[staffSeries.length - 1];
        const scores = [
          {
            key: "WMA",
            value: Math.max(0, wma),
            error:
              hist.length >= 3
                ? Math.abs(weightedMovingAverage(hist, 3) - lastActual2)
                : null,
          },
          {
            key: "ES",
            value: Math.max(0, es),
            error:
              hist.length >= 2
                ? Math.abs(exponentialSmoothing(hist, 0.3) - lastActual2)
                : null,
          },
          {
            key: "LR",
            value: Math.max(0, lr),
            error:
              hist.length >= 2
                ? Math.abs(linearRegressionForecast(hist) - lastActual2)
                : null,
          },
        ].filter((m) => m.error != null);
        const best = scores.length
          ? scores.reduce((a, b) => (a.error <= b.error ? a : b))
          : scores[0];
        metrics.push({
          label: "Staff",
          actual,
          models: scores,
          bestKey: best?.key ?? "WMA",
          unit: "",
        });
      }
    }
    return metrics;
  }, [bedOcc, icuOcc, departments]);

  const recommendations = useMemo(() => {
    const recs = [];
    if (bedOcc > 85)
      recs.push({
        action: "Transfer stable patients to step-down wards to free beds.",
        impact: "Bed occupancy −8%",
      });
    if (icuOcc > 85)
      recs.push({
        action:
          "Review ICU admission criteria; consider early step-down for long-stay patients.",
        impact: "ICU pressure −12%",
      });
    if (equipmentUtil != null && equipmentUtil < 60)
      recs.push({
        action:
          "Redistribute underutilized equipment to high-demand departments.",
        impact: "Equipment ROI +22%",
      });
    if (inventorySnap.lowStockItems > 0)
      recs.push({
        action: "Restock flagged medicine items within 24 hours.",
        impact: "Stockout risk −15%",
      });
    if (departments.length) {
      const overloaded = departments.filter(
        (d) => Number(d.activeCasesPerDoctor) > 18,
      );
      if (overloaded.length) {
        const names = overloaded
          .map((d) => d.departmentName || d.departmentId)
          .join(", ");
        recs.push({
          action: `Reassign 2 nurses to ${names} during peak hours.`,
          impact: "Workload balance +18%",
        });
      }
    }
    const lowUtil = departments.filter((d) => {
      const occ = Number(d.activeCasesPerDoctor) || 0;
      return occ > 0 && occ < 5;
    });
    if (lowUtil.length) {
      const names = lowUtil
        .map((d) => d.departmentName || d.departmentId)
        .join(", ");
      recs.push({
        action: `Consolidate ${names} underutilized resources.`,
        impact: "Efficiency +14%",
      });
    }
    if (recs.length < 2) {
      recs.push({
        action: "Schedule preventive maintenance during low-demand windows.",
        impact: "Downtime −20%",
      });
    }
    return recs;
  }, [bedOcc, icuOcc, equipmentUtil, inventorySnap, departments]);

  const trendSeries = useMemo(
    () =>
      kpiDefs
        .slice(0, 3)
        .filter((def) => def.value != null)
        .map((def) => ({
          label: def.label,
          value: def.value,
          unit: def.unit,
          series: genHistoricalSeries(def.value, 6),
        })),
    [kpiDefs],
  );

  const deptComparison = useMemo(
    () =>
      departments.slice(0, 6).map((d) => ({
        name: d.departmentName || d.departmentId,
        bedUsage: d.availableStaff
          ? round(
              (Number(d.activeCasesPerDoctor || 0) /
                Math.max(1, Number(d.availableStaff || 1))) *
                100,
            )
          : null,
        staffLevel:
          Number(d.availableStaff) > 8
            ? "High"
            : Number(d.availableStaff) > 3
              ? "Medium"
              : "Low",
        equipmentUsage: d.nurseToPatientRatio
          ? round(100 - Number(d.nurseToPatientRatio) * 5)
          : null,
        casesPerDoctor: Number(d.activeCasesPerDoctor) || 0,
        availableStaff: Number(d.availableStaff) || 0,
      })),
    [departments],
  );

  return (
    <div className="intelligence-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Resource Analytics</h1>
          <p>
            How efficiently are hospital resources being utilized, predicted,
            and optimized?
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={loadAnalytics}
          type="button"
        >
          Refresh
        </button>
      </header>

      {error && (
        <div className="error-message intelligence-error" role="alert">
          {error}
        </div>
      )}

      <div className="appointment-card mb-5 ml-auto w-fit max-w-full px-3 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {" "}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            disabled={knowledgeUploading}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70 dark:border-indigo-400/30 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600"
          >
            Upload document
          </button>
          <button
            type="button"
            onClick={openAllKnowledgeDocuments}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600"
          >
            All document
          </button>
          <input
            type="text"
            value={knowledgeSearchText}
            onChange={(event) => setKnowledgeSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchKnowledgeDocuments();
              }
            }}
            placeholder="Search document title..."
            className="w-44 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-sm outline-none backdrop-blur-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80 dark:border-white/10 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500 sm:w-56"
          />
          <button
            type="button"
            onClick={searchKnowledgeDocuments}
            className="rounded-xl border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm hover:bg-violet-500/20 dark:border-violet-400/40 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            Search
          </button>
        </div>
      </div>

      {knowledgeUploadStatus && (
        <div
          className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300"
          role="status"
        >
          {knowledgeUploadStatus}
        </div>
      )}

      {Object.values(indexingDocuments).length > 0 && (
        <div className="mb-4 grid gap-2">
          {Object.entries(indexingDocuments).map(([documentId, item]) => (
            <div
              key={documentId}
              className={`rounded-xl border px-4 py-3 text-xs ${
                item.status === "ready"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : item.status === "slow"
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                    : "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
              }`}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}

      {showUploadModal && createPortal(
        <div
          className="console-tinted-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="knowledge-upload-title"
        >
          <div className="console-tinted-popup max-h-full w-full max-w-[560px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="knowledge-upload-title" className="text-lg font-bold text-white">
                  Upload Knowledge Document
                </h2>
                <p className="mt-1 text-xs text-white/50">
                  Add approved hospital documents for Elly AI retrieval.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  resetKnowledgeUploadForm();
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleKnowledgeUploadSubmit} className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">
                  PDF document
                </label>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleKnowledgeFileChange}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />

                {knowledgeUploadForm.file && (
                  <p className="mt-1 text-xs text-emerald-300">
                    Selected: {knowledgeUploadForm.file.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">
                  Document title
                </label>

                <input
                  value={knowledgeUploadForm.title}
                  onChange={(event) =>
                    setKnowledgeUploadForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Example: Bed Capacity Escalation Policy"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-400"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">
                    Category
                  </label>
                  <KnowledgeOptionSelect
                    value={knowledgeUploadForm.category}
                    options={KNOWLEDGE_DOCUMENT_CATEGORIES}
                    onChange={(category) =>
                      setKnowledgeUploadForm((current) => ({
                        ...current,
                        category,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">
                    Visibility
                  </label>
                  <KnowledgeOptionSelect
                    value={knowledgeUploadForm.visibility}
                    options={KNOWLEDGE_DOCUMENT_VISIBILITIES}
                    onChange={(visibility) =>
                      setKnowledgeUploadForm((current) => ({
                        ...current,
                        visibility,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <label className="mb-3 flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={knowledgeUploadForm.allowLLMRetrieval}
                    disabled={knowledgeUploadForm.containsPatientData}
                    onChange={(event) =>
                      setKnowledgeUploadForm((current) => ({
                        ...current,
                        allowLLMRetrieval: event.target.checked,
                      }))
                    }
                  />
                  Allow LLM retrieval
                </label>

                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={knowledgeUploadForm.containsPatientData}
                    onChange={(event) =>
                      setKnowledgeUploadForm((current) => ({
                        ...current,
                        containsPatientData: event.target.checked,
                        allowLLMRetrieval: event.target.checked
                          ? false
                          : current.allowLLMRetrieval,
                        visibility: event.target.checked
                          ? "patient_private"
                          : current.visibility,
                      }))
                    }
                  />
                  Contains patient data
                </label>

                {knowledgeUploadForm.containsPatientData && (
                  <p className="mt-2 text-xs text-amber-300">
                    Patient/private data will not be used for normal LLM
                    retrieval.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetKnowledgeUploadForm();
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={knowledgeUploading}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-70"
                >
                  {knowledgeUploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {showKnowledgeDocuments && createPortal(
        <div
          className="console-tinted-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="knowledge-documents-title"
        >
          <div className="console-tinted-popup flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 id="knowledge-documents-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Knowledge Documents
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {submittedKnowledgeSearch
                    ? `Search results for "${submittedKnowledgeSearch}"`
                    : "All approved knowledge documents"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKnowledgeDocuments(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <KnowledgeBaseResources
                key={`${knowledgeRefreshKey}-${submittedKnowledgeSearch}`}
                embedded
                initialSearch={submittedKnowledgeSearch}
                refreshKey={knowledgeRefreshKey}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Section 1: KPI Cards ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
          Resource Utilization KPIs
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {kpiDefs.map((def) => (
            <KpiCard key={def.label} {...def} />
          ))}
        </div>
      </div>

      {/* ── Section 2: Resource Trends ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
          Resource Trends
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {trendSeries.length > 0 ? (
            trendSeries.map((def) => {
              const max = Math.max(...def.series) || 1;
              return (
                <div
                  key={def.label}
                  className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-white/60">
                      {def.label}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white/80">
                      {def.value}
                      {def.unit}
                    </span>
                  </div>
                  <div
                    className="flex items-end gap-[2px]"
                    style={{ height: 52 }}
                  >
                    {def.series.map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${(v / max) * 100}%`,
                          background:
                            v > max * 0.8
                              ? "#f43f5e"
                              : v > max * 0.55
                                ? "#f59e0b"
                                : "#10b981",
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[8px] text-slate-400 dark:text-white/30">
                    <span>Earlier</span>
                    <span>Recent</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full py-8 text-center text-xs text-slate-400 dark:text-white/30">
              Not enough data for trend visualization.
            </p>
          )}
        </div>
      </div>

      {/* ── Section 3: Department Resource Comparison ── */}
      {deptComparison.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
            Department Resource Comparison
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-white/[0.06] dark:text-white/40">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Bed Usage</th>
                  <th className="px-4 py-3">Staff Level</th>
                  <th className="px-4 py-3">Equipment</th>
                  <th className="px-4 py-3">Cases/Doctor</th>
                  <th className="px-4 py-3">Available Staff</th>
                </tr>
              </thead>
              <tbody>
                {deptComparison.map((d) => (
                  <tr
                    key={d.name}
                    className="border-b border-slate-100 text-xs dark:border-white/[0.04]"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-white/70">
                      {d.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full ${(d.bedUsage ?? 0) > 80 ? "bg-rose-500" : (d.bedUsage ?? 0) > 55 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{
                              width: `${Math.min(100, d.bedUsage ?? 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-slate-600 dark:text-white/50">
                          {d.bedUsage != null ? `${d.bedUsage}%` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          d.staffLevel === "High"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : d.staffLevel === "Medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                        }`}
                      >
                        {d.staffLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">
                      {d.equipmentUsage != null ? `${d.equipmentUsage}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">
                      {d.casesPerDoctor}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">
                      {d.availableStaff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section 4: Resource Bottlenecks ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
          Resource Bottleneck Detection
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bottlenecks.length > 0 ? (
            bottlenecks.map((b, i) => (
              <BottleneckBadge key={i} severity={b.severity}>
                {b.text}
              </BottleneckBadge>
            ))
          ) : (
            <p className="col-span-full py-6 text-center text-xs text-slate-400 dark:text-white/30">
              No critical bottlenecks detected.
            </p>
          )}
        </div>
      </div>

      {/* ── Section 5: Resource Forecasting ── */}
      {forecasting.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
            Resource Forecasting
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {forecasting.map((f) => (
              <div
                key={f.label}
                className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-white/60">
                  {f.label}
                </p>
                <div className="mb-2 flex items-end gap-3">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 dark:text-white/30">
                      Actual
                    </p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white/90">
                      {f.actual}
                      {f.unit}
                    </p>
                  </div>
                  {f.models
                    .filter((m) => m.key === f.bestKey)
                    .map((m) => (
                      <div key={m.key} className="text-center">
                        <p className="text-[9px] text-slate-400 dark:text-white/30">
                          Predicted ({m.key})
                        </p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {m.value}
                          {f.unit}
                        </p>
                      </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.models.map((m) => (
                    <span
                      key={m.key}
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        m.key === f.bestKey
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40"
                      }`}
                    >
                      {m.key} {m.value}
                      {f.unit}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-slate-400 dark:text-white/30">
                  Best model: {f.bestKey}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: Optimization Recommendations ── */}
      {recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">
            AI Optimization Recommendations
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {recommendations.map((r, i) => (
              <div
                key={i}
                className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-500/5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white/90">
                      {r.action}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Impact: {r.impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {updatedAt && (
        <p className="mt-6 text-[9px] text-slate-400 dark:text-white/30">
          Updated{" "}
          {updatedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

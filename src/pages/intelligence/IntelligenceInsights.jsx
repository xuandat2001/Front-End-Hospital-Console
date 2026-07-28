import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../components/dashboard/Icon";
import { intelligenceService } from "../../services/intelligence/intelligenceApi";
import { formatDateTime } from "../../utils/dateFormat";

function formatEvidenceValue(value) {
  if (value === null || value === undefined || value === "") return "No data";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reasoningForInsight(insight) {
  const evidence = insight.evidence || {};

  switch (insight.insightType) {
    case "ICU_CAPACITY_PRESSURE":
      return `ICU occupancy is ${formatEvidenceValue(evidence.icuOccupancy)}% against a ${formatEvidenceValue(
        evidence.threshold,
      )}% threshold, with ${formatEvidenceValue(evidence.incomingHighSeverityCases)} high-severity incoming case(s) and ${formatEvidenceValue(
        evidence.availableIcuBeds,
      )} ICU bed(s) available.`;
    case "BED_OCCUPANCY_PRESSURE":
      return `Total bed occupancy is ${formatEvidenceValue(evidence.totalBedOccupancy)}% against a ${formatEvidenceValue(
        evidence.threshold,
      )}% threshold, with ${formatEvidenceValue(evidence.availableGeneralBeds)} general bed(s) available and ${formatEvidenceValue(
        evidence.pendingAdmissions,
      )} pending admission(s).`;
    case "EMERGENCY_ADMISSION_DELAY":
      return `Emergency case ${formatEvidenceValue(evidence.emergencyCaseId)} has waited ${formatEvidenceValue(
        evidence.delayMinutes,
      )} minute(s), above the ${formatEvidenceValue(evidence.thresholdMinutes)} minute window, and bed assignment is ${formatEvidenceValue(
        evidence.bedAssigned,
      )}.`;
    case "EMERGENCY_CONFIRMATION_DELAY":
      return `Emergency alert ${formatEvidenceValue(evidence.emergencyAlertId)} has been pending for ${formatEvidenceValue(
        evidence.delayMinutes,
      )} minute(s), above the ${formatEvidenceValue(evidence.thresholdMinutes)} minute confirmation window.`;
    case "STAFF_WORKLOAD_PRESSURE":
      return `Department ${formatEvidenceValue(evidence.departmentName || evidence.departmentId)} is at ${formatEvidenceValue(
        evidence.activeCasesPerDoctor,
      )} active case(s) per doctor and ${formatEvidenceValue(evidence.nurseToPatientRatio)} nurse-to-patient coverage.`;
    case "MEDICINE_LOW_STOCK":
      return `${formatEvidenceValue(evidence.medicineName || evidence.medicineId)} has ${formatEvidenceValue(
        evidence.currentStock,
      )} unit(s) against a reorder threshold of ${formatEvidenceValue(evidence.reorderThreshold)}.`;
    case "EQUIPMENT_MAINTENANCE_ISSUE":
      return `${formatEvidenceValue(evidence.equipmentType || evidence.equipmentId)} is marked ${formatEvidenceValue(
        evidence.equipmentStatus,
      )}, with maintenance due on ${formatEvidenceValue(evidence.maintenanceDueDate)}.`;
    default:
      return insight.description || "The intelligence rule matched current operational evidence.";
  }
}

function statusTone(status) {
  const normalized = String(status || "").toUpperCase();
  if (["HIGH", "CRITICAL", "ACTIVE"].includes(normalized)) return "high";
  if (["MEDIUM", "ACKNOWLEDGED", "IN_PROGRESS"].includes(normalized)) return "medium";
  return "low";
}

function EvidenceList({ evidence }) {
  const entries = Object.entries(evidence || {}).filter(([, value]) => value !== undefined && value !== null);

  if (!entries.length) {
    return <p className="intelligence-empty">No evidence fields recorded.</p>;
  }

  return (
    <dl className="insight-evidence-list">
      {entries.slice(0, 8).map(([key, value]) => (
        <div key={key}>
          <dt>{titleCase(key)}</dt>
          <dd>{formatEvidenceValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecommendationActions({ recommendation, onAccept, onReject, busy }) {
  const isPending = recommendation.status === "PENDING";

  return (
    <div className="recommendation-action-row">
      <span data-status={recommendation.status}>{titleCase(recommendation.status)}</span>
      <div>
        <button disabled={!isPending || busy} onClick={() => onAccept(recommendation._id)} type="button">
          Accept
        </button>
        <button disabled={!isPending || busy} onClick={() => onReject(recommendation._id)} type="button">
          Reject
        </button>
      </div>
    </div>
  );
}

function InsightLifecycleActions({ insight, onChangeStatus, busy }) {
  const status = String(insight.status || "").toUpperCase();
  const isClosed = ["RESOLVED", "DISMISSED", "EXPIRED"].includes(status);

  return (
    <div className="insight-lifecycle-actions">
      <button
        disabled={busy || status === "ACKNOWLEDGED" || isClosed}
        onClick={() => onChangeStatus(insight._id, "acknowledge")}
        type="button"
      >
        Acknowledge
      </button>
      <button
        disabled={busy || isClosed}
        onClick={() => onChangeStatus(insight._id, "resolve")}
        type="button"
      >
        Resolve
      </button>
      <button
        disabled={busy || isClosed}
        onClick={() => onChangeStatus(insight._id, "dismiss")}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}

function IntelligenceInsights({ activeFunction }) {
  const [insights, setInsights] = useState([]);
  const [allInsights, setAllInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState("");
  const [error, setError] = useState("");
  const hospitalId = intelligenceService.defaultHospitalId;

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [insightResponse, historyResponse, recommendationResponse] = await Promise.all([
        intelligenceService.getActiveInsights(hospitalId, true),
        intelligenceService.getInsights(hospitalId),
        intelligenceService.getRecommendations(hospitalId),
      ]);

      setInsights(insightResponse.data || []);
      setAllInsights(historyResponse.data || []);
      setRecommendations(recommendationResponse.data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInsights();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInsights]);

  const recommendationsByInsight = useMemo(
    () =>
      recommendations.reduce((lookup, recommendation) => {
        const insightId = String(recommendation.insightId || "");
        if (!lookup[insightId]) lookup[insightId] = [];
        lookup[insightId].push(recommendation);
        return lookup;
      }, {}),
    [recommendations],
  );

  const pendingRecommendations = recommendations.filter((item) => item.status === "PENDING");
  const acceptedRecommendations = recommendations.filter((item) => item.status === "ACCEPTED");
  const displayedInsights = activeFunction === "intelligence-insight-history" ? allInsights : insights;
  const insightCountLabel = activeFunction === "intelligence-insight-history" ? "Insight records" : "Active insights";
  const emptyTitle =
    activeFunction === "intelligence-insight-history"
      ? "No intelligence records yet"
      : "No active intelligence insights";
  const emptyDescription =
    activeFunction === "intelligence-insight-history"
      ? "Generated insight history will appear after rules evaluate hospital metrics."
      : "The service did not return active rule-based warnings for this hospital.";

  const handleRecommendationStatus = async (id, action) => {
    setBusyActionId(id);
    setError("");

    try {
      const request =
        action === "accept"
          ? intelligenceService.acceptRecommendation
          : intelligenceService.rejectRecommendation;
      const response = await request(id, hospitalId);
      const updated = response.data;
      setRecommendations((current) =>
        current.map((recommendation) => (recommendation._id === id ? updated : recommendation)),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyActionId("");
    }
  };

  const handleInsightStatus = async (id, action) => {
    setBusyActionId(id);
    setError("");

    try {
      const request = {
        acknowledge: intelligenceService.acknowledgeInsight,
        resolve: intelligenceService.resolveInsight,
        dismiss: intelligenceService.dismissInsight,
      }[action];
      const response = await request(id, hospitalId);
      const updated = response.data;

      setInsights((current) => {
        if (["RESOLVED", "DISMISSED"].includes(updated.status)) {
          return current.filter((insight) => insight._id !== id);
        }
        return current.map((insight) => (insight._id === id ? updated : insight));
      });
      setAllInsights((current) =>
        current.map((insight) => (insight._id === id ? updated : insight)),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyActionId("");
    }
  };

  const focusLabel = {
    "intelligence-recommendations": "Recommendations",
    "intelligence-reasoning": "Reasoning",
    "intelligence-evidence": "Evidence",
    "intelligence-insight-history": "Insight history",
  }[activeFunction] || "Active insights";

  if (loading) {
    return (
      <div className="dashboard-loading" aria-live="polite">
        <span />
        <p>Loading intelligence insights...</p>
      </div>
    );
  }

  return (
    <div className="intelligence-page intelligence-insights-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Insights</h1>
          <p>{focusLabel}</p>
        </div>
        <button className="btn btn-secondary" onClick={loadInsights} type="button">
          Refresh
        </button>
      </header>

      {error && (
        <div className="error-message intelligence-error" role="alert">
          {error}
        </div>
      )}

      <div className="insight-summary-strip">
        <span>
          <strong>{displayedInsights.length}</strong>
          {insightCountLabel}
        </span>
        <span>
          <strong>{pendingRecommendations.length}</strong>
          Pending actions
        </span>
        <span>
          <strong>{acceptedRecommendations.length}</strong>
          Accepted actions
        </span>
      </div>

      {activeFunction === "intelligence-recommendations" && (
        <section className="dashboard-card insight-recommendation-board">
          <div className="intelligence-panel-heading">
            <h2>Recommended actions</h2>
            <span>{recommendations.length || "No data"}</span>
          </div>
          <div className="recommendation-board-list">
            {recommendations.map((recommendation) => (
              <div className="recommendation-row" key={recommendation._id}>
                <div>
                  <strong>{recommendation.label}</strong>
                  <small>{recommendation.targetService || "No target service"}</small>
                </div>
                <RecommendationActions
                  busy={busyActionId === recommendation._id}
                  onAccept={(id) => handleRecommendationStatus(id, "accept")}
                  onReject={(id) => handleRecommendationStatus(id, "reject")}
                  recommendation={recommendation}
                />
              </div>
            ))}
            {!recommendations.length && (
              <p className="intelligence-empty">No recommendation action records have been generated yet.</p>
            )}
          </div>
        </section>
      )}

      <div className="insight-layout">
        <section className="insight-list">
          {displayedInsights.map((insight) => {
            const linkedRecommendations = recommendationsByInsight[String(insight._id)] || [];

            return (
              <article className="dashboard-card insight-record" key={insight._id}>
                <header>
                  <div>
                    <h2>{insight.title}</h2>
                    <p>{insight.description}</p>
                  </div>
                  <span data-tone={statusTone(insight.severity)}>{insight.severity}</span>
                </header>

                <div className="insight-record-meta">
                  <span>Status: {titleCase(insight.status || "ACTIVE")}</span>
                  {insight.updatedAt && <span>Updated: {formatDateTime(insight.updatedAt)}</span>}
                </div>

                <div className="insight-reasoning">
                  <Icon name="insight" size={17} />
                  <p>{reasoningForInsight(insight)}</p>
                </div>

                <div className="insight-solution">
                  <h3>Recommended approach</h3>
                  <p>{insight.recommendedAction || "No recommended action recorded."}</p>
                </div>

                <EvidenceList evidence={insight.evidence} />

                <div className="insight-recommendations">
                  <h3>Recommendation actions</h3>
                  {linkedRecommendations.length ? (
                    linkedRecommendations.map((recommendation) => (
                      <div className="recommendation-row" key={recommendation._id}>
                        <div>
                          <strong>{recommendation.label}</strong>
                          <small>{recommendation.targetService || "No target service"}</small>
                        </div>
                        <RecommendationActions
                          busy={busyActionId === recommendation._id}
                          onAccept={(id) => handleRecommendationStatus(id, "accept")}
                          onReject={(id) => handleRecommendationStatus(id, "reject")}
                          recommendation={recommendation}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="intelligence-empty">
                      {insight.recommendedAction
                        ? "The recommended approach is recorded on the insight; no separate action record has been created."
                        : "No separate action record yet."}
                    </p>
                  )}
                </div>

                <InsightLifecycleActions
                  busy={busyActionId === insight._id}
                  insight={insight}
                  onChangeStatus={handleInsightStatus}
                />
              </article>
            );
          })}

          {!displayedInsights.length && (
            <section className="dashboard-card intelligence-empty-state">
              <Icon name="check" size={22} />
              <h2>{emptyTitle}</h2>
              <p>{emptyDescription}</p>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

export default IntelligenceInsights;

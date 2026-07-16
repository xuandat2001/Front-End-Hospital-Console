import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ambulance,
  Brain,
  Building2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getPlanningAmbulanceDemand,
  getPlanningCapacityForecast,
  getPlanningRecommendations,
  getPlanningStaffingGap,
  getPlanningVolumeForecast,
} from "../../../../services/emergency/emergencyCommandApi";
import EmergencyTabHeader from "./EmergencyTabHeader";
import {
  ConfidenceBadge,
  MiniTrendChart,
  StatusBadge,
  WidgetShell,
  formatNumber,
  formatShortTime,
  formatPercent,
} from "./EmergencyCommandWidgets";
import {
  createInitialWidgetState,
  getCachedEmergencyWidgets,
  loadEmergencyWidgets,
  markWidgetStateLoading,
} from "./emergencyWidgetLoader";

const WIDGETS = {
  volume: ({ signal }) => getPlanningVolumeForecast(24, { signal }),
  capacity: ({ signal }) => getPlanningCapacityForecast(24, { signal }),
  staffing: ({ signal }) => getPlanningStaffingGap(12, { signal }),
  ambulance: ({ signal }) => getPlanningAmbulanceDemand(12, { signal }),
  recommendations: ({ signal }) => getPlanningRecommendations({ signal }),
};

const PLANNING_CACHE_KEY = "planning";
const PLANNING_CACHE_TTL_MS = 60000;

function ForecastUnavailable({ confidence }) {
  return (
    <div className="emergency-forecast-unavailable">
      <ShieldAlert size={16} strokeWidth={1.9} />
      <span>Forecast unavailable</span>
      <small>{Math.round(Number(confidence || 0) * 100)}% confidence is below threshold</small>
    </div>
  );
}

function VolumeForecast({ state }) {
  const data = state.data;
  const lowConfidence = data && data.confidence < 0.7;
  const peak = Math.max(...(data?.buckets || []).map((bucket) => bucket.expectedCases || 0), 0);

  return (
    <WidgetShell
      empty={!data?.buckets?.length}
      error={state.error}
      icon={TrendingUp}
      kicker="24-hour pressure"
      loading={state.loading}
      title="Emergency volume forecast"
    >
      {!data ? null : lowConfidence ? (
        <ForecastUnavailable confidence={data.confidence} />
      ) : (
        <>
          <div className="emergency-ops-stat-row">
            <div>
              <span>Peak expected</span>
              <strong>{formatNumber(peak, "0")}</strong>
            </div>
            <ConfidenceBadge confidence={data.confidence} />
          </div>
          <MiniTrendChart
            ariaLabel="Emergency volume forecast chart"
            data={data.buckets}
            series={[
              {
                key: "expectedCases",
                label: "Expected cases",
                color: "var(--primary)",
              },
            ]}
          />
        </>
      )}
    </WidgetShell>
  );
}

function CapacityForecast({ state }) {
  const data = state.data;
  const lowConfidence = data && data.confidence < 0.7;
  const latest = data?.buckets?.[0];

  return (
    <WidgetShell
      empty={!data?.buckets?.length}
      error={state.error}
      icon={Building2}
      kicker="ER / ICU capacity"
      loading={state.loading}
      title="Capacity risk forecast"
    >
      {!data ? null : lowConfidence ? (
        <ForecastUnavailable confidence={data.confidence} />
      ) : (
        <>
          <div className="emergency-ops-stat-row">
            <div>
              <span>Risk window</span>
              <strong>{data.riskWindow?.label || "None"}</strong>
            </div>
            <StatusBadge status={data.riskWindow ? "warning" : "stable"}>
              {data.riskWindow ? "Watch" : "Stable"}
            </StatusBadge>
          </div>
          <div className="emergency-capacity-pair">
            <article>
              <span>ER next hour</span>
              <strong>{formatPercent(latest?.erOccupancyPercentage)}</strong>
            </article>
            <article>
              <span>ICU next hour</span>
              <strong>{formatPercent(latest?.icuOccupancyPercentage)}</strong>
            </article>
          </div>
          <MiniTrendChart
            ariaLabel="ER and ICU capacity forecast chart"
            data={data.buckets}
            series={[
              { key: "erOccupancyPercentage", label: "ER occupancy", color: "var(--primary)" },
              { key: "icuOccupancyPercentage", label: "ICU occupancy", color: "var(--danger)" },
            ]}
          />
        </>
      )}
    </WidgetShell>
  );
}

function StaffingGap({ state }) {
  const data = state.data;
  return (
    <WidgetShell
      empty={!data}
      error={state.error}
      icon={Users}
      kicker="12-hour readiness"
      loading={state.loading}
      title="Staffing gap forecast"
    >
      <div className="emergency-ops-stat-row">
        <div>
          <span>Gap starts</span>
          <strong>{data?.gapStartTime ? formatShortTime(data.gapStartTime) : "No gap"}</strong>
        </div>
        <StatusBadge status={data?.currentStatus}>{data?.currentStatus || "Stable"}</StatusBadge>
      </div>
      <div className="emergency-staff-gap-grid">
        <article>
          <span>Doctors</span>
          <strong>
            {formatNumber(data?.availableDoctors, "0")} / {formatNumber(data?.requiredDoctors, "0")}
          </strong>
          <small>{data?.doctorShortage || 0} short</small>
        </article>
        <article>
          <span>Nurses</span>
          <strong>
            {formatNumber(data?.availableNurses, "0")} / {formatNumber(data?.requiredNurses, "0")}
          </strong>
          <small>{data?.nurseShortage || 0} short</small>
        </article>
      </div>
      <ConfidenceBadge confidence={data?.confidence} />
    </WidgetShell>
  );
}

function AmbulanceDemand({ state }) {
  const data = state.data;
  const risk = data?.buckets?.find((bucket) => bucket.status !== "stable");
  return (
    <WidgetShell
      empty={!data?.buckets?.length}
      error={state.error}
      icon={Ambulance}
      kicker="12-hour demand"
      loading={state.loading}
      title="Ambulance demand forecast"
    >
      <div className="emergency-ops-stat-row">
        <div>
          <span>Coverage risk</span>
          <strong>{risk?.label || "None"}</strong>
        </div>
        <ConfidenceBadge confidence={data?.confidence} />
      </div>
      <MiniTrendChart
        ariaLabel="Ambulance demand forecast chart"
        data={data?.buckets || []}
        series={[
          { key: "expectedDemand", label: "Expected demand", color: "var(--primary)" },
          { key: "availableCapacity", label: "Available capacity", color: "var(--success)" },
        ]}
      />
    </WidgetShell>
  );
}

function Recommendations({ state }) {
  const rows = state.data?.recommendations || [];
  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No readiness action is required right now."
      error={state.error}
      icon={Brain}
      kicker="Action panel"
      loading={state.loading}
      title="Readiness recommendations"
    >
      <div className="emergency-recommendation-stack">
        {rows.map((item) => (
          <article key={item.recommendationId}>
            <div>
              <StatusBadge status={item.severity}>{item.severity}</StatusBadge>
              <ConfidenceBadge confidence={item.confidence} />
            </div>
            <strong>{item.message}</strong>
            <p>{item.reason}</p>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}

export default function EmergencyPlanningTab() {
  const [widgets, setWidgets] = useState(() => createInitialWidgetState(WIDGETS));
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshBypassRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const bypassCache = refreshBypassRef.current;
    refreshBypassRef.current = false;

    queueMicrotask(() => {
      if (controller.signal.aborted) return;

      const cached = bypassCache
        ? null
        : getCachedEmergencyWidgets(PLANNING_CACHE_KEY, PLANNING_CACHE_TTL_MS);
      if (cached) {
        setWidgets(cached);
        return;
      }

      setWidgets((current) => markWidgetStateLoading(current));

      loadEmergencyWidgets({
        widgetMap: WIDGETS,
        cacheKey: PLANNING_CACHE_KEY,
        ttlMs: PLANNING_CACHE_TTL_MS,
        signal: controller.signal,
        bypassCache,
      })
        .then((nextWidgets) => {
          setWidgets(nextWidgets);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setWidgets((current) =>
              Object.fromEntries(
                Object.entries(current).map(([key, value]) => [
                  key,
                  {
                    ...value,
                    loading: false,
                    error: value.error || "Unable to load planning forecast.",
                  },
                ]),
              ),
            );
          }
        });
    });

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const isRefreshing = useMemo(
    () => Object.values(widgets).some((widget) => widget.loading),
    [widgets],
  );

  return (
    <div className="emergency-command-scroll">
      <div className="emergency-ops-shell">
        <EmergencyTabHeader
          title="Emergency planning"
          description="Forecast pressure, capacity risk, staffing gaps, and readiness actions."
          actions={
            <>
            <div className="emergency-case-focus">
              <ShieldAlert size={14} strokeWidth={1.9} />
              <span>{isRefreshing ? "Forecasting" : "Forecast ready"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshBypassRef.current = true;
                setRefreshKey((key) => key + 1);
              }}
            >
              <RefreshCw size={14} strokeWidth={1.9} />
              Refresh forecasts
            </button>
            </>
          }
        />

        <div className="emergency-ops-grid emergency-ops-grid--planning">
          <VolumeForecast state={widgets.volume} />
          <CapacityForecast state={widgets.capacity} />
          <StaffingGap state={widgets.staffing} />
          <AmbulanceDemand state={widgets.ambulance} />
          <Recommendations state={widgets.recommendations} />
        </div>
      </div>
    </div>
  );
}

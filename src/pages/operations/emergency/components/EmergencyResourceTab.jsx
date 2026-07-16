import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Ambulance,
  Bed,
  Boxes,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  getEmergencyAmbulances,
  getEmergencyBeds,
  getEmergencyEquipment,
  getEmergencyResourceBottlenecks,
  getEmergencyStaff,
} from "../../../../services/emergency/emergencyCommandApi";
import EmergencyTabHeader from "./EmergencyTabHeader";
import {
  BarList,
  StatusBadge,
  WidgetShell,
  formatNumber,
  formatPercent,
  formatShortTime,
  statusTone,
} from "./EmergencyCommandWidgets";
import {
  createInitialWidgetState,
  getCachedEmergencyWidgets,
  loadEmergencyWidgets,
  markWidgetStateLoading,
} from "./emergencyWidgetLoader";

const WIDGETS = {
  ambulances: ({ signal }) => getEmergencyAmbulances({ signal }),
  beds: ({ signal }) => getEmergencyBeds({ signal }),
  staff: ({ signal }) => getEmergencyStaff({ signal }),
  equipment: ({ signal }) => getEmergencyEquipment({ signal }),
  bottlenecks: ({ signal }) => getEmergencyResourceBottlenecks({ signal }),
};

const RESOURCE_CACHE_KEY = "resources";
const RESOURCE_CACHE_TTL_MS = 30000;

function ResourceStatusBadge({ status }) {
  return <StatusBadge status={status}>{status || "Unknown"}</StatusBadge>;
}

function WorkloadBadge({ level }) {
  return <StatusBadge status={level}>{level || "normal"}</StatusBadge>;
}

function AmbulanceFleetBoard({ state }) {
  const rows = state.data || [];
  const available = rows.filter((item) => item.status === "Available").length;
  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No emergency ambulances are registered."
      error={state.error}
      icon={Ambulance}
      kicker="Fleet readiness"
      loading={state.loading}
      title="Ambulance fleet"
    >
      <div className="emergency-ops-stat-row">
        <div>
          <span>Available now</span>
          <strong>{available}</strong>
        </div>
        <ResourceStatusBadge status={available <= 1 ? "warning" : "stable"} />
      </div>
      <div className="emergency-ambulance-grid">
        {rows.slice(0, 6).map((ambulance) => (
          <article key={ambulance.ambulanceId}>
            <div>
              <strong>{ambulance.ambulanceId}</strong>
              <ResourceStatusBadge status={ambulance.status} />
            </div>
            <p>{ambulance.currentZone || "Hospital base"}</p>
            <small>{ambulance.assignedCase || formatShortTime(ambulance.eta)}</small>
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}

function BedAvailability({ state }) {
  const beds = state.data || {};
  const rows = [
    ["ER beds", beds.erBeds],
    ["ICU beds", beds.icuBeds],
    ["Trauma beds", beds.traumaBeds],
    ["Isolation beds", beds.isolationBeds],
  ];
  return (
    <WidgetShell
      empty={!state.data}
      error={state.error}
      icon={Bed}
      kicker="Bed capacity"
      loading={state.loading}
      title="ER / ICU availability"
    >
      <div className="emergency-bed-grid">
        {rows.map(([label, item]) => (
          <article key={label} data-tone={statusTone(item?.status)}>
            <span>{label}</span>
            <strong>{formatNumber(item?.available, "0")} available</strong>
            <small>
              {formatNumber(item?.occupied, "0")} / {formatNumber(item?.total, "0")} occupied -
              {formatPercent(item?.occupancyPercentage)}
            </small>
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}

function StaffAvailability({ state }) {
  const rows = state.data || [];
  const grouped = rows.reduce((lookup, member) => {
    const key = member.role || "OTHER";
    lookup[key] = lookup[key] || [];
    lookup[key].push(member);
    return lookup;
  }, {});

  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No emergency staff data is available."
      error={state.error}
      icon={Users}
      kicker="Role coverage"
      loading={state.loading}
      title="Emergency staff"
    >
      <div className="emergency-resource-table-wrap">
        <table className="emergency-resource-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Status</th>
              <th>Workload</th>
              <th>Shift</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).flatMap(([role, members]) =>
              members.slice(0, 8).map((member, index) => (
                <tr key={member.staffId}>
                  <td>
                    {index === 0 ? <span className="emergency-role-label">{role}</span> : null}
                    <strong>{member.name}</strong>
                    <small>{member.specialization}</small>
                  </td>
                  <td>{member.role}</td>
                  <td>
                    <ResourceStatusBadge status={member.status} />
                  </td>
                  <td>
                    <WorkloadBadge level={member.workloadLevel} />
                  </td>
                  <td>
                    {member.shiftEndingSoon ? "Soon" : formatShortTime(member.shiftEndTime)}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}

function EquipmentGrid({ state }) {
  const rows = state.data || [];
  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No critical equipment data is available."
      error={state.error}
      icon={Boxes}
      kicker="Critical equipment"
      loading={state.loading}
      title="Equipment readiness"
    >
      <div className="emergency-equipment-grid">
        {rows.map((item) => (
          <article key={item.type} data-tone={statusTone(item.status)}>
            <div>
              <span>{item.type}</span>
              <ResourceStatusBadge status={item.status} />
            </div>
            <strong>{formatNumber(item.available, "0")} available</strong>
            <small>
              {item.inUse} in use - {item.maintenance} maintenance - {item.offline} offline
            </small>
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}

function BottleneckAlerts({ state }) {
  const rows = state.data || [];
  return (
    <WidgetShell
      empty={!rows.length}
      emptyText="No active resource bottlenecks."
      error={state.error}
      icon={ShieldAlert}
      kicker="Operational blockers"
      loading={state.loading}
      title="Resource bottlenecks"
    >
      <div className="emergency-bottleneck-list">
        {rows.map((item) => (
          <article key={item.bottleneckId}>
            <div>
              <ResourceStatusBadge status={item.severity} />
              <strong>{item.affectedResourceType}</strong>
            </div>
            <p>{item.impact}</p>
            <small>{item.suggestedAction}</small>
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}

export default function EmergencyResourceTab({ realtime }) {
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
        : getCachedEmergencyWidgets(RESOURCE_CACHE_KEY, RESOURCE_CACHE_TTL_MS);
      if (cached) {
        setWidgets(cached);
        return;
      }

      setWidgets((current) => markWidgetStateLoading(current));

      loadEmergencyWidgets({
        widgetMap: WIDGETS,
        cacheKey: RESOURCE_CACHE_KEY,
        ttlMs: RESOURCE_CACHE_TTL_MS,
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
                    error: value.error || "Unable to load emergency resources.",
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
  }, [refreshKey, realtime?.activeCases?.length, realtime?.summary?.activeCases]);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((key) => key + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const isRefreshing = useMemo(
    () => Object.values(widgets).some((widget) => widget.loading),
    [widgets],
  );
  const equipmentRows = (widgets.equipment.data || []).map((item) => ({
    key: item.type,
    label: item.type,
    count: item.available,
  }));

  return (
    <div className="emergency-command-scroll">
      <div className="emergency-ops-shell">
        <EmergencyTabHeader
          title="Emergency resources"
          description="Ambulances, beds, emergency staff, equipment, and active bottlenecks."
          actions={
            <>
            <div className="emergency-case-focus">
              <Activity size={14} strokeWidth={1.9} />
              <span>{isRefreshing ? "Syncing" : "Live resources"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshBypassRef.current = true;
                setRefreshKey((key) => key + 1);
              }}
            >
              <RefreshCw size={14} strokeWidth={1.9} />
              Refresh resources
            </button>
            </>
          }
        />

        <div className="emergency-ops-grid emergency-ops-grid--resources">
          <AmbulanceFleetBoard state={widgets.ambulances} />
          <BedAvailability state={widgets.beds} />
          <BottleneckAlerts state={widgets.bottlenecks} />
          <StaffAvailability state={widgets.staff} />
          <EquipmentGrid state={widgets.equipment} />
          <WidgetShell
            empty={!equipmentRows.length}
            error={widgets.equipment.error}
            icon={Boxes}
            loading={widgets.equipment.loading}
            title="Available equipment mix"
          >
            <BarList rows={equipmentRows} />
          </WidgetShell>
        </div>
      </div>
    </div>
  );
}

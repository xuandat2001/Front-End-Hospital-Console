import { useEffect, useState, useMemo, useCallback } from "react";
import { roomPerformanceService } from "../../services/performance/roomPerformanceApi";
import { roomService } from "../../services/core-modules/roomApi";
import MiniPieChart from "../../components/graphs/MiniPieChart";
import BarChart from "../../components/graphs/BarChart";
import { clampPercent, extractCollection, finiteNumber } from "../../utils/performanceDataContracts";

const STATUS_COLORS = {
  UNDER_UTILIZED: "#F59E0B",
  NORMAL: "#22C55E",
  HIGH_USAGE: "#3B82F6",
  HIGH_DEMAND: "#EF4444",
};

const shortenRoomLabel = (value) =>
  String(value || "")
    .replace(/^Surgery Ward\s+/i, "SW ")
    .replace(/^General$/i, "Gen")
    .replace(/\s+/g, " ")
    .trim();

export default function RoomPerformanceDashboard() {
  const [performances, setPerformances] = useState([]);
  const [roomMap, setRoomMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      roomPerformanceService.getAllPerformances(),
      roomService.getAllRooms(),
    ]).then(([perfRes, roomRes]) => {
      const errs = [];
      if (perfRes.status === "fulfilled") {
        const raw = perfRes.value;
        if (raw?.success) {
          setPerformances(extractCollection(raw));
        } else {
          errs.push(`room-performance API: unexpected response ${JSON.stringify(raw).slice(0, 200)}`);
        }
      } else {
        errs.push(`room-performance API rejected: ${perfRes.reason?.message || "unknown"}`);
      }
      if (roomRes.status === "fulfilled") {
        const raw = roomRes.value;
        if (raw?.success) {
          const map = {};
          extractCollection(raw).forEach((r) => {
            [r.ellyId, r._id, r.id, r.roomNumber]
              .filter(Boolean)
              .forEach((key) => {
                map[String(key)] = r;
              });
          });
          setRoomMap(map);
        } else {
          errs.push(`rooms API: unexpected response ${JSON.stringify(raw).slice(0, 200)}`);
        }
      } else {
        errs.push(`rooms API rejected: ${roomRes.reason?.message || "unknown"}`);
      }
      if (errs.length) setError(errs.join(" | "));
      else setError(null);
    }).finally(() => setLoading(false));
  }, []);

  const getRoomForPerformance = useCallback(
    (performance) => roomMap[String(performance.roomId || "")],
    [roomMap],
  );

  const getOccupancyRate = useCallback((performance) => {
    const room = getRoomForPerformance(performance);
    const recordedRate = finiteNumber(performance.occupancyRate, NaN);
    const occupiedBeds = finiteNumber(room?.occupiedBeds, NaN);
    const capacity = finiteNumber(room?.capacity, NaN);

    if (occupiedBeds !== null && capacity > 0) {
      const liveRate = Math.round((occupiedBeds / capacity) * 100);
      return clampPercent(Math.max(Number.isFinite(recordedRate) ? recordedRate : 0, liveRate));
    }

    return clampPercent(Number.isFinite(recordedRate) ? recordedRate : 0);
  }, [getRoomForPerformance]);

  const computeStatus = useCallback((p) => {
    const occ = getOccupancyRate(p);
    const turnover = p.turnoverRate ?? 0;
    const clean = p.cleanlinessScore ?? 100;
    const maint = p.maintenanceScore ?? 100;
    if (occ < 30 && turnover < 30) return "UNDER_UTILIZED";
    if (occ >= 85 || (occ >= 70 && (clean < 50 || maint < 50))) return "HIGH_DEMAND";
    if (occ >= 70 || turnover >= 70) return "HIGH_USAGE";
    return "NORMAL";
  }, [getOccupancyRate]);

  const filteredPerformances = useMemo(() => {
    if (!searchTerm.trim()) return performances;
    const q = searchTerm.toLowerCase();
    return performances.filter((p) => {
      const r = getRoomForPerformance(p);
      return (
        r?.roomNumber?.toLowerCase().includes(q) ||
        r?.ellyId?.toLowerCase().includes(q) ||
        r?.roomType?.toLowerCase().includes(q) ||
        p.roomId?.toLowerCase().includes(q)
      );
    });
  }, [performances, searchTerm, getRoomForPerformance]);

  const statusSlices = useMemo(() => {
    const counts = { UNDER_UTILIZED: 0, NORMAL: 0, HIGH_USAGE: 0, HIGH_DEMAND: 0 };
    filteredPerformances.forEach((p) => {
      const s = computeStatus(p);
      if (counts[s] !== undefined) counts[s]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] }));
  }, [filteredPerformances, computeStatus]);

  const sortedByOccupancy = useMemo(() => {
    return [...filteredPerformances].sort(
      (a, b) => getOccupancyRate(b) - getOccupancyRate(a),
    );
  }, [filteredPerformances, getOccupancyRate]);

  const topByOccupancy = useMemo(() => {
    return sortedByOccupancy.slice(0, 6).map((p) => {
      const r = getRoomForPerformance(p);
      const rate = getOccupancyRate(p);
      return {
        id: p._id || p.performanceId,
        name: r ? `${r.roomNumber} (${r.roomType})` : p.roomId,
        rate,
      };
    });
  }, [sortedByOccupancy, getOccupancyRate, getRoomForPerformance]);

  const cleanlinessChart = useMemo(() => {
    const sorted = [...filteredPerformances].sort((a, b) => (b.cleanlinessScore ?? 0) - (a.cleanlinessScore ?? 0));
    const top = sorted.slice(0, 5);
    return {
      data: top.map((p) => Math.round(finiteNumber(p.cleanlinessScore))),
      labels: top.map((p) => {
        const r = getRoomForPerformance(p);
        return shortenRoomLabel(r ? r.roomNumber : p.roomId);
      }),
    };
  }, [filteredPerformances, getRoomForPerformance]);

  const avgMetrics = useMemo(() => {
    if (!filteredPerformances.length) return { data: [], labels: [] };
    const avg = (field) =>
      Math.round(
        filteredPerformances.reduce((s, p) => s + finiteNumber(p[field]), 0) /
          filteredPerformances.length
      );
    return {
      data: [
        Math.round(
          filteredPerformances.reduce((sum, p) => sum + getOccupancyRate(p), 0) /
            filteredPerformances.length,
        ),
        avg("turnoverRate"),
        avg("cleanlinessScore"),
        avg("maintenanceScore"),
      ],
      labels: ["Avg Occupancy %", "Avg Turnover", "Cleanliness", "Maintenance"],
    };
  }, [filteredPerformances, getOccupancyRate]);

  const avgStayByStatus = useMemo(() => {
    const entries = filteredPerformances.slice(0, 6).map((p) => {
      const r = getRoomForPerformance(p);
      return {
        room: shortenRoomLabel(r ? r.roomNumber : p.roomId),
        avg: Math.round(finiteNumber(p.averageLengthOfStay) * 10) / 10,
      };
    });
    entries.sort((a, b) => b.avg - a.avg);
    return {
      data: entries.map((e) => e.avg),
      labels: entries.map((e) => `${e.room}: ${e.avg}d`),
    };
  }, [filteredPerformances, getRoomForPerformance]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div>
        <h1 className="mb-1 text-xl font-bold dark:text-white">Room Performance</h1>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Occupancy rates, turnover times, cleanliness, and maintenance scores across all rooms.
          </p>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn btn-primary"
            type="button"
          >
            {showSearch ? "Hide Search" : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-semibold">API Error</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {performances.length > 0 && (
        <>
          <div className="mb-3 grid gap-3 xl:grid-cols-3">
            <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Room Status Distribution</p>
              <MiniPieChart slices={statusSlices} centerLabel={`${filteredPerformances.length}\nRooms`} compact />
            </div>
            <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Highest Occupancy Rooms</p>
              <div className="space-y-1.5">
                {topByOccupancy.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="w-4 text-center text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-medium dark:text-white">{item.name}</span>
                        <span className="ml-2 text-xs font-bold dark:text-white">{item.rate}%</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Cleanliness Scores</p>
              <BarChart data={cleanlinessChart.data} labels={cleanlinessChart.labels} compact heightClass="h-24" />
            </div>
          </div>

          {performances.length > 1 && (
            <div className="mb-3 grid gap-3 xl:grid-cols-2">
              <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Average Metrics</p>
                <BarChart data={avgMetrics.data} labels={avgMetrics.labels} compact heightClass="h-24" />
              </div>
              <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Length of Stay by Room</p>
                <BarChart data={avgStayByStatus.data} labels={avgStayByStatus.labels} compact heightClass="h-24" />
              </div>
            </div>
          )}

          {showSearch && (<>
          <div className="mb-6 max-w-xs">
            <input
              type="text"
              placeholder="Search by room number, ID, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPerformances.map((perf) => {
              const room = roomMap[perf.roomId];
              const status = computeStatus(perf);
              return (
                <div
                  key={perf._id || perf.performanceId}
                  className="rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold dark:text-white">
                        {room ? `${room.roomNumber} (${room.roomType})` : perf.roomId}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {room?.ellyId || perf.roomId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {room?.floor ? `Floor ${room.floor}` : ""}
                        {room?.departmentId ? ` — ${room.departmentId}` : ""}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        backgroundColor: STATUS_COLORS[status] || "#6B7280",
                        color: "#fff",
                      }}
                    >
                      {status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Occupancy</span>
                      <p className="font-bold dark:text-white">{perf.occupancyRate ?? "—"}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Turnover</span>
                      <p className="font-bold dark:text-white">{perf.turnoverRate ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Avg Stay</span>
                      <p className="font-bold dark:text-white">{perf.averageLengthOfStay ?? "—"}d</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Cleanliness</span>
                      <p className="font-bold dark:text-white">{perf.cleanlinessScore ?? "—"}%</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 border-t pt-3 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Maintenance:</span>
                      <span className="font-semibold dark:text-white">{perf.maintenanceScore ?? "—"}%</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(perf.calculatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>)}
        </>
      )}

      {performances.length === 0 && !error && (
        <p className="text-sm text-slate-400">No room performance records found.</p>
      )}
    </div>
  );
}

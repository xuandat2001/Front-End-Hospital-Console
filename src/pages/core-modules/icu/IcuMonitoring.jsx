import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardList, Filter, LayoutGrid, ListFilter, RefreshCcw, Search, Signal, SlidersHorizontal, TableProperties } from "lucide-react";
import useIcuRealtime from "../../../hooks/useIcuRealtime";
import IcuPatientCard from "./IcuPatientCard";
import IcuSummaryPanel from "./IcuSummaryPanel";
import IcuPatientDrawer from "./IcuPatientDrawer";
import IcuVitalsTable from "./IcuVitalsTable";
import { formatTime } from "../../../utils/dateFormat";

const severityOptions = [
  { value: "", label: "All severity" },
  { value: "Critical", label: "Critical" },
  { value: "High Attention", label: "High Attention" },
  { value: "Watch", label: "Watch" },
  { value: "Stable", label: "Stable" },
  { value: "Stale / Device Issue", label: "Stale / Device Issue" },
];
const deviceOptions = [
  { value: "", label: "All devices" },
  { value: "live", label: "Live" },
  { value: "delayed", label: "Delayed" },
  { value: "stale", label: "Stale" },
  { value: "disconnected", label: "Disconnected" },
];
const categoryOptions = [
  { value: "", label: "All categories" },
  { value: "high-risk", label: "High risk" },
  { value: "escalation", label: "Escalation" },
  { value: "observation", label: "Observation" },
  { value: "routine", label: "Routine care" },
  { value: "device-issue", label: "Device issue" },
];

function patientCategory(patient) {
  if (["stale", "disconnected"].includes(patient.deviceStatus) || patient.severity === "Stale / Device Issue") return "device-issue";
  if (patient.severity === "Critical") return "high-risk";
  if (patient.severity === "High Attention") return "escalation";
  if (patient.severity === "Watch") return "observation";
  return "routine";
}

function formatUpdated(value) {
  if (!value) return "No updates yet";
  return formatTime(value);
}

function IcuSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-3 xl:grid-cols-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[214px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
      <div className="h-[520px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function IcuFilterDropdown({ label, icon: Icon, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const selectOption = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`icu-filter-dropdown ${open ? "is-open" : ""}`} ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selected.label}`}
        className="icu-filter-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Icon size={14} />
        <span className="icu-filter-copy">
          <small>{label}</small>
          <span>{selected.label}</span>
        </span>
        <ChevronDown size={14} className={open ? "is-open" : ""} />
      </button>

      {open ? (
        <div
          className="icu-filter-menu global-content-dropdown"
          role="listbox"
          aria-label={label}
        >
          <div className="icu-filter-options">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  aria-selected={isSelected}
                  className={isSelected ? "is-selected" : ""}
                  data-no-ripple="true"
                  key={option.value || "all"}
                  onClick={() => selectOption(option.value)}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <i aria-hidden="true">
                      <Check size={10} />
                    </i>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function IcuMonitoring() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState("cards");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search: search.trim(),
      severity,
      deviceStatus,
    }),
    [search, severity, deviceStatus]
  );

  const {
    patients,
    overview,
    loading,
    error,
    connectionState,
    refresh,
  } = useIcuRealtime(filters);

  const visiblePatients = useMemo(
    () => category ? patients.filter((patient) => patientCategory(patient) === category) : patients,
    [patients, category]
  );

  const liveSelected = selectedPatient
    ? patients.find((patient) => (patient.id || patient._id) === (selectedPatient.id || selectedPatient._id))
    : null;

  return (
    <div className="icu-monitoring is-vitals-view flex h-full flex-col gap-3 overflow-y-auto p-3" data-view={view}>
      <header className="icu-command-bar">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">ICU Monitoring</h1>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${
                connectionState === "connected"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
              }`}>
                <Signal size={12} />
                {connectionState === "connected" ? "Live" : "Updates paused"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Live monitoring of admitted ICU patients. Last updated {formatUpdated(overview?.latestUpdateAt)}.
            </p>
          </div>

          <div className="icu-command-controls">
            <label className="icu-search-control relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="icu-search-field h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Search name or ELLY ID"
              />
            </label>
            <button className={`icu-view-toggle ${view === "vitals" ? "is-active" : ""}`} type="button" onClick={() => setView((current) => current === "cards" ? "vitals" : "cards")}>
              {view === "cards" ? <TableProperties size={14} /> : <LayoutGrid size={14} />}
              {view === "cards" ? "Live vitals" : "Patient cards"}
            </button>
            <IcuFilterDropdown label="Category" icon={ListFilter} options={categoryOptions} value={category} onChange={setCategory} />
            <IcuFilterDropdown
              label="Severity"
              icon={Filter}
              options={severityOptions}
              value={severity}
              onChange={setSeverity}
            />
            <IcuFilterDropdown
              label="Device"
              icon={SlidersHorizontal}
              options={deviceOptions}
              value={deviceStatus}
              onChange={setDeviceStatus}
            />
            <button
              data-no-ripple="true"
              type="button"
              onClick={refresh}
              onPointerUp={(event) => event.currentTarget.blur()}
              className="icu-refresh-button no-interaction-ripple"
            >
              <RefreshCcw size={13} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Live ICU updates paused. Showing latest available data. {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setSummaryOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
      >
        {summaryOpen ? "Hide ICU summary" : "Show ICU summary"}
      </button>

      {loading && patients.length === 0 ? (
        <IcuSkeleton />
      ) : view === "vitals" ? (
        <div className="icu-view-stage" key="vitals">
          <IcuVitalsTable patients={visiblePatients} onOpenPatient={setSelectedPatient} />
        </div>
      ) : (
        <div className="icu-view-stage grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]" key="cards">
          <main className="icu-patient-space min-w-0">
            {!visiblePatients.length ? (
              <div className="icu-empty-state flex items-center justify-center p-6 text-center">
                <div className="icu-empty-content">
                  <div className="icu-empty-icon" aria-hidden="true">
                    <ClipboardList size={44} strokeWidth={1.35} />
                  </div>
                  <h2>No active ICU patients</h2>
                  <p>
                    ICU admissions and bedside monitoring will appear here once a patient is assigned to an ICU bed.
                  </p>
                  <span>Available ICU beds: {overview?.availableBeds ?? 0}</span>
                </div>
              </div>
            ) : (
              <div className="icu-patient-grid grid gap-3 xl:grid-cols-3 md:grid-cols-2">
                {visiblePatients.map((patient) => (
                  <IcuPatientCard
                    key={patient.id || patient._id}
                    patient={patient}
                    onOpen={setSelectedPatient}
                  />
                ))}
              </div>
            )}
          </main>

          <div className={summaryOpen ? "block" : "hidden lg:block"}>
            <IcuSummaryPanel
              overview={overview}
              patients={patients}
              onOpenPatient={setSelectedPatient}
            />
          </div>
        </div>
      )}

      {selectedPatient ? (
        <IcuPatientDrawer
          patient={selectedPatient}
          livePatient={liveSelected}
          onClose={() => setSelectedPatient(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}

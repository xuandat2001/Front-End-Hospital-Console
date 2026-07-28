import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardEdit,
  FileText,
  HeartPulse,
  MonitorCheck,
  X,
} from "lucide-react";
import { icuService } from "../../../services/core-modules/icuApi";
import { formatDateTime } from "../../../utils/dateFormat";

const ICU_DETAIL_CLOSE_ANIMATION_MS = 340;

function VitalRow({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-xs dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <strong className="text-slate-900 dark:text-white">
        {value ?? "--"}
        {value !== undefined && value !== null && unit ? <span className="ml-1 text-[10px] text-slate-400">{unit}</span> : null}
      </strong>
    </div>
  );
}

export default function IcuPatientDrawer({ patient, livePatient, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTimelineScrollbarVisible, setIsTimelineScrollbarVisible] = useState(false);
  const closeTimerRef = useRef(null);

  const patientId = patient?.id || patient?._id;

  const closeDrawer = useCallback(() => {
    if (isClosing || closeTimerRef.current) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, ICU_DETAIL_CLOSE_ANIMATION_MS);
  }, [isClosing, onClose]);

  const closeOnOutsidePointer = (event) => {
    if (event.target === event.currentTarget) {
      closeDrawer();
    }
  };

  const showTimelineScrollbarNearBottom = (event) => {
    const { bottom } = event.currentTarget.getBoundingClientRect();
    setIsTimelineScrollbarVisible(bottom - event.clientY <= 84);
  };

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      icuService.getPatient(patientId)
        .then((response) => {
          if (active) setDetail(response.data || null);
        })
        .catch((requestError) => {
          if (active) setError(requestError.message || "Unable to load ICU patient detail.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDrawer]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const merged = useMemo(() => ({ ...(detail || patient || {}), ...(livePatient || {}) }), [detail, patient, livePatient]);
  const vitals = merged.latestVitals || {};
  const activeAlerts = merged.activeAlerts || [];
  const timelineEvents = Array.isArray(merged.timeline) ? merged.timeline.slice(0, 8) : [];
  const shouldCueMoreTimeline = timelineEvents.length > 5;

  const acknowledgeFirstAlert = async () => {
    const alert = activeAlerts.find((item) => item.status === "ACTIVE");
    if (!alert) return;
    setSaving(true);
    try {
      await icuService.acknowledgeAlert(alert._id);
      const response = await icuService.getPatient(patientId);
      setDetail(response.data || null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const addHandoff = async (event) => {
    event.preventDefault();
    const note = handoffNote.trim();
    if (!note) return;
    setSaving(true);
    try {
      await icuService.createSignoff({
        icuAdmissionId: patientId,
        patientId: merged.ellyId || merged.patientId,
        note,
        status: "PENDING",
      });
      setHandoffNote("");
      const response = await icuService.getPatient(patientId);
      setDetail(response.data || null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return null;

  const drawer = (
    <div
      className={`icu-patient-drawer-layer fixed inset-0 flex justify-end bg-slate-950/30 backdrop-blur-[1px] ${isClosing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      onPointerDown={closeOnOutsidePointer}
    >
      <section className="icu-patient-drawer-panel relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 sm:w-[min(720px,92vw)]">
        <header className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                  {merged.displayName || merged.patient?.fullName || merged.ellyId}
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {merged.severity || "Stable"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {merged.ellyId || merged.patientId} / {merged.roomId || "ICU"} {merged.bedId || "--"} / admitted {formatDateTime(merged.admittedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:border-slate-700 dark:hover:bg-slate-900"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <main className="space-y-3">
                <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <HeartPulse size={15} />
                    Current Vitals
                  </h3>
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    <VitalRow label="Heart rate" value={vitals.heartRate} unit="bpm" />
                    <VitalRow label="Blood pressure" value={vitals.bloodPressure} unit="mmHg" />
                    <VitalRow label="Respiratory rate" value={vitals.respiratoryRate} unit="/min" />
                    <VitalRow label="Oxygen saturation" value={vitals.oxygenSaturation} unit="%" />
                    <VitalRow label="Temperature" value={vitals.temperature} unit="C" />
                    <VitalRow label="Last reading" value={formatDateTime(vitals.recordedAt || merged.latestUpdateAt)} />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <AlertTriangle size={15} />
                    Decision Support
                  </h3>
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {merged.logicSummary || "Current ICU monitoring values are being evaluated by deterministic operating thresholds. This is decision support, not a clinical diagnosis."}
                  </p>
                </section>

                <section className="icu-timeline-panel rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <FileText size={15} />
                    Timeline
                  </h3>
                  <div
                    className={`icu-timeline-shell ${shouldCueMoreTimeline ? "has-bottom-fade" : ""} ${isTimelineScrollbarVisible ? "is-scrollbar-visible" : ""}`}
                    onMouseLeave={() => setIsTimelineScrollbarVisible(false)}
                    onMouseMove={showTimelineScrollbarNearBottom}
                  >
                    <div className="icu-timeline-scroll space-y-2">
                      {timelineEvents.length ? timelineEvents.map((event) => (
                        <div key={event._id} className="rounded-md bg-slate-50 px-2 py-2 text-xs dark:bg-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-slate-800 dark:text-slate-100">{event.title}</strong>
                            <span className="shrink-0 text-[10px] text-slate-400">{formatDateTime(event.occurredAt)}</span>
                          </div>
                          {event.message ? <p className="mt-0.5 text-[11px] text-slate-500">{event.message}</p> : null}
                        </div>
                      )) : (
                        <p className="text-xs text-slate-500">Timeline events will appear as devices, alerts, and handoffs update.</p>
                      )}
                    </div>
                    {shouldCueMoreTimeline ? <div className="icu-timeline-bottom-fade" aria-hidden="true" /> : null}
                  </div>
                </section>
              </main>

              <aside className="space-y-3">
                <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <MonitorCheck size={15} />
                    Devices
                  </h3>
                  <div className="space-y-1.5">
                    {(merged.devices || []).length ? merged.devices.map((device) => (
                      <div key={device._id} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs dark:bg-slate-800">
                        <strong className="block text-slate-800 dark:text-slate-100">{device.deviceId}</strong>
                        <span className="text-[10px] uppercase text-slate-500">{device.status}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500">No device binding is active.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <AlertTriangle size={15} />
                    Alerts
                  </h3>
                  <div className="space-y-1.5">
                    {activeAlerts.length ? activeAlerts.map((alert) => (
                      <div key={alert._id} className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-100">
                        <strong>{alert.title}</strong>
                        <p className="mt-0.5 text-[10px]">{alert.status}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500">No active alerts.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={acknowledgeFirstAlert}
                    disabled={saving || !activeAlerts.some((alert) => alert.status === "ACTIVE")}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-950 dark:disabled:bg-slate-700"
                  >
                    <CheckCircle2 size={13} />
                    Acknowledge alert
                  </button>
                </section>

                <form onSubmit={addHandoff} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <ClipboardEdit size={15} />
                    Handoff Note
                  </h3>
                  <textarea
                    value={handoffNote}
                    onChange={(event) => setHandoffNote(event.target.value)}
                    className="h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Add concise shift handoff note..."
                  />
                  <button
                    type="submit"
                    disabled={saving || !handoffNote.trim()}
                    className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    Add handoff
                  </button>
                </form>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawer, document.body) : drawer;
}

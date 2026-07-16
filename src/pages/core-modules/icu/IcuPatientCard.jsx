import {
  AlertTriangle,
  Clock3,
} from "lucide-react";

function formatTimeAgo(value) {
  if (!value) return "No reading";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function Vital({ label, value, unit, tone = "" }) {
  return (
    <div className="icu-vital min-w-0">
      <span className="icu-vital-label">{label}</span>
      <div className={`icu-vital-reading ${tone}`}>
        {value ?? "--"}
        {value !== undefined && value !== null && unit ? <small>{unit}</small> : null}
      </div>
    </div>
  );
}

export default function IcuPatientCard({ patient, onOpen }) {
  const vitals = patient.latestVitals || {};
  const activeAlert = patient.activeAlerts?.find((alert) => alert.status === "ACTIVE");
  const severity = patient.severity || "Stable";
  const statusLabel = patient.deviceStatus || "disconnected";

  return (
    <button
      type="button"
      onClick={() => onOpen(patient)}
      className="icu-patient-card group w-full text-left"
      data-alert={activeAlert ? "true" : undefined}
      data-severity={severity}
    >
      <div className="icu-card-header">
        <div className="icu-card-identity">
          <h3>{patient.displayName || patient.patient?.fullName || patient.ellyId}</h3>
          <span>{patient.ellyId || patient.patientId}</span>
        </div>
        <span className="icu-severity-pill">
          {severity}
        </span>
      </div>

      <div className="icu-card-location">
        <span>Location</span>
        <strong>{patient.roomId || "ICU"}</strong>
        <small>Bed {patient.bedId || "--"}</small>
      </div>

      <div className="icu-vital-stack">
        <Vital label="HR" value={vitals.heartRate} unit="bpm" tone={severity === "Critical" ? "is-alert" : ""} />
        <Vital label="BP" value={vitals.bloodPressure} />
        <Vital label="Resp" value={vitals.respiratoryRate} unit="/m" />
        <Vital label="SpO2" value={vitals.oxygenSaturation} unit="%" />
        <Vital label="Temp" value={vitals.temperature} unit="°C" />
      </div>

      <div className="icu-card-footer">
        <span className="icu-card-updated">
          <Clock3 size={11} />
          {formatTimeAgo(patient.latestUpdateAt || vitals.recordedAt)}
        </span>
        <span className="icu-card-device" data-status={statusLabel}>
          <i aria-hidden="true" />
          {statusLabel}
        </span>
        {activeAlert ? (
          <span className="icu-alert-chip">
            <AlertTriangle size={10} />
            Alert
          </span>
        ) : null}
      </div>
    </button>
  );
}

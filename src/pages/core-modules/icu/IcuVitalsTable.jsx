import { Activity, AlertTriangle, Clock3, HeartPulse, Thermometer, Wind } from "lucide-react";
import { formatAge } from "../../../utils/dateFormat";

function VitalCell({ value, unit, alert = false }) {
  return (
    <span className={`icu-roster-vital ${alert ? "is-alert" : ""}`}>
      <strong>{value ?? "--"}</strong>
      {value !== undefined && value !== null && unit ? <small>{unit}</small> : null}
    </span>
  );
}

function patientName(patient) {
  const receivedName = patient.patient?.fullName || patient.displayName;
  const patientCode = patient.ellyId || patient.patientId;
  return receivedName && receivedName !== patientCode ? receivedName : "Name unavailable";
}

export default function IcuVitalsTable({ patients, onOpenPatient }) {
  return (
    <section className="icu-vitals-roster" aria-label="Live ICU patient vital signs">
      <div className="icu-vitals-roster__head">
        <div>
          <span>Live bedside feed</span>
          <h2>All patient vitals</h2>
        </div>
      </div>
      <div className="icu-vitals-table-frame">
        <div className="icu-vitals-table-scroll">
          <table className="icu-vitals-table">
            <thead>
              <tr>
                <th>#</th><th>Patient</th><th>Room</th><th><HeartPulse size={12} /> HR</th><th>Blood pressure</th>
                <th><Wind size={12} /> Resp.</th><th><Activity size={12} /> SpO2</th><th><Thermometer size={12} /> Temp.</th><th>Status</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient, index) => {
                const vitals = patient.latestVitals || {};
                const isCritical = patient.severity === "Critical";
                return (
                  <tr key={patient.id || patient._id} onClick={() => onOpenPatient(patient)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenPatient(patient); }}>
                    <td><span className="icu-roster-index">{String(index + 1).padStart(2, "0")}</span></td>
                    <td>
                      <span className="icu-roster-patient">
                        <span><strong>{patientName(patient)}</strong><small>{patient.ellyId || patient.patientId} · {patient.severity || "Stable"}</small></span>
                      </span>
                    </td>
                    <td><span className="icu-roster-room"><strong>{patient.roomId || "ICU"}</strong><small>Bed {patient.bedId || "--"}</small></span></td>
                    <td><VitalCell value={vitals.heartRate} unit="bpm" alert={isCritical} /></td>
                    <td><VitalCell value={vitals.bloodPressure || (vitals.systolic ? `${vitals.systolic}/${vitals.diastolic ?? "--"}` : null)} unit="mmHg" /></td>
                    <td><VitalCell value={vitals.respiratoryRate} unit="/min" /></td>
                    <td><VitalCell value={vitals.oxygenSaturation} unit="%" alert={Number(vitals.oxygenSaturation) < 92} /></td>
                    <td><VitalCell value={vitals.temperature} unit="°C" /></td>
                    <td><span className="icu-roster-status" data-severity={patient.severity || "Stable"}>{patient.severity || "Stable"}</span></td>
                    <td><span className="icu-roster-update"><Clock3 size={12} />{formatAge(patient.latestUpdateAt || vitals.recordedAt)}{patient.activeAlerts?.some((alert) => alert.status === "ACTIVE") ? <AlertTriangle size={12} className="icu-roster-alert" /> : null}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

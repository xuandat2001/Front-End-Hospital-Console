import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BedDouble, Scissors, X } from "lucide-react";
import { patientAccessService } from "../../../services/core-modules/patientAccessApi";
import { patientService } from "../../../services/core-modules/patientApi";
import { diagnosticsService } from "../../../services/diagnostics/diagnosticsApi";
import { hospitalService, admissionService } from "../../../services/core-modules/hospitalApi";
import { roomService } from "../../../services/core-modules/roomApi";
import { surgeryRequestService } from "../../../services/core-modules/surgeryRequestApi";
import useSessionStore from "../../../store/useSessionStore";
import usePatientSearchStore from "../../../store/usePatientSearchStore";
import PatientRecordView from "./record/PatientRecordView";
import {
  formatSurgeryTime,
  getSurgeryCalendarSlot,
} from "../../operations/surgery/surgeryTimeUtils";

const STATUS_META = {
  PENDING: { label: "Pending", color: "#F59E0B" },
  APPROVED: { label: "Approved", color: "#22C55E" },
  DENIED: { label: "Denied", color: "#EF4444" },
  REVOKED: { label: "Revoked", color: "#6B7280" },
};

const emptySurgeryForm = {
  procedureName: "",
  diagnosis: "",
  surgeryType: "ELECTIVE",
  scheduledDate: "",
  startTime: "",
  endTime: "",
  anesthesiaType: "GENERAL",
  operatingRoom: "",
  notes: "",
};

const emptyDiagnosticOrderForm = {
  testType: "",
  priority: "MEDIUM",
  bodyRegion: "",
  sampleType: "",
  description: "",
};

const DIAGNOSTIC_PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function SurgeryRoomScheduleView({
  roomSchedule,
  loading,
  selectedRoom,
  weekOffset,
  onWeekOffsetChange,
}) {
  if (loading) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
        Loading room schedule...
      </p>
    );
  }

  if (!selectedRoom) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Select an operating room to view requested and scheduled bookings.
      </p>
    );
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const grid = {};
  const spanMap = {};
  for (const booking of roomSchedule) {
    const slot = getSurgeryCalendarSlot(booking);
    if (!slot || slot.start < weekStart || slot.start > weekEnd) continue;
    const { dayIdx, startHour, rowSpan } = slot;
    if (!grid[dayIdx]) grid[dayIdx] = {};
    if (!grid[dayIdx][startHour]) grid[dayIdx][startHour] = [];
    if (!spanMap[dayIdx]) spanMap[dayIdx] = {};
    spanMap[dayIdx][startHour] = Math.max(spanMap[dayIdx][startHour] || 1, rowSpan);
    grid[dayIdx][startHour].push({ ...booking, _rowSpan: rowSpan });
  }

  const weekLabel = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  const todayStr = now.toDateString();

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
            Surgery Room Schedule
          </p>
          <p className="text-[10px] text-rose-500 dark:text-rose-400">
            {selectedRoom} · {roomSchedule.length} booking{roomSchedule.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onWeekOffsetChange((offset) => offset - 1)}
            className="rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/50"
            aria-label="Previous week"
          >
            {"<"}
          </button>
          <span className="min-w-[9.5rem] text-center text-[10px] font-semibold text-rose-700 dark:text-rose-300">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => onWeekOffsetChange((offset) => offset + 1)}
            className="rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/50"
            aria-label="Next week"
          >
            {">"}
          </button>
          <button
            type="button"
            onClick={() => onWeekOffsetChange(0)}
            className="rounded-lg bg-rose-200 px-2 py-1 text-[10px] font-bold text-rose-800 hover:bg-rose-300 dark:bg-rose-900/60 dark:text-rose-200"
          >
            Today
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-950">
        <table className="w-full min-w-[620px] text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 w-12 border-b border-r border-rose-200 bg-rose-100 p-1 text-center text-[10px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-300">
                Hour
              </th>
              {days.map((day, index) => {
                const dayDate = new Date(weekStart);
                dayDate.setDate(weekStart.getDate() + index);
                const isToday = dayDate.toDateString() === todayStr;
                return (
                  <th
                    key={day}
                    className={`sticky top-0 z-10 border-b border-r border-rose-200 p-1 text-center text-[10px] font-semibold dark:border-rose-900/60 ${
                      isToday
                        ? "bg-rose-200 text-rose-950 dark:bg-rose-800 dark:text-rose-100"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {day}
                    <br />
                    <span className="text-[9px] opacity-70">{dayDate.getDate()}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="sticky left-0 z-10 border-b border-r border-rose-200 bg-rose-50 p-1 text-center text-[10px] font-medium text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-300">
                  {hour.toString().padStart(2, "0")}:00
                </td>
                {days.map((_, dayIdx) => {
                  const skipFrom = spanMap[dayIdx];
                  let skip = false;
                  for (let h = hour - 1; h >= 0; h -= 1) {
                    if (skipFrom?.[h] && h + skipFrom[h] > hour) {
                      skip = true;
                      break;
                    }
                  }
                  if (skip) return null;

                  if (spanMap[dayIdx]?.[hour] && hour < 23) {
                    const bookedHours = spanMap[dayIdx][hour];
                    const bookings = grid[dayIdx]?.[hour] || [];
                    return (
                      <td
                        key={dayIdx}
                        rowSpan={bookedHours}
                        className="h-10 border-b border-r border-rose-100 align-top dark:border-rose-900/50"
                      >
                        {bookings.map((booking) => (
                          <div
                            key={booking._id}
                            className={`mx-0.5 mb-0.5 overflow-hidden rounded px-2 py-1 text-[9px] leading-tight ${
                              booking.status === "SCHEDULED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200"
                            }`}
                            style={{ minHeight: `calc(${booking._rowSpan} * 2.5rem - 0.25rem)` }}
                            title={`${booking.procedureName || "Surgery"} - ${booking.primarySurgeonId || ""}`}
                          >
                            <span className="block truncate font-semibold">
                              {booking.procedureName || "Surgery"}
                            </span>
                            <span className="block truncate text-[8px] opacity-80">
                              {formatSurgeryTime(booking.startTime || booking.scheduledDate, booking.scheduledDate)}
                              {" - "}
                              {formatSurgeryTime(booking.endTime, booking.scheduledDate)}
                            </span>
                          </div>
                        ))}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={dayIdx}
                      className="h-10 border-b border-r border-rose-100 align-top dark:border-rose-900/50"
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DoctorPatients() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const workspace = useSessionStore((state) => state.workspace);
  const activeEllyId = usePatientSearchStore((state) => state.activeEllyId);
  const clearActiveEllyId = usePatientSearchStore((state) => state.clearActiveEllyId);
  const setActiveEllyId = usePatientSearchStore((state) => state.setActiveEllyId);

  const doctorId = currentUser?.ellyId || "";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [surgeryRooms, setSurgeryRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [admitPatient, setAdmitPatient] = useState(null);
  const [admitHospitalId, setAdmitHospitalId] = useState("");
  const [admitDepartmentId, setAdmitDepartmentId] = useState("");
  const [admitReason, setAdmitReason] = useState("");
  const [admitting, setAdmitting] = useState(false);
  const [surgeryPatient, setSurgeryPatient] = useState(null);
  const [surgeryForm, setSurgeryForm] = useState(emptySurgeryForm);
  const [surgerySubmitting, setSurgerySubmitting] = useState(false);
  const [surgeryRoomSchedule, setSurgeryRoomSchedule] = useState([]);
  const [surgeryScheduleLoading, setSurgeryScheduleLoading] = useState(false);
  const [surgeryScheduleWeekOffset, setSurgeryScheduleWeekOffset] = useState(0);
  const [diagnosticPatient, setDiagnosticPatient] = useState(null);
  const [diagnosticDepartment, setDiagnosticDepartment] = useState(null);
  const [diagnosticOrderForm, setDiagnosticOrderForm] = useState(emptyDiagnosticOrderForm);
  const [diagnosticSubmitting, setDiagnosticSubmitting] = useState(false);
  const [myPatientsSearch, setMyPatientsSearch] = useState("");

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = useCallback(() => {
    patientAccessService
      .getAll({ doctorId })
      .then((res) => setRequests(res.data || []))
      .catch((error) => {
        console.error("Failed to load patient access requests:", error);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) return;
    loadRequests();
  }, [loadRequests, doctorId]);

  const loadAdmissions = useCallback(() => {
    admissionService
      .getAllAdmissionsWithPatient()
      .then((res) => setAdmissions(res.data || []))
      .catch((error) => {
        console.error("Failed to load admissions:", error);
      });
  }, []);

  useEffect(() => {
    Promise.all([
      hospitalService.getAllHospitals(),
      hospitalService.getAllDepartmentsList(),
      roomService.getAllRooms(),
    ])
      .then(([hospRes, depts, roomRes]) => {
        setHospitals(hospRes.data || []);
        setDepartments(depts || []);
        setSurgeryRooms(
          (roomRes.data || []).filter((room) => (room.roomType || room.type) === "SURGERY"),
        );
      })
      .catch((error) => {
        console.error("Failed to load admit data:", error);
      });
    loadAdmissions();
  }, [loadAdmissions]);

  const approvedPatients = useMemo(
    () => requests.filter((r) => r.status === "APPROVED"),
    [requests],
  );
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "PENDING"),
    [requests],
  );
  const closedRequests = useMemo(
    () => requests.filter((r) => r.status === "DENIED" || r.status === "REVOKED"),
    [requests],
  );

  const approvedByEllyId = useMemo(() => {
    const map = {};
    for (const r of approvedPatients) map[r.patientId] = r;
    return map;
  }, [approvedPatients]);

  const visibleApprovedPatients = useMemo(() => {
    const query = myPatientsSearch.trim().toLowerCase();
    if (!query) return approvedPatients;
    return approvedPatients.filter((request) => {
      const haystack = [
        request.patientName,
        request.patientId,
        request.ellyId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [approvedPatients, myPatientsSearch]);

  const activeAdmissionPatientIds = useMemo(() => {
    const ids = new Set();
    for (const a of admissions) {
      if (a.currentStatus !== "DISCHARGED") ids.add(a.patientId);
    }
    return ids;
  }, [admissions]);

  const admitHospital = useMemo(
    () =>
      hospitals.find((h) => h.ellyHospitalId === admitHospitalId) ||
      hospitals[0] ||
      null,
    [hospitals, admitHospitalId],
  );

  const admitDepartments = useMemo(() => {
    if (!admitHospital) return [];
    return departments.filter(
      (d) =>
        String(d.status || "").toUpperCase() === "ACTIVE" &&
        (d.hospitalId === admitHospital.ellyHospitalId ||
          d.hospitalId === admitHospital._id ||
          d.hospital?.ellyHospitalId === admitHospital.ellyHospitalId),
    );
  }, [departments, admitHospital]);

  const effectiveAdmitDepartmentId =
    admitDepartmentId ||
    admitDepartments[0]?.ellyDepartmentId ||
    admitDepartments[0]?._id ||
    "";

  const openAdmit = (request) => {
    setAdmitPatient(request);
    setAdmitHospitalId("");
    setAdmitDepartmentId("");
    setAdmitReason("");
  };

  const closeAdmit = () => {
    setAdmitPatient(null);
    setAdmitReason("");
  };

  const loadSurgeryRoomSchedule = useCallback((roomId) => {
    if (!roomId) {
      setSurgeryRoomSchedule([]);
      setSurgeryScheduleLoading(false);
      return;
    }

    setSurgeryScheduleLoading(true);
    Promise.all([
      surgeryRequestService.getAll({ operatingRoom: roomId, status: "REQUESTED" }),
      surgeryRequestService.getAll({ operatingRoom: roomId, status: "SCHEDULED" }),
    ])
      .then(([requested, scheduled]) => {
        const bookings = [...(requested.data || []), ...(scheduled.data || [])];
        bookings.sort(
          (a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0),
        );
        setSurgeryRoomSchedule(bookings);
      })
      .catch((error) => {
        console.error("Failed to load surgery room schedule:", error);
        setSurgeryRoomSchedule([]);
      })
      .finally(() => setSurgeryScheduleLoading(false));
  }, []);

  const openSurgeryRequest = (request) => {
    setSurgeryPatient(request);
    setSurgeryForm(emptySurgeryForm);
    setSurgeryRoomSchedule([]);
    setSurgeryScheduleWeekOffset(0);
  };

  const closeSurgeryRequest = () => {
    setSurgeryPatient(null);
    setSurgeryForm(emptySurgeryForm);
    setSurgeryRoomSchedule([]);
    setSurgeryScheduleLoading(false);
    setSurgeryScheduleWeekOffset(0);
  };

  const openDiagnosticOrder = (request, department) => {
    setDiagnosticPatient(request);
    setDiagnosticDepartment(department);
    setDiagnosticOrderForm(emptyDiagnosticOrderForm);
  };

  const closeDiagnosticOrder = () => {
    setDiagnosticPatient(null);
    setDiagnosticDepartment(null);
    setDiagnosticOrderForm(emptyDiagnosticOrderForm);
  };

  const handleDiagnosticOrderChange = (event) => {
    const { name, value } = event.target;
    setDiagnosticOrderForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDiagnosticOrderSubmit = async () => {
    if (!diagnosticPatient || !diagnosticDepartment) return;
    if (!diagnosticOrderForm.testType.trim()) {
      showToast("Add the diagnostic test name.", "error");
      return;
    }

    setDiagnosticSubmitting(true);
    try {
      await diagnosticsService.create({
        ellyId: diagnosticPatient.patientId,
        department: diagnosticDepartment,
        testType: diagnosticOrderForm.testType.trim(),
        priority: diagnosticOrderForm.priority,
        bodyRegion:
          diagnosticDepartment === "RADIOLOGY"
            ? diagnosticOrderForm.bodyRegion.trim()
            : undefined,
        sampleType:
          diagnosticDepartment === "LABORATORY"
            ? diagnosticOrderForm.sampleType.trim()
            : undefined,
        description: diagnosticOrderForm.description.trim(),
        metadata: { source: "DOCTOR_ORDER" },
      });

      showToast(
        `${diagnosticDepartment === "RADIOLOGY" ? "Radiology" : "Laboratory"} order sent for ${diagnosticPatient.patientName || diagnosticPatient.patientId}.`,
      );
      closeDiagnosticOrder();
    } catch (error) {
      showToast(error.message || "Failed to send diagnostic order.", "error");
    } finally {
      setDiagnosticSubmitting(false);
    }
  };

  const handleSurgeryFormChange = (event) => {
    const { name, value } = event.target;
    setSurgeryForm((prev) => ({ ...prev, [name]: value }));
    if (name === "operatingRoom") {
      setSurgeryScheduleWeekOffset(0);
      loadSurgeryRoomSchedule(value);
    }
  };

  const parseSurgeryDateTime = (timeValue) => {
    if (!surgeryForm.scheduledDate || !timeValue) return null;
    const parsed = new Date(`${surgeryForm.scheduledDate}T${timeValue}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleSurgerySubmit = async () => {
    if (!surgeryPatient) return;
    if (
      !surgeryForm.procedureName.trim() ||
      !surgeryForm.diagnosis.trim() ||
      !surgeryForm.scheduledDate ||
      !surgeryForm.startTime ||
      !surgeryForm.endTime
    ) {
      showToast("Fill in the required surgery request fields.", "error");
      return;
    }

    const startTime = parseSurgeryDateTime(surgeryForm.startTime);
    const endTime = parseSurgeryDateTime(surgeryForm.endTime);
    const scheduledDate = new Date(`${surgeryForm.scheduledDate}T00:00`);
    if (!startTime || !endTime) {
      showToast("Select a valid surgery date and time.", "error");
      return;
    }
    if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);

    setSurgerySubmitting(true);
    try {
      await surgeryRequestService.create({
        patientId: surgeryPatient.patientId,
        procedureName: surgeryForm.procedureName.trim(),
        diagnosis: surgeryForm.diagnosis.trim(),
        surgeryType: surgeryForm.surgeryType,
        scheduledDate: scheduledDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        anesthesiaType: surgeryForm.anesthesiaType,
        operatingRoom: surgeryForm.operatingRoom,
        notes: surgeryForm.notes.trim(),
        primarySurgeonId: doctorId,
        hospitalId: workspace?.ellyHospitalId || workspace?.id || "",
        departmentId: currentUser?.departmentId || "",
        status: "REQUESTED",
      });

      showToast(`Surgery request sent for ${surgeryPatient.patientName || surgeryPatient.patientId}.`);
      closeSurgeryRequest();
    } catch (error) {
      showToast(error.message || "Failed to submit surgery request.", "error");
    } finally {
      setSurgerySubmitting(false);
    }
  };

  const handleAdmitSubmit = async () => {
    if (!admitPatient) return;
    if (!admitHospital) {
      showToast("No hospital available to admit to.", "error");
      return;
    }
    if (!effectiveAdmitDepartmentId) {
      showToast("Select a department for the admission.", "error");
      return;
    }
    if (!admitReason.trim()) {
      showToast("Add an admission reason.", "error");
      return;
    }

    const department = admitDepartments.find(
      (d) => (d.ellyDepartmentId || d._id) === effectiveAdmitDepartmentId,
    );

    setAdmitting(true);
    try {
      await admissionService.createAdmission({
        patientId: admitPatient.patientId,
        hospitalId: admitHospital.ellyHospitalId,
        department: {
          id: department?.ellyDepartmentId || effectiveAdmitDepartmentId,
          name: department?.name || "General",
        },
        admissionReason: admitReason.trim(),
        doctor: { id: doctorId, name: currentUser?.fullName || "Unknown" },
        currentStatus: "ADMITTED",
      });

      showToast(
        `${admitPatient.patientName || admitPatient.patientId} admitted to ${admitHospital.hospitalName}. The hospital admin will assign a room and bed.`,
      );
      setAdmitPatient(null);
      setAdmitReason("");
      loadAdmissions();
    } catch (submitError) {
      showToast(submitError.message || "Failed to admit patient.", "error");
    } finally {
      setAdmitting(false);
    }
  };

  if (activeEllyId) {
    const approvedRequest = approvedByEllyId[activeEllyId];

    if (!approvedRequest) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/60 bg-white/55 p-6 text-center shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              Access not approved
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {doctorId
                ? "You don't have approved access to this patient's medical history yet. Send an access request, and once the patient approves, you can open their record here."
                : "Sign in as a doctor to view your approved patients."}
            </p>
            <button
              type="button"
              onClick={() => clearActiveEllyId()}
              className="mt-4 rounded-xl border border-indigo-500/40 bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Back to My Patients
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/55 px-4 py-2.5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/45">
          <button
            type="button"
            onClick={() => clearActiveEllyId()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft size={14} />
            Back to My Patients
          </button>
          <p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">
            {approvedRequest.patientName || activeEllyId} · Approved access
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PatientRecordView
            ellyId={activeEllyId}
            workspace={workspace}
            initialTab="overview"
            allowUnregistered
          />
        </div>
      </div>
    );
  }

  const handleOpenPatient = (ellyId) => {
    setActiveEllyId(ellyId, { openDashboard: true });
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setSearched(true);
    setSelectedPatient(null);
    try {
      const res = await patientService.getAllPatients({ search: query });
      setSearchResults(res.data || []);
    } catch (error) {
      console.error("Failed to search patients:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedPatient) {
      showToast("Select a patient from the search results.", "error");
      return;
    }
    if (!purpose.trim()) {
      showToast("Add a reason for requesting access.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await patientAccessService.create({
        doctorId,
        doctorName: currentUser?.fullName || "",
        patientId: selectedPatient.ellyId || selectedPatient._id,
        hospitalId: workspace?.ellyHospitalId || workspace?.id || "",
        purpose: purpose.trim(),
      });

      showToast(
        res.message ||
          (res.data?.status === "PENDING"
            ? "Access request sent. Waiting for patient approval."
            : "Access request created."),
      );
      setShowRequestForm(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPatient(null);
      setPurpose("");
      setSearched(false);
      loadRequests();
    } catch (error) {
      showToast(error.message || "Failed to send access request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pb-3 pt-3 sm:px-5">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/55 px-4 py-3 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-950 dark:text-white sm:text-xl">
            My Patients
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {approvedPatients.length} approved · {pendingRequests.length} pending
            {doctorId ? ` · Dr. ${currentUser?.fullName || doctorId}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequestForm((v) => !v)}
          className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {showRequestForm ? "Close" : "+ Request Access"}
        </button>
      </header>

      {showRequestForm && (
        <section className="shrink-0 rounded-2xl border border-white/60 bg-white/55 p-4 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
          <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
            Request Patient Access
          </h2>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search patient by name or Elly ID..."
              className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="rounded-xl border border-violet-500/40 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          {searched && !searching && (
            <div className="mb-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              {searchResults.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  No patients matched “{searchQuery}”.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {searchResults.map((patient) => {
                    const patientKey = patient.ellyId || patient._id;
                    const isSelected = selectedPatient?.ellyId === patient.ellyId;
                    const existingStatus = requests.find(
                      (r) => r.patientId === patientKey && r.status === "APPROVED",
                    )
                      ? "APPROVED"
                      : requests.find((r) => r.patientId === patientKey)
                        ? "REQUESTED"
                        : null;

                    return (
                      <li key={patientKey}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(patient)}
                          className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                            isSelected ? "bg-violet-50 dark:bg-violet-900/30" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {patient.fullName}
                            </span>
                            <span className="block truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {patientKey}
                            </span>
                          </span>
                          {existingStatus ? (
                            <span
                              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                                existingStatus === "APPROVED"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              }`}
                            >
                              {existingStatus === "APPROVED"
                                ? "Already approved"
                                : "Request already sent"}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Select
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {selectedPatient && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-300/50 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-500/40 dark:bg-indigo-950/30">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedPatient.fullName}
                </p>
                <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedPatient.ellyId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Remove
              </button>
            </div>
          )}

          <textarea
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Reason for requesting access (e.g. follow-up consultation, second opinion)"
            className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
          />

          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send Request to Patient"}
          </button>
        </section>
      )}

      {diagnosticPatient && diagnosticDepartment && (
        <section className="shrink-0 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm ring-1 ring-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:ring-sky-900/20">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Request {diagnosticDepartment === "RADIOLOGY" ? "Radiology" : "Lab"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {diagnosticPatient.patientName || diagnosticPatient.patientId} · {diagnosticPatient.patientId}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDiagnosticOrder}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <X size={13} />
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Test
              <input
                name="testType"
                value={diagnosticOrderForm.testType}
                onChange={handleDiagnosticOrderChange}
                placeholder={diagnosticDepartment === "RADIOLOGY" ? "Chest X-ray" : "CBC"}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Priority
              <select
                name="priority"
                value={diagnosticOrderForm.priority}
                onChange={handleDiagnosticOrderChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {DIAGNOSTIC_PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {diagnosticDepartment === "RADIOLOGY" ? "Body region" : "Sample type"}
            <input
              name={diagnosticDepartment === "RADIOLOGY" ? "bodyRegion" : "sampleType"}
              value={diagnosticDepartment === "RADIOLOGY" ? diagnosticOrderForm.bodyRegion : diagnosticOrderForm.sampleType}
              onChange={handleDiagnosticOrderChange}
              placeholder={diagnosticDepartment === "RADIOLOGY" ? "Chest" : "Blood"}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="mt-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Notes
            <textarea
              name="description"
              value={diagnosticOrderForm.description}
              onChange={handleDiagnosticOrderChange}
              rows={3}
              placeholder="Clinical reason or instructions"
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDiagnosticOrder}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDiagnosticOrderSubmit}
              disabled={diagnosticSubmitting || !diagnosticOrderForm.testType.trim()}
              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {diagnosticSubmitting ? "Sending..." : "Send order"}
            </button>
          </div>
        </section>
      )}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,0.42fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
          <div className="shrink-0 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Patients I Take Care Of
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {visibleApprovedPatients.length} of {approvedPatients.length} approved · medical history unlocked
                </p>
              </div>
              <input
                type="text"
                value={myPatientsSearch}
                onChange={(event) => setMyPatientsSearch(event.target.value)}
                placeholder="Search name or Elly ID..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400 sm:w-64"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {approvedPatients.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No approved patients yet. Use “+ Request Access” to ask a patient
                to share their medical history. Once they approve, they appear
                here and you can open their record.
              </p>
            ) : visibleApprovedPatients.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No approved patients matched “{myPatientsSearch}”.
              </p>
            ) : (
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60">
                  <tr>
                    <th className="w-[18%] p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Patient
                    </th>
                    <th className="w-[24%] p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Purpose
                    </th>
                    <th className="w-[22%] p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Care
                    </th>
                    <th className="w-[22%] p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      Orders
                    </th>
                    <th className="w-[14%] p-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      Record
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleApprovedPatients.map((request) => (
                    <tr
                      key={request._id}
                      className="border-t border-slate-200 dark:border-slate-700/60"
                    >
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {request.patientName || request.patientId}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {request.patientId}
                        </p>
                      </td>
                      <td className="max-w-[200px] truncate p-3 text-xs text-slate-500 dark:text-slate-400">
                        {request.purpose || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {activeAdmissionPatientIds.has(request.patientId) ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <BedDouble size={12} />
                              Active admission
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAdmit(request)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                            >
                              <BedDouble size={13} />
                              Admit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openSurgeryRequest(request)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                          >
                            <Scissors size={13} />
                            Surgery
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDiagnosticOrder(request, "LABORATORY")}
                            className="rounded-md border border-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                          >
                            Lab
                          </button>
                          <button
                            type="button"
                            onClick={() => openDiagnosticOrder(request, "RADIOLOGY")}
                            className="rounded-md border border-violet-500 px-2.5 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/30"
                          >
                            Radiology
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPatient(request.patientId)}
                          className="rounded-md border border-violet-500 px-3 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/30"
                        >
                          View Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pending Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Awaiting patient confirmation
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 dark:text-slate-400">
                  No pending requests.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {pendingRequests.map((request) => (
                    <li
                      key={request._id}
                      className="flex items-center justify-between gap-2 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {request.patientName || request.patientId}
                        </p>
                        <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {request.patientId}
                        </p>
                        {request.purpose && (
                          <p className="mt-1 truncate text-[10px] text-slate-400">
                            {request.purpose}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={request.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {closedRequests.length > 0 && (
            <section className="shrink-0 rounded-2xl border border-white/60 bg-white/55 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
              <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Closed Requests
                </h2>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {closedRequests.map((request) => (
                  <li
                    key={request._id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800 dark:text-slate-200">
                        {request.patientName || request.patientId}
                      </p>
                      <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {request.patientId}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {admitPatient && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admit-patient-title"
          onClick={closeAdmit}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0">
                <h2
                  id="admit-patient-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Admit Patient
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {admitPatient.patientName || admitPatient.patientId}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdmit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </label>
                <input
                  type="text"
                  value={`${admitPatient.patientName || admitPatient.patientId} · ${admitPatient.patientId}`}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Hospital
                </label>
                <select
                  value={admitHospital?.ellyHospitalId || ""}
                  onChange={(e) => {
                    setAdmitHospitalId(e.target.value);
                    setAdmitDepartmentId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {hospitals.length === 0 && <option value="">No hospitals</option>}
                  {hospitals.map((h) => (
                    <option key={h.ellyHospitalId || h._id} value={h.ellyHospitalId}>
                      {h.hospitalName}
                    </option>
                  ))}
                </select>
                {admitHospital && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {admitHospital.hospitalName} ·{" "}
                    <span className="font-mono">{admitHospital.ellyHospitalId}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Department
                </label>
                <select
                  value={effectiveAdmitDepartmentId}
                  onChange={(e) => setAdmitDepartmentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {admitDepartments.length === 0 && (
                    <option value="">No active departments</option>
                  )}
                  {admitDepartments.map((d) => (
                    <option
                      key={d.ellyDepartmentId || d._id}
                      value={d.ellyDepartmentId || d._id}
                    >
                      {d.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  Chosen by you — the admin assigns the room and bed later.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Admission Reason
                </label>
                <textarea
                  rows={3}
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  placeholder="Why does this patient need to be admitted?"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Admitting Doctor
                </label>
                <input
                  type="text"
                  value={`${currentUser?.fullName || "Unknown"}${doctorId ? ` (${doctorId})` : ""}`}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={closeAdmit}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdmitSubmit}
                disabled={admitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <BedDouble size={14} />
                {admitting ? "Admitting…" : "Admit Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {surgeryPatient && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="surgery-request-title"
          onClick={closeSurgeryRequest}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0">
                <h2
                  id="surgery-request-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Request Surgery
                </h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {surgeryPatient.patientName || surgeryPatient.patientId} · {surgeryPatient.patientId}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSurgeryRequest}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1fr)]">
              <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </span>
                <input
                  type="text"
                  value={`${surgeryPatient.patientName || surgeryPatient.patientId} · ${surgeryPatient.patientId}`}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Surgery Type
                </span>
                <select
                  name="surgeryType"
                  value={surgeryForm.surgeryType}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="ELECTIVE">Elective</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Procedure Name *
                </span>
                <input
                  type="text"
                  name="procedureName"
                  value={surgeryForm.procedureName}
                  onChange={handleSurgeryFormChange}
                  placeholder="e.g. Appendectomy"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Diagnosis *
                </span>
                <input
                  type="text"
                  name="diagnosis"
                  value={surgeryForm.diagnosis}
                  onChange={handleSurgeryFormChange}
                  placeholder="e.g. Acute appendicitis"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Surgery Date *
                </span>
                <input
                  type="date"
                  name="scheduledDate"
                  value={surgeryForm.scheduledDate}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Anesthesia Type
                </span>
                <select
                  name="anesthesiaType"
                  value={surgeryForm.anesthesiaType}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="GENERAL">General</option>
                  <option value="LOCAL">Local</option>
                  <option value="REGIONAL">Regional</option>
                  <option value="SEDATION">Sedation</option>
                  <option value="NONE">None</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Start Time *
                </span>
                <input
                  type="time"
                  name="startTime"
                  value={surgeryForm.startTime}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  End Time *
                </span>
                <input
                  type="time"
                  name="endTime"
                  value={surgeryForm.endTime}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Operating Room
                </span>
                <select
                  name="operatingRoom"
                  value={surgeryForm.operatingRoom}
                  onChange={handleSurgeryFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select operating room</option>
                  {surgeryRooms.map((room) => (
                    <option key={room._id || room.ellyId} value={room.roomNumber || room.name || room._id}>
                      {room.roomNumber || room.name || room.ellyId || room._id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </span>
                <textarea
                  name="notes"
                  rows={3}
                  value={surgeryForm.notes}
                  onChange={handleSurgeryFormChange}
                  placeholder="Additional details or instructions..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </label>
              </div>

              <SurgeryRoomScheduleView
                roomSchedule={surgeryRoomSchedule}
                loading={surgeryScheduleLoading}
                selectedRoom={surgeryForm.operatingRoom}
                weekOffset={surgeryScheduleWeekOffset}
                onWeekOffsetChange={setSurgeryScheduleWeekOffset}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={closeSurgeryRequest}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSurgerySubmit}
                disabled={surgerySubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Scissors size={14} />
                {surgerySubmitting ? "Submitting…" : "Submit Surgery Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

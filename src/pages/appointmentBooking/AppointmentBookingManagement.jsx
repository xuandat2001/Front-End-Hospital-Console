import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppointmentBookingDetailModal from "../../components/appointment-booking/AppointmentBookingDetailModal";
import { toast } from "../../components/Toast";
import { appointmentService } from "../../services/appointmentBooking/appointmentApi";
import { appointmentQuery, invalidateAppointmentQueries, setAppointmentQueryData } from "../../services/appointmentBooking/appointmentQueryCache";
import { connectAppointmentRealtime } from "../../services/appointmentBooking/appointmentRealtimeApi";
import { hospitalService } from "../../services/core-modules/hospitalApi";
import { staffService } from "../../services/core-modules/staffApi";
import useSessionStore from "../../store/useSessionStore";
import AppointmentCreateModal from "./components/AppointmentCreateModal";
import AppointmentUpdateModal from "./components/AppointmentUpdateModal";
import useAppointmentFilters from "./hooks/useAppointmentFilters";
import DashboardTab from "./tabs/DashboardTab";
import PerformanceTab from "./tabs/PerformanceTab";
import PlanningTab from "./tabs/PlanningTab";
import ResourcesTab from "./tabs/ResourcesTab";
import ReportsTab from "./tabs/ReportsTab";
import { convertToDateTimeLocal, formatDateTime, getLocalDateKey } from "./utils/appointmentHelpers";

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false };

function dashboardAdapter(data = {}) {
  const today = data.today || {};
  const typeRows = Object.entries(data.appointmentTypes || {}).map(([name, count]) => ({ name, count }));
  const departments = (data.departmentDemand || []).map((row) => ({ name: row.name || String(row._id || "Unknown"), count: row.count }));
  const doctors = (data.doctorWorkload || []).map((row) => ({ name: row.name || String(row._id || "Unknown"), department: row.specialization || "", count: row.count }));
  return {
    statusSummary: { active: today.booked || 0, completed: today.completed || 0, cancelled: today.canceled || 0, noShow: today.noShow || 0 },
    dashboardData: {
      typeRows,
      departmentRows: departments,
      doctorRows: doctors,
      aiInsights: [
        `${departments[0]?.name || "No department"} has the highest appointment load today.`,
        `${today.canceled || 0} appointment${today.canceled === 1 ? " is" : "s are"} cancelled today.`,
        `${doctors[0]?.name || "No doctor"} has the most active workload today.`,
      ],
    },
  };
}

function mergeAppointment(current, incoming) {
  if (!current) return incoming;
  return {
    ...current,
    ...incoming,
    patient: { ...(current.patient || {}), ...(incoming.patient || {}) },
    doctor: { ...(current.doctor || {}), ...(incoming.doctor || {}) },
    department: { ...(current.department || {}), ...(incoming.department || {}) },
    hospital: { ...(current.hospital || {}), ...(incoming.hospital || {}) },
  };
}

function matchesListFilters(appointment, filters, keyword) {
  if (filters.status && String(appointment.status).toUpperCase() !== filters.status) return false;
  if (filters.departmentId && String(appointment.department?.id || appointment.departmentId || "") !== String(filters.departmentId)) return false;
  if (filters.doctorId && String(appointment.doctor?.id || appointment.doctorId || "") !== String(filters.doctorId)) return false;
  if (filters.date && getLocalDateKey(appointment.appointmentDateTime) !== filters.date) return false;
  if (keyword) {
    const searchable = [appointment.id, appointment._id, appointment.patient?.name, appointment.patient?.ellyId, appointment.doctor?.name, appointment.department?.name]
      .filter(Boolean).join(" ").toLowerCase();
    if (!searchable.includes(keyword.toLowerCase())) return false;
  }
  return true;
}

function incrementAggregateRow(rows = [], id, references = {}) {
  const key = String(id || "");
  const index = rows.findIndex((row) => String(row._id || "") === key);
  if (index < 0) return [...rows, { _id: id, count: 1, ...references }];
  return rows.map((row, rowIndex) => rowIndex === index ? { ...row, count: Number(row.count || 0) + 1, ...references } : row);
}

function addCreatedToDashboard(data = {}, appointment) {
  if (getLocalDateKey(appointment?.appointmentDateTime) !== getLocalDateKey(new Date())) return data;
  const type = appointment.consultationType || appointment.appointmentType || "UNKNOWN";
  return {
    ...data,
    today: { ...(data.today || {}), total: Number(data.today?.total || 0) + 1, booked: Number(data.today?.booked || 0) + 1 },
    appointmentTypes: { ...(data.appointmentTypes || {}), [type]: Number(data.appointmentTypes?.[type] || 0) + 1 },
    departmentDemand: incrementAggregateRow(data.departmentDemand, appointment.department?.id, { name: appointment.department?.name }),
    doctorWorkload: incrementAggregateRow(data.doctorWorkload, appointment.doctor?.id, { name: appointment.doctor?.name, specialization: appointment.doctor?.specialization }),
  };
}

export default function AppointmentBookingManagement({ activeTab = "dashboard" }) {
  const currentTab = String(activeTab || "dashboard").toLowerCase();
  const workspace = useSessionStore((state) => state.workspace);
  const hospitalId = workspace?.id || workspace?._id || "";
  const hospitalEllyId = workspace?.ellyHospitalId || workspace?.hospitalEllyId || workspace?.ellyId || "";
  const [appointments, setAppointments] = useState([]);
  const [paginationMeta, setPaginationMeta] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [dashboardResponse, setDashboardResponse] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const latestVersions = useRef(new Map());
  const createInFlight = useRef(false);
  const paginationRef = useRef({ currentPage: 1, itemsPerPage: 25 });
  const activeFiltersRef = useRef({ filters: {}, keyword: "" });

  const initialForm = useCallback(() => ({
    patientEllyId: "", hospitalId, hospitalEllyId, doctorId: "", departmentId: "",
    appointmentDate: "", appointmentDateTime: "", durationMinutes: "30",
    consultationType: "ONLINE", reason: "", notes: "",
  }), [hospitalEllyId, hospitalId]);
  const [formData, setFormData] = useState(initialForm);
  const [editFormData, setEditFormData] = useState({ appointmentDateTime: "", consultationType: "ONLINE", reason: "", notes: "" });
  const filtersState = useAppointmentFilters(appointments, paginationMeta);
  const { filters, pagination } = filtersState;
  const [debouncedSearch, setDebouncedSearch] = useState(filters.keyword);
  useEffect(() => {
    paginationRef.current = { currentPage: pagination.currentPage, itemsPerPage: pagination.itemsPerPage };
  }, [pagination.currentPage, pagination.itemsPerPage]);

  useEffect(() => {
    activeFiltersRef.current = { filters, keyword: debouncedSearch };
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.keyword.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [filters.keyword]);

  const listParams = useMemo(() => {
    const params = {
      page: pagination.currentPage,
      limit: pagination.itemsPerPage,
      search: debouncedSearch,
      status: filters.status,
      departmentId: filters.departmentId,
      doctorId: filters.doctorId,
      sort: "createdAt:desc",
    };
    if (filters.date) {
      params.dateFrom = `${filters.date}T00:00:00.000`;
      params.dateTo = `${filters.date}T23:59:59.999`;
    }
    return params;
  }, [debouncedSearch, filters.date, filters.departmentId, filters.doctorId, filters.status, pagination.currentPage, pagination.itemsPerPage]);

  const loadAppointments = useCallback(async ({ silent = false, force = false } = {}) => {
    if (currentTab !== "dashboard") return;
    try {
      if (!silent) setLoading(true);
      const response = await appointmentQuery({
        key: ["appointments", hospitalId, listParams],
        queryFn: () => appointmentService.getAppointments(listParams),
        staleTime: 30_000,
        force,
      });
      setAppointments(response.data || []);
      setPaginationMeta(response.pagination || EMPTY_PAGINATION);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      if (!silent) alert(error.message || "Failed to load appointments");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentTab, hospitalId, listParams]);

  const loadDashboard = useCallback(async ({ force = false } = {}) => {
    if (currentTab !== "dashboard") return;
    try {
      const response = await appointmentQuery({
        key: ["appointment-dashboard", hospitalId],
        queryFn: () => appointmentService.getAppointmentDashboard(),
        staleTime: 30_000,
        force,
      });
      setDashboardResponse(response.data || {});
    } catch (error) {
      console.warn("Appointment dashboard summary unavailable:", error.message);
    }
  }, [currentTab, hospitalId]);

  useEffect(() => { const timer = window.setTimeout(loadAppointments, 0); return () => window.clearTimeout(timer); }, [loadAppointments]);
  useEffect(() => { const timer = window.setTimeout(loadDashboard, 0); return () => window.clearTimeout(timer); }, [loadDashboard]);

  useEffect(() => {
    if (currentTab !== "dashboard") return undefined;
    const socket = connectAppointmentRealtime({
      onChanged: (event) => {
        const incoming = event?.appointment;
        if (!incoming?._id) return;
        const version = Number(event.version || new Date(incoming.updatedAt || 0).getTime());
        if (version && version <= (latestVersions.current.get(String(incoming._id)) || 0)) return;
        latestVersions.current.set(String(incoming._id), version);
        setAppointments((rows) => {
          const active = activeFiltersRef.current;
          const index = rows.findIndex((row) => String(row._id) === String(incoming._id));
          if (index < 0) return event.changeType === "CREATED" && paginationRef.current.currentPage === 1 && matchesListFilters(incoming, active.filters, active.keyword)
            ? [incoming, ...rows].slice(0, paginationRef.current.itemsPerPage)
            : rows;
          const merged = mergeAppointment(rows[index], incoming);
          if (!matchesListFilters(merged, active.filters, active.keyword)) return rows.filter((_, rowIndex) => rowIndex !== index);
          const next = [...rows]; next[index] = merged; return next;
        });
        setSelectedAppointment((current) => String(current?._id) === String(incoming._id) ? mergeAppointment(current, incoming) : current);
        invalidateAppointmentQueries(["appointments", hospitalId]);
        loadDashboard({ force: true });
      },
      onError: (error) => console.warn("Hospital appointment realtime connection failed:", error.message),
    });
    return () => socket.disconnect();
  }, [currentTab, hospitalId, loadDashboard]);

  useEffect(() => {
    if (!showForm || !hospitalId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setDepartmentsLoading(true);
      appointmentQuery({ key: ["appointment-departments", hospitalId], queryFn: () => hospitalService.getDepartmentsForHospital(hospitalId), staleTime: 10 * 60_000 }).then((response) => {
        if (active) setDepartments(response.data || []);
      }).catch((error) => alert(error.message || "Failed to load departments"))
        .finally(() => active && setDepartmentsLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [hospitalId, showForm]);

  useEffect(() => {
    if (!showForm || !formData.departmentId) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setDoctorsLoading(true);
      const selectedDepartment = departments.find((item) => String(item._id || item.id) === String(formData.departmentId));
      const departmentId = selectedDepartment?.ellyDepartmentId || formData.departmentId;
      appointmentQuery({ key: ["appointment-doctors", hospitalId, departmentId], queryFn: () => staffService.getDoctors({ hospitalId: hospitalEllyId || hospitalId, departmentId }), staleTime: 5 * 60_000 }).then((response) => {
        if (active) setDoctors(response.data || []);
      }).catch((error) => alert(error.message || "Failed to load doctors"))
        .finally(() => active && setDoctorsLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [departments, formData.departmentId, hospitalEllyId, hospitalId, showForm]);

  useEffect(() => {
    if (!showForm || !formData.doctorId || !formData.appointmentDate || !formData.durationMinutes) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setSlotsLoading(true);
      appointmentService.getDoctorAvailability({ doctorId: formData.doctorId, date: formData.appointmentDate, durationMinutes: formData.durationMinutes })
        .then((response) => active && setAvailableSlots(response.data?.slots || []))
        .catch(() => active && setAvailableSlots([]))
        .finally(() => active && setSlotsLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [formData.appointmentDate, formData.doctorId, formData.durationMinutes, showForm]);

  const updateLocal = (appointment) => {
    if (!appointment?._id) return;
    latestVersions.current.set(String(appointment._id), new Date(appointment.updatedAt || Date.now()).getTime());
    setAppointments((rows) => rows.map((row) => String(row._id) === String(appointment._id) ? mergeAppointment(row, appointment) : row));
    setSelectedAppointment((current) => String(current?._id) === String(appointment._id) ? mergeAppointment(current, appointment) : current);
  };

  const handleChange = ({ target: { name, value } }) => {
    setFormData((previous) => ({ ...previous, [name]: value,
      ...(name === "departmentId" ? { doctorId: "", appointmentDateTime: "" } : {}),
      ...(["doctorId", "appointmentDate", "durationMinutes"].includes(name) ? { appointmentDateTime: "" } : {}),
    }));
  };

  const handleCreate = async () => {
    if (createInFlight.current) return;
    if (!formData.patientEllyId.trim() || !formData.departmentId || !formData.doctorId || !formData.appointmentDateTime) return alert("Patient, department, doctor, and time are required");
    createInFlight.current = true;
    setCreatingAppointment(true);
    const createStarted = performance.now();
    try {
      const requestStarted = performance.now();
      const response = await appointmentService.createAppointment({
        patientEllyId: formData.patientEllyId.trim(), doctorId: formData.doctorId,
        departmentId: formData.departmentId, appointmentDateTime: new Date(formData.appointmentDateTime).toISOString(),
        durationMinutes: Number(formData.durationMinutes), consultationType: formData.consultationType,
        reason: formData.reason.trim(), notes: formData.notes.trim(),
      });
      const requestDuration = performance.now() - requestStarted;
      const created = response.data;
      const belongsToCurrentList = matchesListFilters(created, filters, debouncedSearch);
      setShowForm(false);
      setFormData(initialForm());
      toast("Appointment created successfully.", "success");
      if (created?._id) latestVersions.current.set(String(created._id), new Date(created.updatedAt || Date.now()).getTime());
      if (belongsToCurrentList && pagination.currentPage === 1) {
        setAppointments((rows) => [created, ...rows.filter((row) => String(row._id) !== String(created?._id))].slice(0, pagination.itemsPerPage));
      }
      if (belongsToCurrentList) {
        setPaginationMeta((meta) => {
          const total = meta.total + 1;
          return { ...meta, total, totalPages: Math.ceil(total / meta.limit) };
        });
      }
      setAppointmentQueryData(["appointments", hospitalId, listParams], (cached) => {
        if (!belongsToCurrentList) return cached;
        const total = Number(cached.pagination?.total || 0) + 1;
        return {
          ...cached,
          data: pagination.currentPage === 1
            ? [created, ...(cached.data || []).filter((row) => String(row._id) !== String(created?._id))].slice(0, pagination.itemsPerPage)
            : cached.data,
          pagination: { ...cached.pagination, total, totalPages: Math.ceil(total / pagination.itemsPerPage) },
        };
      });
      invalidateAppointmentQueries(["appointment-performance"]);
      invalidateAppointmentQueries(["appointment-planning"]);
      invalidateAppointmentQueries(["appointment-reports"]);
      setDashboardResponse((current) => addCreatedToDashboard(current, created));
      invalidateAppointmentQueries(["appointment-dashboard", hospitalId]);
      if (import.meta.env.DEV) {
        console.info(`[AppointmentCreatePerformance] request=${Math.round(requestDuration)}ms localSync=${Math.round(performance.now() - requestStarted - requestDuration)}ms total=${Math.round(performance.now() - createStarted)}ms`);
      }
    } catch (error) { alert(error.message || "Failed to create appointment"); }
    finally {
      createInFlight.current = false;
      setCreatingAppointment(false);
    }
  };

  const openUpdateModal = (appointment) => {
    setEditingAppointment(appointment);
    setEditFormData({ appointmentDateTime: convertToDateTimeLocal(appointment.appointmentDateTime), consultationType: appointment.consultationType || "ONLINE", reason: appointment.reason || "", notes: appointment.notes || "" });
  };
  const closeUpdateModal = () => setEditingAppointment(null);
  const handleUpdate = async () => {
    setUpdatingAppointment(true);
    try {
      const response = await appointmentService.updateAppointment(editingAppointment._id, { ...editFormData, appointmentDateTime: new Date(editFormData.appointmentDateTime).toISOString() });
      updateLocal(response.data); closeUpdateModal(); invalidateAppointmentQueries(["appointments", hospitalId]); loadDashboard({ force: true });
    } catch (error) { alert(error.message || "Failed to update appointment"); }
    finally { setUpdatingAppointment(false); }
  };
  const handleCancel = async (id) => {
    const reason = window.prompt("Cancellation reason?"); if (reason === null) return;
    try { const response = await appointmentService.cancelAppointment(id, reason); updateLocal(response.data); invalidateAppointmentQueries(["appointments", hospitalId]); loadDashboard({ force: true }); } catch (error) { alert(error.message || "Failed to cancel appointment"); }
  };
  const handleComplete = async (id) => {
    if (!window.confirm("Mark this appointment as completed?")) return;
    try { const response = await appointmentService.completeAppointment(id, { completedBy: "STAFF" }); updateLocal(response.data); invalidateAppointmentQueries(["appointments", hospitalId]); loadDashboard({ force: true }); } catch (error) { alert(error.message || "Failed to complete appointment"); }
  };

  const adapted = useMemo(() => dashboardAdapter(dashboardResponse), [dashboardResponse]);
  const actions = {
    view: setSelectedAppointment,
    update: openUpdateModal,
    cancel: handleCancel,
    complete: handleComplete,
  };

  return <div className="p-6">
    <div className="mb-6 flex items-center justify-between gap-4"><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Appointment Booking Management</h1></div>
    {currentTab === "dashboard" && <DashboardTab
      appointments={appointments} dashboardData={adapted.dashboardData} statusSummary={adapted.statusSummary}
      filters={filtersState.filters} onFilterChange={filtersState.handleFilterChange} onClearFilters={filtersState.clearFilters}
      departmentFilterOptions={filtersState.departmentFilterOptions} doctorFilterOptions={filtersState.doctorFilterOptions}
      loading={loading} filteredAppointments={filtersState.filteredAppointments} paginatedAppointments={filtersState.paginatedAppointments}
      pagination={filtersState.pagination} actions={actions} onRefresh={() => loadAppointments({ force: true })} onAddBooking={() => { setFormData(initialForm()); setShowForm(true); }}
    />}
    {currentTab === "performance" && <PerformanceTab appointments={appointments} />}
    {currentTab === "planning" && <PlanningTab appointments={appointments} loading={false} onView={setSelectedAppointment} onUpdate={openUpdateModal} />}
    {currentTab === "resources" && <ResourcesTab />}
    {currentTab === "reports" && <ReportsTab appointments={appointments} loading={false} onView={setSelectedAppointment} />}
    {showForm && <AppointmentCreateModal formData={formData} departments={departments} doctors={doctors} departmentsLoading={departmentsLoading} doctorsLoading={doctorsLoading} availableSlots={availableSlots} slotsLoading={slotsLoading} creating={creatingAppointment} onChange={handleChange} onClose={() => setShowForm(false)} onCreate={handleCreate} />}
    {editingAppointment && <AppointmentUpdateModal editingAppointment={editingAppointment} editFormData={editFormData} updatingAppointment={updatingAppointment} onChange={({ target: { name, value } }) => setEditFormData((data) => ({ ...data, [name]: value }))} onClose={closeUpdateModal} onUpdate={handleUpdate} />}
    <AppointmentBookingDetailModal appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} formatDateTime={formatDateTime} />
  </div>;
}

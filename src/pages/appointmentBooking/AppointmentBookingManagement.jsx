import { useEffect, useMemo, useState } from "react";
import { appointmentService } from "../../services/appointmentBooking/appointmentApi";
import { hospitalService } from "../../services/core-modules/hospitalApi";
import useSessionStore from "../../store/useSessionStore";
import { staffService } from "../../services/core-modules/staffApi";
import AppointmentBookingDetailModal from "../../components/appointment-booking/AppointmentBookingDetailModal";

import DashboardTab from "./tabs/DashboardTab";
import PerformanceTab from "./tabs/PerformanceTab";
import PlanningTab from "./tabs/PlanningTab";
import ResourcesTab from "./tabs/ResourcesTab";
import ReportsTab from "./tabs/ReportsTab";

import AppointmentCreateModal from "./components/AppointmentCreateModal";
import AppointmentUpdateModal from "./components/AppointmentUpdateModal";

import useAppointmentKpis from "./hooks/useAppointmentKpis";
import useDashboardData from "./hooks/useDashboardData";
import useAppointmentFilters from "./hooks/useAppointmentFilters";

import {
  convertToDateTimeLocal,
  formatDateTime,
} from "./utils/appointmentHelpers";

export default function AppointmentBookingManagement({
  activeTab = "dashboard",
}) {
  const currentTab = String(activeTab || "dashboard").toLowerCase();
  const workspace = useSessionStore((state) => state.workspace);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [currentHospital, setCurrentHospital] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [allDoctors, setAllDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const getWorkspaceHospitalIdentity = () => ({
    hospitalId: workspace?.id || workspace?._id || "",
    hospitalEllyId:
      workspace?.ellyHospitalId || workspace?.hospitalEllyId || workspace?.ellyId || "",
    hospitalName:
      workspace?.hospitalName || workspace?.name || "Current hospital workspace",
  });

  const getInitialFormData = () => {
    const hospital = getWorkspaceHospitalIdentity();

    return {
      patientEllyId: "",
      hospitalEllyId: hospital.hospitalEllyId,
      hospitalId: hospital.hospitalId,
      doctorId: "",
      departmentId: "",
      appointmentDate: "",
      appointmentDateTime: "",
      durationMinutes: "30",
      consultationType: "ONLINE",
      reason: "",
      notes: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [editFormData, setEditFormData] = useState({
    appointmentDateTime: "",
    consultationType: "ONLINE",
    reason: "",
    notes: "",
  });

  const doctors = useMemo(() => {
    if (!formData.departmentId) return [];
    const selectedDepartment = departments.find(
      (department) => String(department._id) === String(formData.departmentId),
    );
    if (!selectedDepartment) return [];
    const acceptedDepartmentIds = [
      selectedDepartment._id,
      selectedDepartment.ellyDepartmentId,
    ]
      .filter(Boolean)
      .map((id) => String(id));
    const acceptedHospitalIds = [formData.hospitalId, formData.hospitalEllyId]
      .filter(Boolean)
      .map((id) => String(id));
    return allDoctors.filter((doctor) => {
      const doctorDepartmentId = String(doctor.departmentId || "");
      const doctorHospitalId = String(doctor.hospitalId || "");
      const normalizedRole = String(doctor.role || "").toUpperCase();
      const normalizedStatus = String(doctor.status || "").toUpperCase();
      const correctRole = !doctor.role || normalizedRole === "DOCTOR";
      const available =
        !doctor.status || ["ACTIVE", "AVAILABLE"].includes(normalizedStatus);
      return (
        correctRole &&
        available &&
        acceptedDepartmentIds.includes(doctorDepartmentId) &&
        acceptedHospitalIds.includes(doctorHospitalId)
      );
    });
  }, [
    allDoctors,
    departments,
    formData.departmentId,
    formData.hospitalId,
    formData.hospitalEllyId,
  ]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getAllAppointments();
      setAppointments(response.data || []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      alert(error.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentHospital = async () => {
    const workspaceHospital = getWorkspaceHospitalIdentity();
    setDepartmentsLoading(true);

    if (!workspaceHospital.hospitalId && !workspaceHospital.hospitalEllyId) {
      setDepartmentsLoading(false);
      throw new Error("No hospital workspace found. Please log in to a hospital first.");
    }

    try {
      const response = await hospitalService.getAllHospitals();
      const hospitals = response.data || [];
      const selectedHospital = hospitals.find((hospital) => {
        const acceptedIds = [
          hospital._id,
          hospital.id,
          hospital.ellyHospitalId,
          hospital.hospitalEllyId,
          hospital.ellyId,
        ]
          .filter(Boolean)
          .map((id) => String(id));

        return [workspaceHospital.hospitalId, workspaceHospital.hospitalEllyId]
          .filter(Boolean)
          .map((id) => String(id))
          .some((id) => acceptedIds.includes(id));
      });

      const hospital = selectedHospital || workspace;
      const hospitalId = hospital?._id || hospital?.id || workspaceHospital.hospitalId;
      const hospitalEllyId =
        hospital?.ellyHospitalId ||
        hospital?.hospitalEllyId ||
        hospital?.ellyId ||
        workspaceHospital.hospitalEllyId;

      setCurrentHospital({
        ...hospital,
        _id: hospitalId,
        id: hospitalId,
        ellyHospitalId: hospitalEllyId,
        hospitalName:
          hospital?.hospitalName || hospital?.name || workspaceHospital.hospitalName,
      });
      setDepartments(hospital?.departments || []);
      setFormData((previousData) => ({
        ...previousData,
        hospitalId,
        hospitalEllyId,
        departmentId: "",
        doctorId: "",
        appointmentDate: "",
        appointmentDateTime: "",
      }));
    } catch (error) {
      console.error("Failed to load current hospital:", error);
      throw error;
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const response = await staffService.getAllStaff();
      setAllDoctors(response.data || []);
    } catch (error) {
      console.error("Failed to load doctors:", error);
      alert(error.message || "Failed to load doctors");
    } finally {
      setDoctorsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);
  useEffect(() => {
    const hospital = getWorkspaceHospitalIdentity();

    setFormData((previousData) => ({
      ...previousData,
      hospitalEllyId: hospital.hospitalEllyId,
      hospitalId: hospital.hospitalId,
    }));
  }, [workspace]);

  const resetForm = () => {
    setFormData(getInitialFormData());
    setDepartments([]);
    setAllDoctors([]);
    setAvailableSlots([]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "departmentId") {
      setFormData((previousData) => ({
        ...previousData,
        departmentId: value,
        doctorId: "",
        appointmentDate: "",
        appointmentDateTime: "",
      }));

      setAvailableSlots([]);
      return;
    }

    if (["doctorId", "appointmentDate", "durationMinutes"].includes(name)) {
      setFormData((previousData) => ({
        ...previousData,
        [name]: value,
        appointmentDateTime: "",
      }));

      setAvailableSlots([]);
      return;
    }

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const loadAvailableSlots = async () => {
    if (
      !formData.doctorId ||
      !formData.appointmentDate ||
      !formData.durationMinutes
    ) {
      setAvailableSlots([]);
      return;
    }

    try {
      setSlotsLoading(true);

      const response = await appointmentService.getDoctorAvailability({
        doctorId: formData.doctorId,
        date: formData.appointmentDate,
        durationMinutes: formData.durationMinutes,
      });

      setAvailableSlots(response.data?.slots || []);
    } catch (error) {
      console.error("Failed to load available appointment slots:", error);
      setAvailableSlots([]);
      alert(error.message || "Failed to load available appointment slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableSlots();
  }, [formData.doctorId, formData.appointmentDate, formData.durationMinutes]);

  const handleCreate = async () => {
    if (!formData.patientEllyId.trim())
      return alert("Patient ELLY ID is required");
    if (!formData.hospitalId || !formData.hospitalEllyId)
      return alert("No hospital workspace found. Please log in to a hospital first.");
    if (!formData.departmentId) return alert("Please select a department");
    if (!formData.doctorId) return alert("Please select a doctor");
    if (!formData.appointmentDate)
      return alert("Please select appointment date");
    if (!formData.durationMinutes)
      return alert("Please select appointment duration");
    if (!formData.appointmentDateTime)
      return alert("Please select an available time slot");

    try {
      await appointmentService.createAppointment({
        patientEllyId: formData.patientEllyId.trim(),
        hospitalId: formData.hospitalId,
        hospitalEllyId: formData.hospitalEllyId,
        doctorId: formData.doctorId,
        departmentId: formData.departmentId,
        appointmentDateTime: new Date(
          formData.appointmentDateTime,
        ).toISOString(),
        durationMinutes: Number(formData.durationMinutes),
        consultationType: formData.consultationType,
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
      });
      setShowForm(false);
      resetForm();
      await loadAppointments();
    } catch (error) {
      console.error("Failed to create appointment:", error);
      alert(error.message || "Failed to create appointment");
    }
  };

  const openUpdateModal = (appointment) => {
    setEditingAppointment(appointment);
    setEditFormData({
      appointmentDateTime: convertToDateTimeLocal(
        appointment.appointmentDateTime,
      ),
      consultationType: appointment.consultationType || "ONLINE",
      reason: appointment.reason || "",
      notes: appointment.notes || "",
    });
  };

  const closeUpdateModal = () => {
    setEditingAppointment(null);
    setEditFormData({
      appointmentDateTime: "",
      consultationType: "ONLINE",
      reason: "",
      notes: "",
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((previousData) => ({ ...previousData, [name]: value }));
  };

  const handleUpdate = async () => {
    if (!editingAppointment?._id) return;
    if (!editFormData.appointmentDateTime)
      return alert("Appointment date and time are required");
    try {
      setUpdatingAppointment(true);
      await appointmentService.updateAppointment(editingAppointment._id, {
        appointmentDateTime: new Date(
          editFormData.appointmentDateTime,
        ).toISOString(),
        consultationType: editFormData.consultationType,
        reason: editFormData.reason.trim(),
        notes: editFormData.notes.trim(),
      });
      closeUpdateModal();
      await loadAppointments();
    } catch (error) {
      console.error("Failed to update appointment:", error);
      alert(error.message || "Failed to update appointment");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    const reason = window.prompt("Cancellation reason?");
    if (reason === null) return;
    try {
      await appointmentService.cancelAppointment(appointmentId, reason);
      await loadAppointments();
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      alert(error.message || "Failed to cancel appointment");
    }
  };


  const handleComplete = async (appointmentId) => {
    const confirmed = window.confirm("Mark this appointment as completed?");
    if (!confirmed) return;

    try {
      await appointmentService.completeAppointment(appointmentId, {
        completedBy: "STAFF",
      });
      await loadAppointments();
    } catch (error) {
      console.error("Failed to complete appointment:", error);
      alert(error.message || "Failed to complete appointment");
    }
  };
  const openCreateForm = async () => {
    resetForm();
    setShowForm(true);
    try {
      await Promise.all([loadCurrentHospital(), loadDoctors()]);
    } catch (error) {
      alert(error.message || "Failed to load hospital workspace");
    }
  };

  const closeCreateForm = () => {
    setShowForm(false);
    resetForm();
  };

  const appointmentKpis = useAppointmentKpis(appointments);
  const dashboardData = useDashboardData(appointments);
  const {
    filters,
    handleFilterChange,
    clearFilters,
    departmentFilterOptions,
    doctorFilterOptions,
    filteredAppointments,
    paginatedAppointments,
    pagination,
  } = useAppointmentFilters(appointments);
  const actions = {
    view: setSelectedAppointment,
    update: openUpdateModal,
    cancel: handleCancel,
    complete: handleComplete,
  };

  return (
    <div className="p-6">
      {(
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            Appointment Booking Management
          </h1>
        </div>
      )}
      {currentTab === "dashboard" && (
        <DashboardTab
          appointmentKpis={appointmentKpis}
          appointments={appointments}
          dashboardData={dashboardData}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          departmentFilterOptions={departmentFilterOptions}
          doctorFilterOptions={doctorFilterOptions}
          loading={loading}
          filteredAppointments={filteredAppointments}
          paginatedAppointments={paginatedAppointments}
          pagination={pagination}
          actions={actions}
          onRefresh={loadAppointments}
          onAddBooking={openCreateForm}
        />
      )}
      {currentTab === "performance" && (
        <PerformanceTab appointments={appointments} />
      )}
      {currentTab === "planning" && (
        <PlanningTab
          appointments={appointments}
          loading={loading}
          onView={setSelectedAppointment}
          onUpdate={openUpdateModal}
        />
      )}
      {currentTab === "resources" && <ResourcesTab />}
      {currentTab === "reports" && (
        <ReportsTab
          appointments={appointments}
          loading={loading}
          onView={setSelectedAppointment}
        />
      )}

      {showForm && (
        <AppointmentCreateModal
          formData={formData}
departments={departments}
          doctors={doctors}
          departmentsLoading={departmentsLoading}
          doctorsLoading={doctorsLoading}
          availableSlots={availableSlots}
          slotsLoading={slotsLoading}
          onChange={handleChange}
          onClose={closeCreateForm}
          onCreate={handleCreate}
        />
      )}
      {editingAppointment && (
        <AppointmentUpdateModal
          editingAppointment={editingAppointment}
          editFormData={editFormData}
          updatingAppointment={updatingAppointment}
          onChange={handleEditChange}
          onClose={closeUpdateModal}
          onUpdate={handleUpdate}
        />
      )}
      <AppointmentBookingDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        formatDateTime={formatDateTime}
      />
    </div>
  );
}


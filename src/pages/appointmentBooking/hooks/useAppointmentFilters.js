import { useMemo, useState } from "react";
import {
  getDepartmentName,
  getDoctorName,
  getEntityId,
  getHospitalName,
  getLocalDateKey,
  getPatientEllyId,
  getPatientName,
  getTodayDateKey,
  normalizeStatus,
} from "../utils/appointmentHelpers";

export default function useAppointmentFilters(appointments) {
  const [filters, setFilters] = useState({
    keyword: "",
    departmentId: "",
    doctorId: "",
    status: "",
    date: getTodayDateKey(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleFilterChange = (name, value) => {
    setFilters((previousFilters) => ({ ...previousFilters, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      keyword: "",
      departmentId: "",
      doctorId: "",
      status: "",
      date: "",
    });
    setCurrentPage(1);
  };

  const departmentFilterOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((appointment) => {
      const id = getEntityId(appointment.department, appointment.departmentId);
      const name = getDepartmentName(appointment);
      if (id && name !== "N/A") map.set(String(id), name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [appointments]);

  const doctorFilterOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((appointment) => {
      const id = getEntityId(appointment.doctor, appointment.doctorId);
      const name = getDoctorName(appointment);
      if (id && name !== "N/A") map.set(String(id), name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const appointmentStatus = normalizeStatus(appointment.status);
      const departmentId = String(
        getEntityId(appointment.department, appointment.departmentId),
      );
      const doctorId = String(
        getEntityId(appointment.doctor, appointment.doctorId),
      );
      const matchesKeyword =
        !keyword ||
        getPatientName(appointment).toLowerCase().includes(keyword) ||
        getPatientEllyId(appointment).toLowerCase().includes(keyword) ||
        getDoctorName(appointment).toLowerCase().includes(keyword) ||
        getDepartmentName(appointment).toLowerCase().includes(keyword) ||
        getHospitalName(appointment).toLowerCase().includes(keyword) ||
        String(appointment.reason || "")
          .toLowerCase()
          .includes(keyword);
      const matchesDepartment =
        !filters.departmentId || departmentId === String(filters.departmentId);
      const matchesDoctor =
        !filters.doctorId || doctorId === String(filters.doctorId);
      const matchesStatus =
        !filters.status || appointmentStatus === filters.status;
      const matchesDate =
        !filters.date ||
        getLocalDateKey(appointment.appointmentDateTime) === filters.date;
      return (
        matchesKeyword &&
        matchesDepartment &&
        matchesDoctor &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [appointments, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / itemsPerPage),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAppointments = filteredAppointments.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );
  const paginationPages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter((page) => {
    if (totalPages <= 5) return true;
    return (
      page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1
    );
  });

  return {
    filters,
    handleFilterChange,
    clearFilters,
    departmentFilterOptions,
    doctorFilterOptions,
    filteredAppointments,
    paginatedAppointments,
    pagination: {
      currentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage,
      totalPages,
      safeCurrentPage,
      paginationPages,
    },
  };
}


import { useEffect, useState, useMemo } from "react";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import AssignDepartmentModal from "../../../components/staff/AssignDepartmentModal";
import StaffSchedulePanel from "../../../components/staff/StaffSchedulePanel";
import StaffSearchBar from "../../../components/staff/StaffSearchBar";
import Pagination from "../../../components/dashboard/Pagination";

const PAGE_SIZE = 6;

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMember, setScheduleMember] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const handleAssignDepartment = (member) => {
    setSelectedMember(member);
    setShowAssignModal(true);
  };

  const handleSchedule = (member) => {
    setScheduleMember(member);
    setShowScheduleModal(true);
  };

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const filteredStaff = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return staff;
    return staff.filter((person) =>
      person.ellyId?.toLowerCase().includes(search) ||
      person._id?.toLowerCase().includes(search) ||
      person.fullName?.toLowerCase().includes(search)
    );
  }, [staff, searchTerm]);

  const [formData, setFormData] = useState({
    role: "DOCTOR",
    hospitalId: "",
    fullName: "",
    email: "",
    phone: "",
    specialization: "",
    qualification: "",
    experienceYears: "",
    status: "AVAILABLE",
    ellyId: "",
  });

  const loadStaff = async () => {
    try {
      setLoading(true);

      const response =
        await staffService.getAllStaff();

      setStaff(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const response =
        await hospitalService.getAllHospitals();

      setHospitals(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response =
        await hospitalService.getAllDepartmentsList();

      setDepartments(response || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadStaff();
    loadHospitals();
    loadDepartments();
  }, []);

  const resetForm = () => {
    setEditingMember(null);

    setFormData({
      role: "DOCTOR",
      ellyId: "",
      hospitalId: "",
      fullName: "",
      email: "",
      phone: "",
      specialization: "",
      qualification: "",
      experienceYears: "",
      status: "AVAILABLE",
    });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreate = async () => {
    try {
      await staffService.createStaff(
        formData
      );

      setShowForm(false);
      resetForm();
      loadStaff();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await staffService.updateStaff(
        editingMember.ellyId,
        formData
      );

      setShowForm(false);
      resetForm();
      loadStaff();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Delete this staff member?"
    );

    if (!confirmed) return;

    try {
      await staffService.deleteStaff(id);

      loadStaff();
    } catch (error) {
      alert(error.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleStaff = filteredStaff.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleEdit = (member) => {
    setEditingMember(member);

    setFormData({
      role: member.role || "DOCTOR",
      ellyId: member.ellyId || "",
      hospitalId: member.hospitalId || "",
      fullName: member.fullName || "",
      email: member.email || "",
      phone: member.phone || "",
      specialization:
        member.specialization || "",
      qualification:
        member.qualification || "",
      experienceYears:
        member.experienceYears || "",
      status:
        member.status || "AVAILABLE",
    });

    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Staff Management
          </h1>

          <p className="text-sm text-slate-500">
            Create, update and manage
            staff
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          + Add Staff
        </button>
      </div>

      <div className="mb-6 max-w-xs">
        <StaffSearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
               <th className="p-4 text-left">
                ID
              </th>
                
              <th className="p-4 text-left">
                Staff
              </th>

              <th className="p-4 text-left">
                Role
              </th>

              <th className="p-4 text-left">
                Department
              </th>

              <th className="p-4 text-left">
                Specialization
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              visibleStaff.map((member) => (
                <tr
                  key={member.ellyId }
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                    <td className="p-4">
                        {member.ellyId}
                    </td>

                  <td className="p-4">
                    {member.fullName}
                  </td>

                  <td className="p-4">
                    {member.role?.toUpperCase() === "NURSE" ? "Nurse" : "Doctor"}
                  </td>

                  <td className="p-4">
                    {member.departmentId} - 
                    { 
                      departments.find(
                        (d) =>
                          d.ellyDepartmentId === member.departmentId
                      )?.name || "-"
                    }
                  </td>

                  <td className="p-4">
                    {
                      member.specialization
                    }
                  </td>

                  <td className="p-4">
                    {member.status}
                  </td>

                  <td className="p-2">
                    <div className="flex flex-nowrap gap-1">

                      <button
                          onClick={() =>
                            handleAssignDepartment(
                              member
                            )
                          }
                          className="whitespace-nowrap rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                        >
                          Dept
                      </button>
                      <button
                        onClick={() =>
                          handleSchedule(
                            member
                          )
                        }
                        className="whitespace-nowrap rounded bg-purple-600 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Sched
                      </button>
                      <button
                        onClick={() =>
                          handleEdit(
                            member
                          )
                        }
                        className="whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            member.ellyId 
                          )
                        }
                        className="whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={safePage}
        label="staff"
        onPageChange={setCurrentPage}
        pageSize={PAGE_SIZE}
        totalItems={filteredStaff.length}
      />
      {showAssignModal && (
            <AssignDepartmentModal
              member={selectedMember}
              departments={departments}
              onClose={() =>
                setShowAssignModal(false)
              }
              onAssigned={loadStaff}
            />
      )}
      {showScheduleModal && (
        <StaffSchedulePanel
          member={scheduleMember}
          onClose={() => setShowScheduleModal(false)}
          onSaved={loadStaff}
        />
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-6 text-xl font-bold">
              {editingMember
                ? "Edit Staff"
                : "Create Staff"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
               < input
                name="ellyId"
                value={formData.ellyId}
                onChange={handleChange}
                placeholder="Staff ID (unique)"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Staff Name"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="specialization"
                value={
                  formData.specialization
                }
                onChange={handleChange}
                placeholder="Specialization"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="qualification"
                value={
                  formData.qualification
                }
                onChange={handleChange}
                placeholder="Qualification"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                type="number"
                name="experienceYears"
                value={
                  formData.experienceYears
                }
                onChange={handleChange}
                placeholder="Experience Years"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <select
                name="hospitalId"
                value={formData.hospitalId}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="">
                  Select Hospital
                </option>

                {hospitals.map(
                  (hospital) => (
                    <option
                      key={
                        hospital.ellyHospitalId
                      }
                      value={
                        hospital.ellyHospitalId
                      }
                    >
                      {
                        hospital.hospitalName
                      }
                    </option>
                  )
                )}
              </select>

              <select
                name="role"
                value={formData.role || "DOCTOR"}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
              </select>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="col-span-2 rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>
                <option value="AVAILABLE">
                  AVAILABLE
                </option>
                <option value="BUSY">
                  BUSY
                </option>
                <option value="OFF_DUTY">
                  OFF_DUTY
                </option>
                <option value="ON_LEAVE">
                  ON_LEAVE
                </option>
                <option value="INACTIVE">
                  INACTIVE
                </option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded border px-4 py-2"
              >
                Cancel
              </button>

              <button
                onClick={
                  editingMember
                    ? handleUpdate
                    : handleCreate
                }
                className="rounded bg-teal-600 px-4 py-2 text-white"
              >
                {editingMember
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

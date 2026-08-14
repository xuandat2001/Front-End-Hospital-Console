import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {hospitalService} from "../../../services/core-modules/hospitalApi";
import Pagination from "../../../components/dashboard/Pagination";

const PAGE_SIZE = 6;

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    description: "",
    hospitalId: "",
    phone: "",
    email: "",
    floor: "",
    roomPrefix: "",
    status: "ACTIVE",
  });

  

  const loadDepartments = async () => {
    try {
      setLoading(true);

      const data =
        await hospitalService.getAllDepartmentsList();

      setDepartments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        const [departmentData, hospitalResponse] = await Promise.all([
          hospitalService.getAllDepartmentsList(),
          hospitalService.getAllHospitals(),
        ]);

        if (!active) return;
        setDepartments(departmentData);
        setHospitals(hospitalResponse.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setEditingDepartment(null);

    setFormData({
      name: "",
      specialty: "",
      description: "",
      hospitalId: "",
      phone: "",
      email: "",
      floor: "",
      roomPrefix: "",
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
      await hospitalService.createDepartment(
        formData
      );

      setShowForm(false);
      resetForm();
      loadDepartments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await hospitalService.updateDepartment(
        editingDepartment._id,
        formData
      );

      setShowForm(false);
      resetForm();
      loadDepartments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Delete this department?"
    );

    if (!confirmed) return;

    try {
      await hospitalService.deleteDepartment(id);

      loadDepartments();
      setCurrentPage(1);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);

    setFormData({
      name: department.name || "",
      specialty: department.specialty || "",
      description: department.description || "",
      hospitalId:
        department.hospitalId?._id ||
        department.hospitalId ||
        "",
      phone: department.phone || "",
      email: department.email || "",
      floor: department.floor || "",
      roomPrefix: department.roomPrefix || "",
      status: department.status || "ACTIVE",
    });

    setShowForm(true);
  };

  const totalPages = Math.max(1, Math.ceil(departments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleDepartments = departments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Department Management
          </h1>

          <p className="text-sm text-slate-500">
            Create, update and manage
            departments
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          + Add Department
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px]">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-left">
                Department
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Hospital 
              </th>

              <th className="p-4 text-left">
                Department Floor - Room Prefix
              </th>

              <th className="p-4 text-left">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              visibleDepartments.map((department) => (
                <tr
                  key={department._id}
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                  <td className="p-4">
                    {department.name}
                  </td>

                  <td className="p-4">
                    {department.status}
                  </td>

                  <td className="p-4">
                    {typeof department.hospitalId === "object"
                      ? department.hospitalId?.hospitalName
                      : department.hospitalId || "N/A"}
                  </td>

                  <td className="p-4">
                    {department.floor} - {department.roomPrefix}
                  </td>



                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleEdit(
                            department
                          )
                        }
                        className="rounded bg-amber-500 px-3 py-1 text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            department._id
                          )
                        }
                        className="rounded bg-red-600 px-3 py-1 text-white"
                      >
                        Delete
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
        label="departments"
        onPageChange={setCurrentPage}
        pageSize={PAGE_SIZE}
        totalItems={departments.length}
      />

      {showForm && createPortal(
        <div
          className="console-tinted-popup-layer staff-resource-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="department-resource-form-title"
        >
          <div className="console-tinted-popup staff-resource-popup max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-950" data-tone="staff-resource-popup">
            <h2 id="department-resource-form-title" className="mb-6 text-xl font-bold">
              {editingDepartment
                ? "Edit Department"
                : "Create Department"}
            </h2>
            
             <div className="flex items-center gap-3 padding-top-4">
              <span>Status</span>

              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={formData.status === "ACTIVE"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.checked
                        ? "ACTIVE"
                        : "INACTIVE",
                    }))
                  }
                />

                <div className="peer h-6 w-11 rounded-full bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-teal-600 peer-checked:after:translate-x-5"></div>
              </label>

              <span
                className={
                  formData.status === "active"
                    ? "text-green-500"
                    : "text-red-500"
                }
              >
                {formData.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Department Name"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="Specialty"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <select
                name="hospitalId"
                value={formData.hospitalId}
                onChange={handleChange}
                className= "rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="">
                  Select Hospital
                </option>

            {Array.isArray(hospitals) &&
                hospitals.map((hospital) => (
                    <option
                      key={hospital.ellyHospitalId}
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

              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone"
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
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                placeholder="Floor"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <input
                name="roomPrefix"
                value={formData.roomPrefix}
                onChange={handleChange}
                placeholder="Room Prefix"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                className="col-span-2 rounded border p-3 bg-slate-800 text-white border-slate-600"
                rows="4"
              />
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
                  editingDepartment
                    ? handleUpdate
                    : handleCreate
                }
                className="rounded bg-teal-600 px-4 py-2 text-white"
              >
                {editingDepartment
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}


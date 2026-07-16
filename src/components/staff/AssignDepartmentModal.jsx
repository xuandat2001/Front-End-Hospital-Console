import { useState } from "react";
import { staffService } from "../../services/core-modules/staffApi";

export default function AssignDepartmentModal({
  member,
  departments,
  onClose,
  onAssigned,
}) {
  const [departmentId, setDepartmentId] = useState(() => {
    const currentDepartmentId = String(member?.departmentId || "");

    const currentDepartment = departments.find(
      (department) =>
        String(department.ellyDepartmentId || department._id) === currentDepartmentId,
    );

    return currentDepartment?.ellyDepartmentId || currentDepartment?._id || "";
  });

  const handleAssign = async () => {
    try {
      await staffService.assignDepartment(
        member.ellyId,
        departmentId
      );

      onAssigned();
      onClose();
    } catch (error) {
      alert(error.message);
    }
  };

  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">

        <h2 className="mb-4 text-xl font-bold">
          Assign Department
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm">
            Staff
          </label>

          <div className="rounded border p-3">
            {member.fullName}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm">
            Department
          </label>

          <select
            value={departmentId}
            onChange={(e) =>
              setDepartmentId(
                e.target.value
              )
            }
            className="w-full rounded border p-3 text-black"
          >
            <option value="">
              Select Department
            </option>

            {departments.map((department) => (
              <option
                key={department._id}
                value={department.ellyDepartmentId || department._id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">

          <button
            onClick={onClose}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>

          <button
            onClick={handleAssign}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Assign
          </button>

        </div>

      </div>

    </div>
  );
}

import { useEffect, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { patientService } from "../../../services/core-modules/patientApi";
import useRegistrationStore from "../../../hooks/useRegistrationStore";

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // NEW: Track the currently expanded row
  const [expandedPatientId, setExpandedPatientId] = useState(null);

  const [formData, setFormData] = useState({
    ellyId: "",
    fullName: "",
    dateOfBirth: "",
    gender: "UNKNOWN",
    phone: "",
    email: "",
    address: { line1: "", city: "", state: "", country: "", postalCode: "" },
    emergencyContact: { name: "", relationship: "", phone: "" },
    registeredHospitals: [], // Track facilities
  });

  // SUBSCRIBE TO THE STORE
  const incomingPayload = useRegistrationStore((state) => state.incomingPayload);
  const clearRegistration = useRegistrationStore((state) => state.clearRegistration);
  const pendingPatientEditId = useRegistrationStore((state) => state.pendingPatientEditId);
  const clearPatientEdit = useRegistrationStore((state) => state.clearPatientEdit);

  // AUTO-FILL EFFECT
  useEffect(() => {
    if (incomingPayload) {
      setFormData({
        ellyId: incomingPayload.ellyId || "",
        fullName: incomingPayload.fullName || "",
        dateOfBirth: incomingPayload.dateOfBirth || "",
        gender: incomingPayload.gender ? incomingPayload.gender.toUpperCase() : "UNKNOWN",
        phone: "",
        email: "",
        address: { line1: "", city: "", state: "", country: "", postalCode: "" },
        emergencyContact: { name: "", relationship: "", phone: "" },
        registeredHospitals: incomingPayload.registeredHospitals || [],
      });
    }
  }, [incomingPayload]);

  const loadPatients = async (ellyId = "") => {
    try {
      setLoading(true);
      const filters = {};
      if (ellyId) filters.ellyId = ellyId;
      const response = await patientService.getAllPatients(filters);
      setPatients(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setEditingPatient(null);
    setFormData({
      ellyId: "",
      fullName: "",
      dateOfBirth: "",
      gender: "UNKNOWN",
      phone: "",
      email: "",
      address: { line1: "", city: "", state: "", country: "", postalCode: "" },
      emergencyContact: { name: "", relationship: "", phone: "" },
      registeredHospitals: [],
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else if (name.startsWith("emergencyContact.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      ellyId: patient.ellyId || "",
      fullName: patient.fullName || "",
      dateOfBirth: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
        : "",
      gender: patient.gender || "UNKNOWN",
      phone: patient.phone || "",
      email: patient.email || "",
      address: {
        line1: patient.address?.line1 || "",
        city: patient.address?.city || "",
        state: patient.address?.state || "",
        country: patient.address?.country || "",
        postalCode: patient.address?.postalCode || "",
      },
      emergencyContact: {
        name: patient.emergencyContact?.name || "",
        relationship: patient.emergencyContact?.relationship || "",
        phone: patient.emergencyContact?.phone || "",
      },
      registeredHospitals: patient.registeredHospitals || [],
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).toISOString()
          : undefined,
      };
      // Prevent overwriting registered hospitals by deleting it before sending PUT
      delete payload.registeredHospitals;

      await patientService.updatePatient(editingPatient ? editingPatient._id : formData.ellyId, payload);
      setShowForm(false);
      resetForm();
      clearRegistration(); // Clear global store upon successful update
      loadPatients();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this patient?");
    if (!confirmed) return;
    try {
      await patientService.deletePatient(id);
      loadPatients();
    } catch (error) {
      alert(error.message);
    }
  };

  // Intercept the routing command from Zustand and open the modal safely
    useEffect(() => {
      const processPendingEdit = async () => {
        // Only run this if we have a target AND the table has finished loading
        if (pendingPatientEditId && !loading) {

          // 1. Check if they are already in the loaded table
          let patientToEdit = patients.find(p => p.ellyId === pendingPatientEditId);

          // 2. If not, fetch their file directly from the database
          if (!patientToEdit) {
            try {
              const response = await patientService.getPatientByEllyId(pendingPatientEditId);
              patientToEdit = response.data?.patient || response.data;
            } catch (error) {
              console.error("Could not fetch patient details for modal:", error);
            }
          }

          // 3. Populate the form and pop the modal open!
          if (patientToEdit) {
            handleEdit(patientToEdit);
          } else {
            setShowForm(true); // Fallback to an empty form if totally missing
          }

          // 4. Wipe the target ID so it doesn't keep opening on future visits
          clearPatientEdit();
        }
      };

      processPendingEdit();
    }, [pendingPatientEditId, loading, patients]); // Flat, clean dependency array

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4 sm:p-5">
      <div className="shrink-0">
        <h1 className="text-lg font-bold text-slate-950 dark:text-white sm:text-xl">Patient Management</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {patients.length} patient{patients.length !== 1 ? "s" : ""} on record
        </p>
      </div>

      <div className="shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Elly ID..."
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">ID</th>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Name</th>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Gender</th>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">DOB</th>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Phone</th>
              <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Email</th>
              <th className="p-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const rowId = patient._id || patient.ellyId;
              const isExpanded = expandedPatientId === rowId;

              return (
                <Fragment key={rowId}>
                  {/* MAIN ROW - Now Clickable */}
                  <tr
                    onClick={() => setExpandedPatientId(isExpanded ? null : rowId)}
                    className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                      {patient.ellyId || patient._id}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {patient.fullName}
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                      {patient.gender || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                      {patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                      {patient.phone || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                      {patient.email || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents row expansion when clicking Edit
                            handleEdit(patient);
                          }}
                          className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents row expansion when clicking Delete
                            handleDelete(patient._id);
                          }}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED DETAILS ROW */}
                  {isExpanded && (
                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan="7" className="border-b border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Registered Facilities
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {patient.registeredHospitals?.length > 0 ? (
                              patient.registeredHospitals.map((hospital, index) => (
                                <span
                                  key={index}
                                  className="rounded-full border border-teal-700/50 bg-teal-900/50 px-3 py-1 text-xs font-medium text-teal-300 shadow-sm"
                                >
                                  {typeof hospital === 'object' ? (hospital.hospitalName || hospital.hospitalId) : hospital}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm italic text-slate-500">
                                No active hospital registrations on file.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {patients.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-slate-400">
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && createPortal(
        <div
          className="console-tinted-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-patient-title"
        >
          <div className="console-tinted-popup max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="edit-patient-title" className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
              Edit Patient
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <input
                name="ellyId"
                value={formData.ellyId}
                onChange={handleChange}
                placeholder="Patient ID"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
                disabled
              />
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNKNOWN">Unknown</option>
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
                name="address.line1"
                value={formData.address.line1}
                onChange={handleChange}
                placeholder="Address"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600 col-span-2"
              />
              <input
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="City"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="State"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="Country"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleChange}
                placeholder="Postal Code"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleChange}
                placeholder="Emergency Contact Name"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                placeholder="Relationship"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600"
              />
              <input
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                placeholder="Emergency Phone"
                className="rounded border p-3 bg-slate-800 text-white border-slate-600 col-span-2"
              />

              {/* Registered Facilities Read-Only Section */}
              <div className="col-span-2 mt-2 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-300">Registered Facilities</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.registeredHospitals?.length > 0 ? (
                    formData.registeredHospitals.map((hospital, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-teal-900/50 px-3 py-1 text-xs font-medium text-teal-300 border border-teal-700/50"
                      >
                        {typeof hospital === 'object' ? (hospital.hospitalName || hospital.hospitalId) : hospital}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No registered hospitals found.</span>
                  )}
                </div>
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); resetForm(); clearRegistration(); }}
                className="rounded border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
              >
                Update & Approve
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

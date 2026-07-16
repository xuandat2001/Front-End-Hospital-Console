import { useState } from 'react';
import { admissionService } from '../../services/core-modules/hospitalApi';

export default function AdmissionForm() {
  const [formData, setFormData] = useState({
    patientId: '',
    hospitalId: '',
    roomId: '',
    bedId: '',
    admissionReason: '',
    doctor: '',
    assignedNurseIds: '',
    department: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.patientId || !formData.hospitalId) {
        throw new Error('Patient ID and Hospital ID are required');
      }

      const nurseIds = formData.assignedNurseIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      const admissionPayload = {
        patientId: formData.patientId,
        hospitalId: formData.hospitalId,
        roomId: formData.roomId,
        bedId: formData.bedId,
        admissionReason: formData.admissionReason,
        doctor: formData.doctor,
        assignedNurseIds: nurseIds.length > 0 ? nurseIds : [],
        department: formData.department,
      };

      const response = await admissionService.createAdmission(admissionPayload);
      setSubmittedData(response);
      setSuccess('Admission created successfully!');

      setFormData({
        patientId: '',
        hospitalId: '',
        roomId: '',
        bedId: '',
        admissionReason: '',
        doctor: '',
        assignedNurseIds: '',
        department: '',
      });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create admission. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
      <h2 className="mb-6 text-2xl font-bold text-purple-900 dark:text-purple-300">New Admission</h2>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading} className="space-y-5">
          <fieldset className="rounded-lg border border-purple-200 p-5 dark:border-purple-800">
            <legend className="px-2 text-sm font-bold text-purple-700 dark:text-purple-400">Patient Information</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="patientId" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Patient ID *</label>
                <input
                  type="text"
                  id="patientId"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleInputChange}
                  placeholder="Enter patient ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="hospitalId" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Hospital ID *</label>
                <input
                  type="text"
                  id="hospitalId"
                  name="hospitalId"
                  value={formData.hospitalId}
                  onChange={handleInputChange}
                  placeholder="Enter hospital ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-purple-200 p-5 dark:border-purple-800">
            <legend className="px-2 text-sm font-bold text-purple-700 dark:text-purple-400">Admission Details</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="roomId" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Room ID</label>
                <input
                  type="text"
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleInputChange}
                  placeholder="Enter room ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div>
                <label htmlFor="bedId" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Bed ID *</label>
                <input
                  type="text"
                  id="bedId"
                  name="bedId"
                  value={formData.bedId}
                  onChange={handleInputChange}
                  placeholder="Enter bed ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Department ID</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Enter department ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div>
                <label htmlFor="doctor" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Doctor ID</label>
                <input
                  type="text"
                  id="doctor"
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleInputChange}
                  placeholder="Enter doctor ID"
                  className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
          </fieldset>

          <div>
            <label htmlFor="assignedNurseIds" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Assigned Nurse IDs (comma-separated)</label>
            <input
              type="text"
              id="assignedNurseIds"
              name="assignedNurseIds"
              value={formData.assignedNurseIds}
              onChange={handleInputChange}
              placeholder="NURSE001, NURSE002"
              className="form-input bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
            />
          </div>

          <div>
            <label htmlFor="admissionReason" className="block text-sm mb-2 text-purple-900 dark:text-purple-300 font-semibold">Admission Reason</label>
            <textarea
              id="admissionReason"
              name="admissionReason"
              value={formData.admissionReason}
              onChange={handleInputChange}
              placeholder="Enter reason for admission"
              rows={3}
              className="form-textarea bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-700 px-4 py-3 text-white font-semibold hover:bg-purple-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Admission'}
          </button>
        </fieldset>
      </form>

      {submittedData && (
        <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50">
          <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Submitted Admission Data</h3>
          <pre className="text-xs overflow-auto max-h-60 text-slate-700 dark:text-slate-300">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

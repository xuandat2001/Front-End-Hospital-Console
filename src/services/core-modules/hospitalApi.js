import {apiRequest} from '../config/config';

// Hospital & Department Discovery Service
export const hospitalService = {

  // Create department
  createDepartment: async (departmentData) => {
    try {
      return await apiRequest('/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Get department by ID
  getDepartmentById: async (departmentId) => {
    try {
      return await apiRequest(`/departments/${departmentId}`);
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  },

  // Update department
  updateDepartment: async (departmentId, departmentData) => {
    try {
      return await apiRequest(`/departments/${departmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  // Delete department
  deleteDepartment: async (departmentId) => {
    try {
      return await apiRequest(`/departments/${departmentId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },
  
  // Get all departments with pagination
  getAllDepartments: async (page = 1, limit = 10) => {
    try {
      return await apiRequest(`/departments?page=${page}&limit=${limit}`);
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  getDepartmentsForHospital: async (hospitalId, page = 1, limit = 100) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (hospitalId) params.set("hospitalMongoId", hospitalId);
    return apiRequest(`/departments?${params.toString()}`);
  },

  // Get every department through the API Gateway, following backend pagination
  getAllDepartmentsList: async (limit = 100) => {
    try {
      const firstPage = await hospitalService.getAllDepartments(1, limit);
      const departments = [...(firstPage.data || [])];
      const totalPages = firstPage.pagination?.pages || 1;

      for (let page = 2; page <= totalPages; page += 1) {
        const result = await hospitalService.getAllDepartments(page, limit);
        departments.push(...(result.data || []));
      }

      return departments;
    } catch (error) {
      console.error('Error fetching all departments:', error);
      throw error;
    }
  },

  // Search departments by specialty
  searchBySpecialty: async (specialty) => {
    try {
      return await apiRequest(`/departments/search?specialty=${encodeURIComponent(specialty)}`);
    } catch (error) {
      console.error('Error searching departments:', error);
      throw error;
    }
  },

  // Search departments by hospital
  searchByHospital: async (hospital) => {
    try {
      return await apiRequest(`/departments/hospital?hospital=${encodeURIComponent(hospital)}`);
    } catch (error) {
      console.error('Error searching by hospital:', error);
      throw error;
    }
  },

  // Search departments by symptom text
  searchBySymptom: async (symptom) => {
    try {
      return await apiRequest(`/departments/symptom?symptom=${encodeURIComponent(symptom)}`);
    } catch (error) {
      console.error('Error searching by symptom:', error);
      throw error;
    }
  },

  // Get all hospitals
  getAllHospitals: async () => {
    try {
      return await apiRequest('/hospitals');
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      throw error;
    }
  },
};

// Admission Service
export const admissionService = {
  getAllAdmissions: async () => {
    return await apiRequest('/admissions');
  },

  createAdmission: async (admissionData) => {
    return await apiRequest('/admissions', {
      method: 'POST',
      body: JSON.stringify(admissionData),
    });
  },

  getAdmissionById: async (admissionId) => {
    return await apiRequest(`/admissions/${admissionId}`);
  },

  getAdmissionsByPatient: async (patientId, hospitalId) => {
    const qs = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : "";
    return await apiRequest(`/admissions/patient/${patientId}${qs}`);
  },

  getAllAdmissionsWithPatient: async () => {
    return await apiRequest('/admissions/with-patient');
  },

  getAdmissionByIdWithPatient: async (admissionId) => {
    return await apiRequest(`/admissions/${admissionId}/with-patient`);
  },

  updateAdmission: async (admissionId, data) => {
    return await apiRequest(`/admissions/${admissionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateAdmissionStatus: async (admissionId, status) => {
    return await apiRequest(`/admissions/${admissionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  assignAdmission: async (admissionId, data) => {
    return await apiRequest(`/admissions/${admissionId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  dischargePatient: async (admissionId) => {
    return await apiRequest(`/admissions/${admissionId}/discharge`, {
      method: 'PUT',
    });
  },
};

export const surgeryService = {
  getAllSurgeries: async () => {
    return await apiRequest('/surgeries');
  },

  createSurgery: async (surgeryData) => {
    return await apiRequest('/surgeries', {
      method: 'POST',
      body: JSON.stringify(surgeryData),
    });
  },

  getSurgeryById: async (id) => {
    return await apiRequest(`/surgeries/${id}`);
  },

  getSurgeriesByPatient: async (patientId, hospitalId) => {
    const qs = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : "";
    return await apiRequest(`/surgeries/patient/${patientId}${qs}`);
  },

  updateSurgery: async (id, surgeryData) => {
    return await apiRequest(`/surgeries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(surgeryData),
    });
  },

  updateSurgeryStatus: async (id, status) => {
    return await apiRequest(`/surgeries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  deleteSurgery: async (id) => {
    return await apiRequest(`/surgeries/${id}`, {
      method: 'DELETE',
    });
  },

  createAdmissionForSurgery: async (surgeryId, admissionData) => {
    return await apiRequest(`/surgeries/${surgeryId}/create-admission`, {
      method: 'POST',
      body: JSON.stringify(admissionData || {}),
    });
  },

  getAdmissionBySurgeryId: async (surgeryId) => {
    return await apiRequest(`/surgeries/${surgeryId}/admission`);
  },

  linkExistingAdmission: async (surgeryId, admissionId) => {
    return await apiRequest(`/surgeries/${surgeryId}/link-admission`, {
      method: 'POST',
      body: JSON.stringify({ admissionId }),
    });
  },
};

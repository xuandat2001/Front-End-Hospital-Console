import { ROLES, getPermissionsByRole } from "../constant/rbac";

export const mockCurrentUser = {
  id: "staff-demo-001",
  ellyId: "ELLY-STAFF-001",
  fullName: "Demo Hospital Admin",
  role: ROLES.HOSPITAL_ADMIN,
  departmentId: "GENERAL",
  departmentName: "Hospital Administration",
};

export const mockWorkspace = {
  id: "mock-hospital-001",
  ellyHospitalId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  hospitalName: "Dummy External Hospital",
  integrationStatus: "ACTIVE",
  status: "ACTIVE",
  resolvedAt: new Date().toISOString(),
  source: "mock",
};

export const mockSession = {
  currentUser: mockCurrentUser,
  workspace: mockWorkspace,
  permissions: getPermissionsByRole(mockCurrentUser.role),
};

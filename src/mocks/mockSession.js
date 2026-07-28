import { getPermissionsByRole, ROLES } from "../constant/rbac";

export const MOCK_MODE =
  import.meta.env.VITE_USE_MOCK_DATA === "true" ||
  import.meta.env.VITE_DISABLE_API === "true";

export const mockHospitalWorkspace = {
  id: "6a259915b8327403156d292a",
  membershipId: "mock-membership-hospital-admin",
  workspaceType: "HOSPITAL",
  type: "HOSPITAL",
  workspaceId: "6a259915b8327403156d292a",
  workspaceEllyId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  ellyId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  ellyHospitalId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  workspaceName: "Dummy External Hospital",
  hospitalName: "Dummy External Hospital",
  role: ROLES.HOSPITAL_ADMIN,
  departmentId: "ADMIN",
  departmentName: "Administration",
  source: "mock-auth",
};

export const mockDoctorWorkspace = {
  id: "DEMO-CLINIC-001",
  membershipId: "mock-membership-doctor",
  workspaceType: "CLINIC",
  type: "CLINIC",
  workspaceId: "DEMO-CLINIC-001",
  workspaceEllyId: "ELLY-CLINIC-DEMO-001",
  ellyId: "ELLY-CLINIC-DEMO-001",
  workspaceName: "Demo Specialty Clinic",
  role: ROLES.DOCTOR,
  departmentId: "CARDIOLOGY",
  departmentName: "Cardiology",
  source: "mock-auth",
};

export function getMockHospitalAdminSession() {
  const permissions = getPermissionsByRole(ROLES.HOSPITAL_ADMIN);

  return {
    accessToken: "mock-access-token-hospital-admin",
    refreshToken: "mock-refresh-token-hospital-admin",
    user: {
      ellyId: "ELLY-USER-HOSP-ADMIN-001",
      email: "hospital.admin@elly.demo",
      fullName: "Hospital Admin",
      status: "ACTIVE",
      userType: "HOSPITAL",
      role: ROLES.HOSPITAL_ADMIN,
      metadata: { seed: true, source: "frontend-prototype" },
    },
    profileSnapshot: {
      fullName: "Hospital Admin",
      title: "Hospital Administrator",
    },
    activeWorkspace: {
      ...mockHospitalWorkspace,
      permissions,
    },
    workspaces: [
      {
        ...mockHospitalWorkspace,
        permissions,
      },
    ],
    role: ROLES.HOSPITAL_ADMIN,
    permissions,
    departmentId: "ADMIN",
    departmentName: "Administration",
    consoleType: "HOSPITAL",
  };
}

export function getMockDoctorSession() {
  const permissions = getPermissionsByRole(ROLES.DOCTOR);

  return {
    accessToken: "mock-access-token-doctor",
    refreshToken: "mock-refresh-token-doctor",
    user: {
      ellyId: "ELLY-USER-DOCTOR-001",
      email: "doctor@elly.demo",
      fullName: "Demo Doctor",
      status: "ACTIVE",
      userType: "DOCTOR",
      role: ROLES.DOCTOR,
      metadata: { seed: true, source: "frontend-prototype" },
    },
    profileSnapshot: {
      fullName: "Demo Doctor",
      specialization: "Cardiology",
      specialty: "Cardiology",
      clinicName: "Demo Specialty Clinic",
    },
    activeWorkspace: {
      ...mockDoctorWorkspace,
      permissions,
    },
    workspaces: [
      {
        ...mockDoctorWorkspace,
        permissions,
      },
    ],
    role: ROLES.DOCTOR,
    permissions,
    departmentId: "CARDIOLOGY",
    departmentName: "Cardiology",
    consoleType: "DOCTOR_CLINIC",
  };
}

export function getMockSessionByEllyId(ellyId) {
  const normalized = String(ellyId || "").toUpperCase();
  return normalized === "ELLY-USER-DOCTOR-001"
    ? getMockDoctorSession()
    : getMockHospitalAdminSession();
}

export function getMockResolvedIdentity(ellyId) {
  const session = getMockSessionByEllyId(ellyId);
  const activeWorkspace = session.activeWorkspace;

  return {
    ellyId: session.user.ellyId,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.role,
    profileSnapshot: session.profileSnapshot,
    activeWorkspace,
    memberships: session.workspaces,
    requiresWorkspaceSelection: false,
  };
}

export function getMockPersistedSession() {
  const session = getMockHospitalAdminSession();

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    currentUser: {
      ...session.user,
      ...session.profileSnapshot,
      role: session.role,
      departmentId: session.departmentId,
      departmentName: session.departmentName,
    },
    activeWorkspace: session.activeWorkspace,
    workspace: session.activeWorkspace,
    role: session.role,
    permissions: session.permissions,
    departmentId: session.departmentId,
    departmentName: session.departmentName,
    consoleType: session.consoleType,
  };
}

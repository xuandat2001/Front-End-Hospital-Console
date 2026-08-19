import { create } from "zustand";
import {
  ROLES,
  getPermissionsByRole,
  hasPermission,
  hasAnyPermission,
} from "../constant/rbac";

const SESSION_STORAGE_KEY = "ellyFrontendSession";
const AUTH_STORAGE_KEY = "ellyAuthSession";
const VALID_ROLES = new Set(Object.values(ROLES));
const VALID_CONSOLE_TYPES = new Set([
  "HOSPITAL",
  "DOCTOR_CLINIC",
  "PHARMACY",
  "RESTRICTED",
]);

function normalizeRole(role) {
  const normalizedRole = String(role || "").toUpperCase();
  return VALID_ROLES.has(normalizedRole) ? normalizedRole : null;
}

function readJsonStorage(storage, key) {
  try {
    const stored = storage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function readSession() {
  if (typeof window === "undefined") return null;

  return (
    readJsonStorage(localStorage, AUTH_STORAGE_KEY) ||
    readJsonStorage(sessionStorage, SESSION_STORAGE_KEY)
  );
}

function writeSession(session) {
  if (typeof window === "undefined") return;

  writeJsonStorage(localStorage, AUTH_STORAGE_KEY, session);
  writeJsonStorage(sessionStorage, SESSION_STORAGE_KEY, session);
}

function clearStoredSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object") return null;

  const workspaceType = workspace.workspaceType || workspace.type || "HOSPITAL";
  const workspaceEllyId =
    workspace.workspaceEllyId ||
    workspace.ellyId ||
    workspace.ellyHospitalId ||
    workspace.id;
  const workspaceName =
    workspace.workspaceName ||
    workspace.name ||
    workspace.hospitalName ||
    "ELLY Workspace";
  const workspaceId = workspace.workspaceId || workspace.id || workspaceEllyId;

  if (!workspaceId && !workspaceEllyId) return null;

  return {
    id: workspaceId,
    membershipId: workspace.membershipId || workspace.id || null,
    workspaceType,
    type: workspaceType,
    workspaceId,
    workspaceEllyId,
    ellyId: workspaceEllyId,
    workspaceName,
    name: workspaceName,
    ellyHospitalId:
      workspaceType === "HOSPITAL"
        ? workspaceEllyId
        : workspace.ellyHospitalId || null,
    hospitalName:
      workspaceType === "HOSPITAL"
        ? workspaceName
        : workspace.hospitalName || null,
    role: normalizeRole(workspace.role),
    permissions: workspace.permissions || [],
    departmentId: workspace.departmentId || null,
    departmentName: workspace.departmentName || null,
    source: workspace.source || "auth",
  };
}

function resolvePermissions(role, explicitPermissions, workspacePermissions) {
  const rolePermissions = getPermissionsByRole(role);
  const assignedPermissions = explicitPermissions?.length
    ? explicitPermissions
    : workspacePermissions?.length
      ? workspacePermissions
      : rolePermissions;

  if (String(role || "").toUpperCase() === ROLES.HOSPITAL_ADMIN) {
    return [...new Set([...rolePermissions, ...assignedPermissions])];
  }

  return assignedPermissions;
}

function deriveConsoleType(role, workspace) {
  const normalizedRole = normalizeRole(role);
  const workspaceType = String(workspace?.workspaceType || workspace?.type || "").toUpperCase();

  if (!normalizedRole) {
    return "RESTRICTED";
  }

  if (normalizedRole === ROLES.HOSPITAL_ADMIN || workspaceType === "HOSPITAL") {
    return "HOSPITAL";
  }

  if (
    normalizedRole === ROLES.DOCTOR ||
    normalizedRole === ROLES.CLINIC_DOCTOR ||
    ["CLINIC", "DOCTOR_PRACTICE"].includes(workspaceType)
  ) {
    return "DOCTOR_CLINIC";
  }

  if (normalizedRole === ROLES.PHARMACIST || workspaceType === "PHARMACY") {
    return "PHARMACY";
  }

  return "RESTRICTED";
}

function buildCurrentUser(data, activeWorkspace, role) {
  const user = data.currentUser || data.user || {};
  const profile = data.profileSnapshot || user.profileSnapshot || {};

  return {
    ...user,
    ...profile,
    role,
    departmentId:
      data.departmentId ||
      user.departmentId ||
      activeWorkspace?.departmentId ||
      null,
    departmentName:
      data.departmentName ||
      user.departmentName ||
      activeWorkspace?.departmentName ||
      null,
    clinicId:
      profile.clinicEllyId ||
      user.clinicId ||
      (["CLINIC", "DOCTOR_PRACTICE"].includes(activeWorkspace?.workspaceType)
        ? activeWorkspace?.workspaceEllyId
        : null),
    clinicName:
      user.clinicName ||
      (["CLINIC", "DOCTOR_PRACTICE"].includes(activeWorkspace?.workspaceType)
        ? activeWorkspace?.workspaceName
        : null),
    specialization:
      profile.specialization || profile.specialty || user.specialization || null,
    specialty: profile.specialty || user.specialty || null,
  };
}

function normalizeConsoleType(consoleType, role, workspace) {
  return VALID_CONSOLE_TYPES.has(consoleType)
    ? consoleType
    : deriveConsoleType(role, workspace);
}

function buildPersistedState(state) {
  return {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    currentUser: state.currentUser,
    activeWorkspace: state.activeWorkspace,
    workspace: state.workspace,
    role: state.role,
    permissions: state.permissions,
    departmentId: state.departmentId,
    departmentName: state.departmentName,
    consoleType: state.consoleType,
  };
}

function normalizeSessionData(data, previousState = {}) {
  const activeWorkspace = normalizeWorkspace(
    data.activeWorkspace ||
      data.workspace ||
      previousState.activeWorkspace ||
      previousState.workspace,
  );
  const role = normalizeRole(
    data.role ||
      data.currentUser?.role ||
      activeWorkspace?.role ||
      data.user?.role ||
      previousState.role,
  );
  const permissions = resolvePermissions(
    role,
    data.permissions,
    activeWorkspace?.permissions,
  );
  const currentUser = buildCurrentUser(data, activeWorkspace, role);
  const consoleType =
    normalizeConsoleType(
      data.consoleType || activeWorkspace?.consoleType || previousState.consoleType,
      role,
      activeWorkspace,
    );

  return {
    accessToken: data.accessToken || previousState.accessToken || null,
    refreshToken: data.refreshToken || previousState.refreshToken || null,
    currentUser,
    activeWorkspace,
    workspace: activeWorkspace,
    role,
    permissions,
    departmentId: currentUser.departmentId || null,
    departmentName: currentUser.departmentName || null,
    consoleType,
    isAuthenticated: Boolean(data.accessToken || previousState.accessToken),
  };
}

function isCompleteSession(session) {
  return Boolean(
    session?.accessToken &&
      session?.activeWorkspace &&
      session?.currentUser &&
      session?.role &&
      session?.permissions?.length,
  );
}

function normalizeStoredSession(session) {
  if (!session || typeof session !== "object") return null;

  const normalizedSession = normalizeSessionData(session);
  return isCompleteSession(normalizedSession) ? normalizedSession : null;
}

const rawStoredSession = readSession();
const storedSession = normalizeStoredSession(rawStoredSession);

if (rawStoredSession && !storedSession) {
  clearStoredSession();
}

const initialWorkspace = storedSession?.activeWorkspace || null;
const initialRole = storedSession?.role || null;
const initialPermissions = storedSession?.permissions || [];

const useSessionStore = create((set, get) => ({
  accessToken: storedSession?.accessToken || null,
  refreshToken: storedSession?.refreshToken || null,
  currentUser: storedSession?.currentUser || null,
  activeWorkspace: initialWorkspace,
  workspace: initialWorkspace,
  role: initialRole,
  permissions: initialPermissions,
  departmentId: storedSession?.departmentId || null,
  departmentName: storedSession?.departmentName || null,
  consoleType: storedSession?.consoleType || "RESTRICTED",
  isAuthenticated: Boolean(storedSession?.accessToken),
  showWelcome: false,

  setShowWelcome: (showWelcome) => set({ showWelcome }),

  setWorkspace: (workspace) =>
    set((state) => {
      const nextWorkspace = normalizeWorkspace(workspace);
      const nextConsoleType = deriveConsoleType(state.role, nextWorkspace);
      const nextSession = {
        ...buildPersistedState(state),
        activeWorkspace: nextWorkspace,
        workspace: nextWorkspace,
        consoleType: nextConsoleType,
      };

      writeSession(nextSession);

      return {
        activeWorkspace: nextWorkspace,
        workspace: nextWorkspace,
        consoleType: nextConsoleType,
      };
    }),

  setCurrentUser: (user) =>
    set((state) => {
      const role = user?.role || state.role;
      const permissions = getPermissionsByRole(role);
      const consoleType = deriveConsoleType(role, state.activeWorkspace);
      const nextSession = {
        ...buildPersistedState(state),
        currentUser: user,
        role,
        permissions,
        consoleType,
      };

      writeSession(nextSession);

      return {
        currentUser: user,
        role,
        permissions,
        consoleType,
      };
    }),

  setRole: (role) =>
    set((state) => {
      const nextUser = {
        ...(state.currentUser || {}),
        role,
      };
      const permissions = getPermissionsByRole(role);
      const consoleType = deriveConsoleType(role, state.activeWorkspace);
      const nextSession = {
        ...buildPersistedState(state),
        currentUser: nextUser,
        role,
        permissions,
        consoleType,
      };

      writeSession(nextSession);

      return {
        currentUser: nextUser,
        role,
        permissions,
        consoleType,
      };
    }),

  resolveEllyId: async (ellyId) => {
    const authApi = await import("../services/auth/authApi");
    const response = await authApi.resolveEllyId(ellyId);
    return response.data || response;
  },

  login: async (credentials) => {
    const authApi = await import("../services/auth/authApi");
    const response = await authApi.login(credentials);
    const data = response.data || response;
    const nextState = normalizeSessionData(data);

    set(nextState);
    writeSession(buildPersistedState(nextState));

    return {
      ...data,
      activeWorkspace: nextState.activeWorkspace,
      currentUser: nextState.currentUser,
      consoleType: nextState.consoleType,
      workspaces: (data.workspaces || []).map(normalizeWorkspace),
    };
  },

  loginWithEllyId: async (ellyIdOrPayload) => {
    const authApi = await import("../services/auth/authApi");
    const response = await authApi.loginWithEllyId(ellyIdOrPayload);
    const data = response.data || response;
    const nextState = normalizeSessionData(data);

    set(nextState);
    writeSession(buildPersistedState(nextState));

    return {
      ...data,
      activeWorkspace: nextState.activeWorkspace,
      currentUser: nextState.currentUser,
      consoleType: nextState.consoleType,
      workspaces: (data.workspaces || []).map(normalizeWorkspace),
    };
  },

  logout: async () => {
    const refreshToken = get().refreshToken;

    try {
      if (refreshToken) {
        const authApi = await import("../services/auth/authApi");
        await authApi.logout(refreshToken);
      }
    } finally {
      clearStoredSession();
      set({
        accessToken: null,
        refreshToken: null,
        currentUser: null,
        activeWorkspace: null,
        workspace: null,
        role: null,
        permissions: [],
        departmentId: null,
        departmentName: null,
        consoleType: "RESTRICTED",
        isAuthenticated: false,
      });
    }
  },

  refresh: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return null;

    const authApi = await import("../services/auth/authApi");
    const response = await authApi.refresh(refreshToken);
    const data = response.data || response;

    set((state) => {
      const nextState = normalizeSessionData(data, {
        ...state,
        refreshToken,
      });

      writeSession(buildPersistedState(nextState));
      return nextState;
    });

    return data;
  },

  loadMe: async () => {
    if (!get().accessToken) return null;

    const authApi = await import("../services/auth/authApi");
    const response = await authApi.getMe();
    const data = response.data || response;

    set((state) => {
      const nextState = normalizeSessionData(data, state);

      writeSession(buildPersistedState(nextState));
      return nextState;
    });

    return data;
  },

  selectWorkspace: async (membershipId) => {
    const authApi = await import("../services/auth/authApi");
    const response = await authApi.selectWorkspace(membershipId);
    const data = response.data || response;

    set((state) => {
      const nextState = normalizeSessionData(data, state);

      writeSession(buildPersistedState(nextState));
      return nextState;
    });

    return {
      ...data,
      activeWorkspace: normalizeWorkspace(data.activeWorkspace),
    };
  },

  can: (permission) => {
    return hasPermission(get().permissions, permission);
  },

  canAny: (permissions) => {
    return hasAnyPermission(get().permissions, permissions);
  },

  clearSession: () => {
    clearStoredSession();

    set({
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      activeWorkspace: null,
      workspace: null,
      role: null,
      permissions: [],
      departmentId: null,
      departmentName: null,
      consoleType: "RESTRICTED",
      isAuthenticated: false,
    });
  },
}));

export default useSessionStore;

import { create } from "zustand";
import {
  ROLES,
  getPermissionsByRole,
  hasPermission,
  hasAnyPermission,
} from "../constant/rbac";
import { isMockMode } from "../services/mockApi";
import { mockCurrentUser, mockSession, mockWorkspace } from "../mocks/mockSession";

const SESSION_STORAGE_KEY = "ellyFrontendSession";

function readSession() {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

const demoUser = isMockMode ? mockCurrentUser : {
  id: "staff-demo-001",
  ellyId: import.meta.env.VITE_ELLY_ID || "ELLY-STAFF-001",
  fullName: import.meta.env.VITE_ELLY_STAFF_NAME || "Demo Hospital Admin",
  role: import.meta.env.VITE_ELLY_ROLE || ROLES.HOSPITAL_ADMIN,
  departmentId: import.meta.env.VITE_ELLY_DEPARTMENT_ID || "GENERAL",
  departmentName: import.meta.env.VITE_ELLY_DEPARTMENT_NAME || "General",
};

const storedSession = isMockMode ? mockSession : readSession();

const initialUser = storedSession?.currentUser || demoUser;
const initialPermissions =
  storedSession?.permissions || getPermissionsByRole(initialUser.role);

const useSessionStore = create((set, get) => ({
  currentUser: initialUser,
  permissions: initialPermissions,
  workspace: storedSession?.workspace || (isMockMode ? mockWorkspace : null),

  setWorkspace: (workspace) =>
    set((state) => {
      const nextSession = {
        ...state,
        workspace,
      };

      writeSession(nextSession);

      return {
        workspace,
      };
    }),

  setCurrentUser: (user) =>
    set((state) => {
      const permissions = getPermissionsByRole(user.role);

      const nextSession = {
        ...state,
        currentUser: user,
        permissions,
      };

      writeSession(nextSession);

      return {
        currentUser: user,
        permissions,
      };
    }),

  setRole: (role) =>
    set((state) => {
      const nextUser = {
        ...state.currentUser,
        role,
      };

      const permissions = getPermissionsByRole(role);

      const nextSession = {
        ...state,
        currentUser: nextUser,
        permissions,
      };

      writeSession(nextSession);

      return {
        currentUser: nextUser,
        permissions,
      };
    }),

  can: (permission) => {
    return hasPermission(get().permissions, permission);
  },

  canAny: (permissions) => {
    return hasAnyPermission(get().permissions, permissions);
  },

  clearSession: () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    set({
      currentUser: null,
      permissions: [],
      workspace: null,
    });
  },
}));

export default useSessionStore;

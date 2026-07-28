import { apiRequest } from "../config/config";

export function resolveEllyId(ellyId) {
  return apiRequest("/auth/resolve-elly-id", {
    method: "POST",
    body: JSON.stringify({ ellyId }),
  });
}

export function login(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginWithEllyId(ellyIdOrPayload) {
  const payload =
    typeof ellyIdOrPayload === "string"
      ? { ellyId: ellyIdOrPayload }
      : ellyIdOrPayload;

  return login({
    ellyId: payload.ellyId,
    membershipId: payload.membershipId,
    workspaceType: payload.workspaceType,
    workspaceEllyId: payload.workspaceEllyId,
  });
}

export function logout(refreshToken) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function refresh(refreshToken) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function getMe() {
  return apiRequest("/auth/me");
}

export function getWorkspaces() {
  return apiRequest("/auth/workspaces");
}

export function selectWorkspace(membershipId) {
  return apiRequest("/auth/select-workspace", {
    method: "POST",
    body: JSON.stringify({ membershipId }),
  });
}

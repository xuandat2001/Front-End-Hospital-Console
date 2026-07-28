import useSessionStore from "../../store/useSessionStore";
import { MOCK_MODE } from "../../mocks/mockSession";
import { mockApiRequest, mockApiRequestBlob } from "../mock/mockApi";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function getSessionHeaders() {
  const session = useSessionStore.getState();

  const currentUser = session.currentUser;
  const workspace = session.activeWorkspace || session.workspace;
  const accessToken = session.accessToken;
  const workspaceEllyId =
    workspace?.workspaceEllyId ||
    workspace?.ellyHospitalId ||
    workspace?.ellyId;
  const workspaceId = workspace?.id || workspace?.workspaceId || workspaceEllyId;
  const role = session.role || currentUser?.role || workspace?.role;
  const departmentId =
    currentUser?.departmentId || workspace?.departmentId || session.departmentId;

  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(currentUser?.ellyId ? { "x-elly-id": currentUser.ellyId } : {}),
    ...(role ? { "x-elly-role": role } : {}),
    ...(departmentId ? { "x-elly-department-id": departmentId } : {}),
    ...(workspaceId ? { "x-hospital-id": workspaceId } : {}),
    ...(workspaceEllyId ? { "x-elly-hospital-id": workspaceEllyId } : {}),
    ...(workspaceEllyId ? { "x-elly-partner-id": workspaceEllyId } : {}),
  };
}

export const apiRequest = async (path, options = {}) => {
  if (MOCK_MODE) {
    return mockApiRequest(path, options);
  }

  let response;
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...getSessionHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("API request failed:", {
      url: `${API_BASE_URL}${path}`,
      error,
    });

    throw new Error(
      `Request failed while contacting ${API_BASE_URL}${path}. Reason: ${
        error.message || "Network request failed"
      }`,
      { cause: error },
    );
  }

  const contentType = response.headers.get("content-type") || "";

  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object"
        ? [body.message, body.error].filter(Boolean).join(": ") ||
          JSON.stringify(body)
        : body;

    const error = new Error(
      `Request failed (${response.status}): ${message || response.statusText}`,
    );
    error.status = response.status;
    if (typeof body === "object" && body) {
      error.code = body.code || null;
      error.details = body.details || null;
    }
    throw error;
  }

  return body;
};

export const apiRequestBlob = async (path, options = {}) => {
  if (MOCK_MODE) {
    return mockApiRequestBlob(path, options);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...getSessionHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("API request failed:", {
      url: `${API_BASE_URL}${path}`,
      error,
    });

    throw new Error(
      `Request failed while contacting ${API_BASE_URL}${path}. Reason: ${
        error.message || "Network request failed"
      }`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";

    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    const message =
      typeof body === "object"
        ? [body.message, body.error].filter(Boolean).join(": ") ||
          JSON.stringify(body)
        : body;

    throw new Error(
      `Request failed (${response.status}): ${message || response.statusText}`,
    );
  }

  return await response.blob();
};

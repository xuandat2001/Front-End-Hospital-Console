import useSessionStore from "../../store/useSessionStore";
import { isMockMode, mockApiBlob, mockApiRequest } from "../mockApi";

export const API_BASE_URL =
  isMockMode
    ? "mock://elly-api"
    : import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function getSessionHeaders() {
  const session = useSessionStore.getState();

  const currentUser = session.currentUser;
  const workspace = session.workspace;

  return {
    ...(currentUser?.ellyId ? { "x-elly-id": currentUser.ellyId } : {}),
    ...(currentUser?.role ? { "x-elly-role": currentUser.role } : {}),
    ...(currentUser?.departmentId
      ? { "x-elly-department-id": currentUser.departmentId }
      : {}),
    ...(workspace?.id ? { "x-hospital-id": workspace.id } : {}),
    ...(workspace?.ellyHospitalId
      ? { "x-elly-hospital-id": workspace.ellyHospitalId }
      : {}),
    ...(workspace?.ellyHospitalId
      ? { "x-elly-partner-id": workspace.ellyHospitalId }
      : {}),
  };
}

export const apiRequest = async (path, options = {}) => {
  if (isMockMode) {
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

    throw new Error(
      `Request failed (${response.status}): ${message || response.statusText}`,
    );
  }

  return body;
};

export const apiRequestBlob = async (path, options = {}) => {
  if (isMockMode) {
    return mockApiBlob(path, options);
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

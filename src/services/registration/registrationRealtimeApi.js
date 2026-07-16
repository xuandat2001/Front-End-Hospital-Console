import { isMockMode, mockGatewayRequest } from "../mockApi";

const apiBaseUrl =
  isMockMode ? "mock://elly-api" : import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api";

export const gatewayUrl =
  import.meta.env.VITE_API_GATEWAY_URL ||
  apiBaseUrl.replace(/\/api\/?$/, "");

export const hospitalIdentity = {
  ellyId: import.meta.env.VITE_ELLY_ID || "ELLY-STAFF-001",
  partnerId: import.meta.env.VITE_ELLY_PARTNER_ID || "HCM-2048",
  role: import.meta.env.VITE_ELLY_ROLE || "HOSPITAL_ADMIN",
};

const identityHeaders = {
  "Content-Type": "application/json",
  "x-elly-id": hospitalIdentity.ellyId,
  "x-elly-partner-id": hospitalIdentity.partnerId,
  "x-elly-role": hospitalIdentity.role,
};

async function registrationRequest(path, options = {}) {
  if (isMockMode) {
    return mockGatewayRequest(path, options);
  }

  let response;

  try {
    response = await fetch(`${gatewayUrl}${path}`, {
      ...options,
      headers: {
        ...identityHeaders,
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot reach API Gateway at ${gatewayUrl}. Make sure the gateway is running.`,
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.message || `Registration request failed with status ${response.status}`,
    );
  }

  return body.data;
}

export function getRegistrationNotifications() {
  return registrationRequest(
    "/api/notifications?eventType=RegistrationSuccessEvent&limit=100",
  );
}

export function getRegistrationUnreadCount() {
  return registrationRequest(
    "/api/notifications/unread-count?eventType=RegistrationSuccessEvent",
  );
}

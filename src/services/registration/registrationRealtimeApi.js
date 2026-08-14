import { mockDirectData } from "../mock/mockApi";

export const gatewayUrl = "mock://elly-prototype";

export const hospitalIdentity = {
  ellyId: "ELLY-USER-HOSP-ADMIN-001",
  partnerId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  role: "HOSPITAL_ADMIN",
};

async function registrationRequest(path) {
  const payload = await mockDirectData(path);
  return payload?.data ?? payload;
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

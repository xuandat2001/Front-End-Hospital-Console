/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS, ROLES } from "../constant/rbac";

const AUTH_STORAGE_KEY = "ellyAuthSession";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("useSessionStore permission hydration", () => {
  it("restores Hospital Admin navigation permissions from partial sessions", async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: "test-token",
        currentUser: { role: ROLES.HOSPITAL_ADMIN },
        permissions: [PERMISSIONS.STAFF_READ, PERMISSIONS.PATIENT_READ],
        role: ROLES.HOSPITAL_ADMIN,
      }),
    );

    const { default: useSessionStore } = await import("./useSessionStore");
    const permissions = useSessionStore.getState().permissions;

    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.STAFF_READ,
        PERMISSIONS.PATIENT_READ,
        PERMISSIONS.ROOM_READ,
        PERMISSIONS.INTELLIGENCE_READ,
      ]),
    );
  });

  it("keeps explicit permissions authoritative for restricted roles", async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: "test-token",
        currentUser: { role: ROLES.NURSE },
        permissions: [PERMISSIONS.PATIENT_READ],
        role: ROLES.NURSE,
      }),
    );

    const { default: useSessionStore } = await import("./useSessionStore");

    expect(useSessionStore.getState().permissions).toEqual([
      PERMISSIONS.PATIENT_READ,
    ]);
  });
});

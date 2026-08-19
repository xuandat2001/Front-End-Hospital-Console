import { describe, expect, it } from "vitest";
import { mockApiRequest } from "./mockApi";
import { isPatientRegisteredAtHospital } from "../../utils/patientHospitalAccess";
import { mockExternalHospital, mockHospital } from "../../mocks/mockData";

describe("prototype mock API contracts", () => {
  it("returns unread summaries as an array of conversation counts", async () => {
    const unreadResponse = await mockApiRequest("/messages/unread");

    expect(Array.isArray(unreadResponse.data)).toBe(true);
    expect(unreadResponse.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversationId: "conv-admin-emergency",
          unreadCount: expect.any(Number),
        }),
      ]),
    );
  });

  it("updates local message state when sending and marking a conversation read", async () => {
    const messageResponse = await mockApiRequest(
      "/messages/conversations/conv-admin-doctor/messages",
      {
        method: "POST",
        body: JSON.stringify({ content: "Prototype contract check." }),
      },
    );
    expect(messageResponse.data.content).toBe("Prototype contract check.");

    const messagesResponse = await mockApiRequest(
      "/messages/conversations/conv-admin-doctor/messages",
    );
    expect(messagesResponse.data.at(-1).content).toBe("Prototype contract check.");

    await mockApiRequest("/messages/conversations/conv-admin-doctor/read", {
      method: "PATCH",
    });
    const unreadResponse = await mockApiRequest("/messages/unread");
    const doctorUnread = unreadResponse.data.find(
      (item) => item.conversationId === "conv-admin-doctor",
    );
    expect(doctorUnread.unreadCount).toBe(0);
  });

  it("keeps local and external patient hospital relationships distinct", async () => {
    const localResponse = await mockApiRequest("/patients/elly/ELLY-PAT-001");
    const secondLocalResponse = await mockApiRequest("/patients/elly/ELLY-PAT-002");
    const externalResponse = await mockApiRequest("/patients/elly/ELLY-PAT-003");

    expect(isPatientRegisteredAtHospital(localResponse.data.patient, mockHospital)).toBe(true);
    expect(isPatientRegisteredAtHospital(secondLocalResponse.data.patient, mockHospital)).toBe(true);
    expect(isPatientRegisteredAtHospital(externalResponse.data.patient, mockHospital)).toBe(false);
    expect(
      isPatientRegisteredAtHospital(externalResponse.data.patient, mockExternalHospital),
    ).toBe(true);
  });

  it("returns array collections for intelligence performance record endpoints", async () => {
    const admission = await mockApiRequest("/intelligence/admission-performance");
    const surgery = await mockApiRequest("/intelligence/surgery-performance");
    const room = await mockApiRequest("/intelligence/room-performance");
    const staff = await mockApiRequest("/intelligence/staff-performance");
    const patientRecords = await mockApiRequest("/intelligence/patient-performance/records");

    expect(Array.isArray(admission.data)).toBe(true);
    expect(Array.isArray(surgery.data)).toBe(true);
    expect(Array.isArray(room.data)).toBe(true);
    expect(Array.isArray(staff.data)).toBe(true);
    expect(Array.isArray(patientRecords.data)).toBe(true);
    expect(admission.data[0]).toEqual(expect.objectContaining({ performanceId: expect.any(String) }));
  });

  it("returns admission performance stats as a summary object", async () => {
    const response = await mockApiRequest("/intelligence/admission-performance/stats");

    expect(response.data).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({ total: expect.any(Number) }),
        byAdmissionType: expect.any(Array),
      }),
    );
  });
});

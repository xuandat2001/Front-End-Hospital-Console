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
});

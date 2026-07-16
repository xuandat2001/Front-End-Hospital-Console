import { create } from "zustand";

function buildRegistrationEntry(payload) {
  return {
    notificationId: payload.notificationId || payload._id || null,
    eventId: payload.eventId,
    ellyId: payload.ellyId || payload.data?.ellyId,
    fullName: payload.fullName || null,
    hospitalId: payload.hospitalId || payload.data?.hospitalId,
    hospitalMRN: payload.hospitalMRN || payload.data?.hospitalMRN,
    registeredAt: payload.registeredAt || payload.occurredAt || new Date().toISOString(),
  };
}

const useRegistrationStore = create((set) => ({
  incomingPayload: null,
  showNotification: false,
  seenToastEventIds: [],
  focusRegistrationEventId: null,
  pendingPatientEditId: null,

  receiveRegistration: (payload) =>
    set((state) => {
      const entry = buildRegistrationEntry(payload);
      if (!entry.eventId) return state;

      const alreadySeen = state.seenToastEventIds.includes(entry.eventId);
      const isSameEvent = state.incomingPayload?.eventId === entry.eventId;

      const mergedPayload = isSameEvent
        ? {
            ...state.incomingPayload,
            ...payload,
            ...entry,
            notificationId:
              entry.notificationId || state.incomingPayload.notificationId || null,
            fullName: entry.fullName || state.incomingPayload.fullName || null,
          }
        : { ...payload, ...entry };

      return {
        incomingPayload: mergedPayload,
        showNotification: alreadySeen ? state.showNotification : true,
        seenToastEventIds: alreadySeen
          ? state.seenToastEventIds
          : [entry.eventId, ...state.seenToastEventIds].slice(0, 100),
      };
    }),

  setFocusRegistration: (eventId) => set({ focusRegistrationEventId: eventId }),
  clearFocusRegistration: () => set({ focusRegistrationEventId: null }),

  clearNotification: () => set({ showNotification: false }),
  clearRegistration: () =>
    set({
      incomingPayload: null,
      showNotification: false,
    }),

  triggerPatientEdit: (ellyId) => set({ pendingPatientEditId: ellyId }),
  clearPatientEdit: () => set({ pendingPatientEditId: null }),
}));

export default useRegistrationStore;

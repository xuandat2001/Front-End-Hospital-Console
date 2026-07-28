import { create } from "zustand";

/**
 * Holds the EllyID selected from the global patient search in the LeftRail.
 * The Patient tab (Core Modules → Patient) reads `activeEllyId` and renders a
 * full patient record view when it is set, falling back to the census
 * dashboard when it is cleared.
 *
 * `activeRecordTab` optionally opens a specific PatientRecordView tab
 * (e.g. "risk-monitor" from Patient Performance).
 * `pendingOpenRecord` asks App to switch to patient-dashboard when opening
 * a record from another patient function (e.g. performance).
 */
const usePatientSearchStore = create((set) => ({
  activeEllyId: null,
  activeRecordTab: null,
  pendingOpenRecord: false,

  setActiveEllyId: (ellyId, options = {}) =>
    set({
      activeEllyId: ellyId ? String(ellyId).trim() : null,
      activeRecordTab: options.tab || null,
      pendingOpenRecord: options.openDashboard === true,
    }),

  clearActiveEllyId: () =>
    set({
      activeEllyId: null,
      activeRecordTab: null,
      pendingOpenRecord: false,
    }),

  clearActiveRecordTab: () => set({ activeRecordTab: null }),

  consumePendingOpenRecord: () => set({ pendingOpenRecord: false }),
}));

export default usePatientSearchStore;

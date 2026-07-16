import { create } from "zustand";

/**
 * Holds the EllyID selected from the global patient search in the LeftRail.
 * The Patient tab (Core Modules → Patient) reads `activeEllyId` and renders a
 * full patient record view when it is set, falling back to the census
 * dashboard when it is cleared.
 */
const usePatientSearchStore = create((set) => ({
  activeEllyId: null,

  setActiveEllyId: (ellyId) =>
    set({ activeEllyId: ellyId ? String(ellyId).trim() : null }),

  clearActiveEllyId: () => set({ activeEllyId: null }),
}));

export default usePatientSearchStore;

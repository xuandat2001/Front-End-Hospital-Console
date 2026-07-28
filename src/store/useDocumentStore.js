import { create } from "zustand";

function generateReport(title, data) {
  const lines = [`# ${title}`, "", "---", ""];
  for (const [key, value] of Object.entries(data)) {
    const v = Array.isArray(value)
      ? value.map((item) => `- ${item}`).join("\n")
      : String(value);
    lines.push(`**${key}**`);
    lines.push("");
    lines.push(v);
    lines.push("");
  }
  return lines.join("\n");
}

const useDocumentStore = create((set, get) => ({
  isDocumentMode: false,
  hoveredWidgetId: null,
  selectedWidget: null,

  _registry: {},

  enterDocumentMode: () =>
    set({
      isDocumentMode: true,
      hoveredWidgetId: null,
      selectedWidget: null,
    }),

  exitDocumentMode: () =>
    set({
      isDocumentMode: false,
      hoveredWidgetId: null,
      selectedWidget: null,
    }),

  setHoveredWidgetId: (id) => set({ hoveredWidgetId: id }),

  registerWidget: (id, config) => {
    set((state) => ({
      _registry: { ...state._registry, [id]: config },
    }));
  },

  unregisterWidget: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state._registry;
      return { _registry: rest };
    });
  },

  selectWidget: (id) => {
    const state = get();

    let title, data;

    if (id && state._registry[id]) {
      const config = state._registry[id];
      title = config.title;
      data = config.extract();
    } else if (id) {
      const el = document.querySelector(`[data-widget-id="${id}"]`);
      title = el?.getAttribute("data-widget-title") || "Dashboard Component";
      data = {
        Status:
          "This component does not have enough data to create a document.",
      };
    } else {
      title = "Dashboard Component";
      data = {
        Status:
          "This component does not have enough data to create a document.",
      };
    }

    const report = generateReport(title, data);
    set({
      isDocumentMode: false,
      hoveredWidgetId: null,
      selectedWidget: { id, title, data, report, generatedAt: new Date() },
    });
  },

  clearSelection: () => set({ selectedWidget: null }),
}));

export default useDocumentStore;

import {
  Bone,
  Brain,
  FlaskConical,
  HeartPulse,
  Maximize2,
  Minus,
  Plus,
  ScanLine,
  ShieldPlus,
  Utensils,
  Wind,
} from "lucide-react";

const BODY_SYSTEMS = [
  { id: "overview", label: "Overview", Icon: ScanLine },
  { id: "cardiovascular", label: "Cardiovascular", Icon: HeartPulse },
  { id: "respiratory", label: "Respiratory", Icon: Wind },
  { id: "nervous", label: "Nervous", Icon: Brain },
  { id: "digestive", label: "Digestive", Icon: Utensils },
  { id: "musculoskeletal", label: "Musculoskeletal", Icon: Bone },
  { id: "immune", label: "Immune", Icon: ShieldPlus },
  { id: "endocrine", label: "Endocrine", Icon: FlaskConical },
];

const VIEWER_CONTROLS = [
  { id: "zoom-in", label: "Zoom in", Icon: Plus },
  { id: "zoom-out", label: "Zoom out", Icon: Minus },
  { id: "fullscreen", label: "Fullscreen", Icon: Maximize2 },
];

/**
 * Reserved viewport for the interactive 3D human body.
 * Mount your Three.js / WebGL canvas inside `.patient-body-model-canvas`.
 */
export default function PatientBodyModelSlot({
  activeSystem = "overview",
  onSystemChange,
  patientName,
}) {
  const activeMeta = BODY_SYSTEMS.find((s) => s.id === activeSystem) || BODY_SYSTEMS[0];
  const ActiveSystemIcon = activeMeta.Icon;

  return (
    <div className="flex h-full min-h-[520px] w-full gap-3 xl:min-h-0">
      <nav
        aria-label="Body systems"
        className="flex w-14 shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/40 p-2 shadow-lg shadow-sky-900/5 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40"
      >
        {BODY_SYSTEMS.map((system) => {
          const isActive = system.id === activeSystem;
          const SystemIcon = system.Icon;
          return (
            <button
              key={system.id}
              type="button"
              title={system.label}
              onClick={() => onSystemChange?.(system.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? "bg-sky-500/90 text-white shadow-md shadow-sky-500/30"
                  : "text-slate-500 hover:bg-white/70 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-800/80"
              }`}
            >
              <SystemIcon size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/55 shadow-xl shadow-sky-900/8 ring-1 ring-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
        <div
          id="patient-body-model-canvas"
          className="patient-body-model-canvas relative flex flex-1 items-center justify-center p-6"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-6 flex h-48 w-36 items-center justify-center rounded-full border-2 border-dashed border-sky-300/60 bg-white/30 dark:border-sky-700/50 dark:bg-slate-800/30">
              <svg
                viewBox="0 0 120 200"
                className="h-40 w-24 text-sky-300/80 dark:text-sky-600/60"
                aria-hidden="true"
              >
                <ellipse cx="60" cy="28" rx="22" ry="26" fill="currentColor" opacity="0.35" />
                <path
                  d="M60 54 L60 120 M35 70 L85 70 M60 120 L40 175 M60 120 L80 175"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.35"
                />
                {activeSystem === "respiratory" && (
                  <ellipse cx="48" cy="88" rx="10" ry="14" fill="#f472b6" opacity="0.7" />
                )}
                {activeSystem === "respiratory" && (
                  <ellipse cx="72" cy="88" rx="10" ry="14" fill="#f472b6" opacity="0.7" />
                )}
                {activeSystem === "cardiovascular" && (
                  <text x="52" y="95" fontSize="20" fill="#ef4444" opacity="0.8">
                    ♥
                  </text>
                )}
              </svg>
            </div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              <ActiveSystemIcon size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              3D body model integration point
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mount your viewer in{" "}
              <code className="rounded bg-white/60 px-1 py-0.5 text-[10px] dark:bg-slate-800/80">
                #patient-body-model-canvas
              </code>
            </p>
            <p className="mt-3 text-xs text-sky-600 dark:text-sky-400">
              Focus: {activeMeta.label}
              {patientName ? ` · ${patientName}` : ""}
            </p>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 max-w-xs rounded-2xl border border-white/70 bg-white/55 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/55">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              <ActiveSystemIcon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Clinical focus
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
            {activeMeta.label} system selected
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Highlight regions on the 3D model when your viewer is connected.
          </p>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {VIEWER_CONTROLS.map((control) => {
            const ControlIcon = control.Icon;
            return (
              <button
                key={control.id}
                type="button"
                disabled
                title={`${control.label} — connect 3D viewer to enable`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-600 shadow-md backdrop-blur-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
              >
                <ControlIcon size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { BODY_SYSTEMS };

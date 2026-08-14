import { useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import PatientBodyModelViewer from "./PatientBodyModelViewer";

function IconShell({ size = 18, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Overview — person silhouette (matches reference top icon). */
function PersonIcon(props) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="7" r="3.4" />
      <path d="M5.5 19.5c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8v.3H5.5v-.3Z" />
    </IconShell>
  );
}

/** Cardiovascular — anatomical heart. */
function HeartIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M12 20.2s-6.8-4.2-8.6-8.1C1.8 8.9 3.3 5.8 6.4 5.2c1.7-.3 3.3.4 4.1 1.7.2.3.4.5.7.7l.8-.7c.8-1.3 2.4-2 4.1-1.7 3.1.6 4.6 3.7 3 6.9-1.8 3.9-8.1 8.1-8.1 8.1Z" />
    </IconShell>
  );
}

/** Respiratory — paired lungs + trachea. */
function LungsIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M11.2 4.2h1.6v5.4h-1.6V4.2Z" />
      <path d="M11.2 9.2c-1.4.1-2.7.6-3.7 1.5C5.7 12.3 4.6 14.6 4.6 17.2c0 1.6 1.1 2.8 2.6 2.8 1.1 0 2-.6 2.4-1.5l1.6-4.3v-5Z" />
      <path d="M12.8 9.2c1.4.1 2.7.6 3.7 1.5 1.8 1.6 2.9 3.9 2.9 6.5 0 1.6-1.1 2.8-2.6 2.8-1.1 0-2-.6-2.4-1.5l-1.6-4.3v-5Z" />
      <path d="M7.2 11.4c-1.5-.3-3 .5-3.5 2-.5 1.5.2 3 1.5 3.6" opacity="0.35" />
      <path d="M16.8 11.4c1.5-.3 3 .5 3.5 2 .5 1.5-.2 3-1.5 3.6" opacity="0.35" />
    </IconShell>
  );
}

/** Nervous — top-down brain. */
function BrainIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M12 3.8c-2 0-3.5 1-4.2 2.5A3.2 3.2 0 0 0 4.6 9.2c0 1.4.7 2.5 1.7 3.1v3.1c0 .8.6 1.4 1.4 1.4h1.2c.4 0 .8-.3 1-.6L10.5 14H11v4.2h2V14h.5l.6 2.2c.2.3.6.6 1 .6h1.2c.8 0 1.4-.6 1.4-1.4v-3.1c1-.6 1.7-1.7 1.7-3.1a3.2 3.2 0 0 0-3.2-3C15.5 4.8 14 3.8 12 3.8Z" />
      <path d="M12 6.8v9.2" opacity="0.28" />
      <path d="M8.8 10.2h2M13.2 10.2h2M8.8 12.4h2M13.2 12.4h2" opacity="0.28" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </IconShell>
  );
}

/** Digestive — stomach. */
function StomachIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M9.2 3.8c0 1.6-.5 2.9-1.4 4C6.4 9.5 5.2 11.4 5.2 14c0 3.6 2.8 6 6.2 6h.8c2.7 0 4.8-1.4 5.9-3.5.9-1.6 1.4-3.7.7-5.8-.8-2.6-2.8-4-5.2-4.2-.6 0-1.2.1-1.8.3C11.2 5.6 10.6 4.6 10.6 3.8H9.2Z" />
      <path
        d="M10.2 13.8c1.4.8 3.2.8 4.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </IconShell>
  );
}

/** Musculoskeletal — bone (reference skeletal style). */
function BoneIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M7.2 5.2a2.2 2.2 0 1 1 2.9 2.1L8.6 8.8a2.2 2.2 0 1 1-2.1-2.9l.7-.7Z" />
      <path d="M16.8 18.8a2.2 2.2 0 1 1-2.9-2.1l1.5-1.5a2.2 2.2 0 1 1 2.1 2.9l-.7.7Z" />
      <path d="M9.6 9.2 14.8 14.4" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="7.8" cy="4.6" r="1.5" />
      <circle cx="5.4" cy="7" r="1.5" />
      <circle cx="16.2" cy="19.4" r="1.5" />
      <circle cx="18.6" cy="17" r="1.5" />
    </IconShell>
  );
}

/** Immune — antibody (Y-shaped immunoglobulin). */
function AntibodyIcon(props) {
  return (
    <IconShell {...props}>
      {/* Stem */}
      <rect x="10.6" y="11" width="2.8" height="9.6" rx="1.4" />
      {/* Left arm */}
      <path d="M12 12.2 7.4 6.4a2 2 0 1 1 2.9-2.8L12 7.6" />
      <circle cx="6.6" cy="4.4" r="2.1" />
      {/* Right arm */}
      <path d="M12 12.2 16.6 6.4a2 2 0 1 0-2.9-2.8L12 7.6" />
      <circle cx="17.4" cy="4.4" r="2.1" />
    </IconShell>
  );
}

/** Endocrine — butterfly thyroid + hormone droplet. */
function ThyroidIcon(props) {
  return (
    <IconShell {...props}>
      <path d="M11 7.4C8.6 6.6 5.6 7.6 4.8 10.8c-.9 3.4.6 6.6 3.2 7.4 1.5.5 2.8-.2 3.3-1.5V8.6c0-.5-.1-.9-.3-1.2Z" />
      <path d="M13 7.4c2.4-.8 5.4.2 6.2 3.4.9 3.4-.6 6.6-3.2 7.4-1.5.5-2.8-.2-3.3-1.5V8.6c0-.5.1-.9.3-1.2Z" />
      <rect x="10.2" y="10.8" width="3.6" height="2.6" rx="1.2" />
      <path d="M12 2.8c1.5 1.8 2.4 2.9 2.4 4A2.4 2.4 0 0 1 12 9.2 2.4 2.4 0 0 1 9.6 6.8c0-1.1.9-2.2 2.4-4Z" />
    </IconShell>
  );
}

const BODY_SYSTEMS = [
  { id: "overview", label: "Overview", Icon: PersonIcon },
  { id: "cardiovascular", label: "Cardiovascular", Icon: HeartIcon },
  { id: "respiratory", label: "Respiratory", Icon: LungsIcon },
  { id: "nervous", label: "Nervous", Icon: BrainIcon },
  { id: "digestive", label: "Digestive", Icon: StomachIcon },
  { id: "musculoskeletal", label: "Musculoskeletal", Icon: BoneIcon },
  { id: "immune", label: "Immune", Icon: AntibodyIcon },
  { id: "endocrine", label: "Endocrine", Icon: ThyroidIcon },
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
  patientGender,
}) {
  const viewerRef = useRef(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  const runViewerControl = (controlId) => {
    if (controlId === "zoom-in") viewerRef.current?.zoomIn();
    if (controlId === "zoom-out") viewerRef.current?.zoomOut();
    if (controlId === "fullscreen") viewerRef.current?.fullscreen();
  };

  return (
    <div className="relative flex h-full min-h-0 w-full gap-3 xl:min-h-0">
      <nav
        aria-label="Body systems"
        className="absolute left-2 top-2 z-20 flex w-14 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/60 bg-white/70 p-2 shadow-lg shadow-sky-900/5 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:static sm:z-auto sm:bg-white/50 dark:sm:bg-slate-900/50"
      >
        {BODY_SYSTEMS.map((system) => {
          const isActive = system.id === activeSystem;
          const SystemIcon = system.Icon;
          return (
            <button
              key={system.id}
              type="button"
              title={system.label}
              aria-label={system.label}
              aria-pressed={isActive}
              onClick={() => onSystemChange?.(system.id)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all motion-reduce:transition-none ${
                isActive
                  ? "bg-slate-800 text-white shadow-md shadow-slate-800/25 dark:bg-sky-600"
                  : "text-slate-400 hover:bg-white/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
              }`}
            >
              <SystemIcon size={18} />
            </button>
          );
        })}
      </nav>

      <div
        data-testid="patient-body-model-surface"
        className="relative isolate flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/60 bg-white/55 shadow-xl shadow-violet-950/15 ring-1 ring-white/80 backdrop-blur-xl dark:border-violet-300/15 dark:bg-violet-950/55"
      >
        <div
          id="patient-body-model-canvas"
          data-testid="patient-body-model-canvas-layer"
          className="patient-body-model-canvas absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
        >
          <PatientBodyModelViewer
            ref={viewerRef}
            activeSystem={activeSystem}
            onLoadingChange={setIsModelLoading}
            patientGender={patientGender}
          />
          {isModelLoading && (
            <div className="pointer-events-none relative z-10 flex flex-col items-center gap-3 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                Loading anatomical model…
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute left-[4.5rem] top-5 z-10 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 sm:left-5">
            Drag to rotate · Scroll to zoom
          </div>
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            {VIEWER_CONTROLS.map((control) => {
              const ControlIcon = control.Icon;
              return (
                <button
                  key={control.id}
                  type="button"
                  onClick={() => runViewerControl(control.id)}
                  aria-label={control.label}
                  title={control.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-sky-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-sky-400"
                >
                  <ControlIcon size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export { BODY_SYSTEMS };

import { useEffect, useState } from "react";
import { centerTabs } from "./data";
import navData, { getSubsections, getFunction, getDefaultFunction } from "./tab-data";
import LeftRail from "./components/dashboard/LeftRail";
import RightRail from "./components/dashboard/RightRail";
import DashboardContent from "./components/dashboard/DashboardContent";
import InteractionLayer from "./components/dashboard/InteractionLayer";
import LenisScrollLayer from "./components/dashboard/LenisScrollLayer";
import SettingsPage from "./components/dashboard/SettingsPage";
import useEmergencyRealtime from "./hooks/useEmergencyRealtime";
import useRegistrationRealtime from "./hooks/useRegistrationRealtime";
import useRegistrationStore from "./hooks/useRegistrationStore";
import HospitalAccessPage from "./pages/hospital-access/HospitalAccessPage";
import DiagnosticsPopup from "./pages/diagnostics/DiagnosticsPopup";
import ToastContainer from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import useSessionStore from "./store/useSessionStore";
import usePatientSearchStore from "./store/usePatientSearchStore";
import { PERMISSIONS } from "./constant/rbac";
import { isMockMode } from "./services/mockApi";
import "./App.css";

const HOSPITAL_ACCESS_ROUTE = "/hospital-access";
const DASHBOARD_ROUTE = "/";
const LEFT_RAIL_COLLAPSED_KEY = "hospitalConsoleLeftRailCollapsed";

function getInitialLeftRailCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LEFT_RAIL_COLLAPSED_KEY) === "true";
}

function getInitialDomain() {
  return localStorage.getItem("activeDomain") || "overview";
}

function getInitialFunction() {
  const domain = getInitialDomain();
  const savedFunction = localStorage.getItem("activeFunction");

  const subs = getSubsections(domain);
  if (subs.length > 0) {
    const firstDashboardFn = getFunction(domain, subs[0].id, "dashboard");
    if (subs.some((s) => s.id === savedFunction)) return savedFunction;
    const mappedViaTab = subs.some((s) => {
      const tabFns = Object.values(s.tabs || {});
      return tabFns.includes(savedFunction);
    });
    if (mappedViaTab) return savedFunction;
    return firstDashboardFn || subs[0].id;
  }

  return getDefaultFunction(domain) || "command";
}

function getInitialSubsection() {
  const domain = getInitialDomain();
  const savedFunction = localStorage.getItem("activeFunction");
  const subs = getSubsections(domain);
  if (subs.length === 0) return null;

  for (const sub of subs) {
    if (sub.id === savedFunction) return sub.id;
    const tabFns = Object.values(sub.tabs || {});
    if (tabFns.includes(savedFunction)) return sub.id;
  }
  return subs[0].id;
}

function getInitialCenterTab() {
  const saved = localStorage.getItem("activeCenterTab");
  return centerTabs.some((t) => t.id === saved) ? saved : "dashboard";
}

function getCurrentPath() {
  if (typeof window === "undefined") return DASHBOARD_ROUTE;
  return window.location.pathname || DASHBOARD_ROUTE;
}

function HospitalDashboardApp() {
  const [activeDomain, setActiveDomain] = useState(getInitialDomain);
  const [activeModule, setActiveModule] = useState("clinical-operations");
  const [activeFunction, setActiveFunction] = useState(getInitialFunction);
  const [activeSubsection, setActiveSubsection] = useState(getInitialSubsection);
  const [activeCenterTab, setActiveCenterTab] = useState(getInitialCenterTab);
  const [emergencyNavigation, setEmergencyNavigation] = useState(null);
  const [returnNavigation, setReturnNavigation] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(
    getInitialLeftRailCollapsed,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [diagnosticsDepartments, setDiagnosticsDepartments] = useState([]);
  const emergencyRealtime = useEmergencyRealtime();
  const registrationRealtime = useRegistrationRealtime();

  // Zustand state for the global notification
  const showNotification = useRegistrationStore((state) => state.showNotification);
  const incomingPayload = useRegistrationStore((state) => state.incomingPayload);
  const clearNotification = useRegistrationStore((state) => state.clearNotification);
  const setActiveEllyId = usePatientSearchStore((state) => state.setActiveEllyId);
  const clearActiveEllyId = usePatientSearchStore((state) => state.clearActiveEllyId);
  const canReadPatients = useSessionStore((state) => state.can(PERMISSIONS.PATIENT_READ));

  const dismissRegistrationToast = () => {
    if (incomingPayload?.eventId) {
      registrationRealtime.dismissNotification(incomingPayload.eventId);
    }
    clearNotification();
  };

  useEffect(() => {
    localStorage.setItem("activeDomain", activeDomain);
    localStorage.setItem("activeFunction", activeFunction);
    localStorage.setItem("activeCenterTab", activeCenterTab);
  }, [activeDomain, activeFunction, activeCenterTab]);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.removeItem("rightRailWidth");
    localStorage.removeItem("leftRailWidth");
    document.documentElement.style.removeProperty("--right-rail-width");
    document.documentElement.style.removeProperty("--left-rail-width");
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LEFT_RAIL_COLLAPSED_KEY,
      String(isLeftRailCollapsed),
    );
  }, [isLeftRailCollapsed]);

  const handleDomainChange = (domainId) => {
    setActiveDomain(domainId);
    setActiveSubsection(null);
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setIsNavigationOpen(false);
    clearActiveEllyId();

    const fn = getDefaultFunction(domainId);
    if (fn) setActiveFunction(fn);
  };

  const handleSubsectionSelect = (domainId, subsectionId) => {
    setActiveDomain(domainId);
    setActiveSubsection(subsectionId);

    const fn = getFunction(domainId, subsectionId, "dashboard");
    setActiveFunction(fn || subsectionId);
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setIsNavigationOpen(false);
    clearActiveEllyId();
  };

  const handleCenterTabChange = (tabId) => {
    setActiveCenterTab(tabId);

    const section = navData[activeDomain];
    if (!section) return;

    if (activeSubsection && section.subsections?.[activeSubsection]) {
      const fn = getFunction(activeDomain, activeSubsection, tabId);
      setActiveFunction(fn || activeSubsection);
      return;
    }

    const fn = getFunction(activeDomain, null, tabId);
    if (fn) setActiveFunction(fn);
  };

  const handleNotificationsOpen = () => {
    setReturnNavigation({
      domain: activeDomain,
      functionId: activeFunction,
    });
    setActiveFunction("notifications");
    setIsNavigationOpen(false);
  };

  const handleNotificationsBack = () => {
    if (returnNavigation) {
      setActiveDomain(returnNavigation.domain);
      setActiveFunction(returnNavigation.functionId);
      setReturnNavigation(null);
      return;
    }

    setActiveFunction(getInitialFunction());
  };

  const handlePatientSearch = (ellyId) => {
    const trimmed = (ellyId || "").trim();
    if (!trimmed || !canReadPatients) return;

    setActiveDomain("management");
    setActiveSubsection("patient");
    setActiveFunction("patient-dashboard");
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setReturnNavigation(null);
    setIsNavigationOpen(false);
    setActiveEllyId(trimmed);
  };

  const handleModuleChange = (moduleValue) => {
    if (moduleValue === "radiology") {
      setDiagnosticsDepartments((prev) =>
        prev.includes("RADIOLOGY") ? prev : [...prev, "RADIOLOGY"]
      );
      return;
    }
    if (moduleValue === "laboratory") {
      setDiagnosticsDepartments((prev) =>
        prev.includes("LABORATORY") ? prev : [...prev, "LABORATORY"]
      );
      return;
    }
    setActiveModule(moduleValue);
  };

  const handleRoomSelect = (roomId) => {
    if (!roomId) return;
    setSelectedRoomId(roomId);
    setActiveDomain("management");
    setActiveFunction("room-management");
    setActiveCenterTab("resources");
  };

  const handleEmergencyRequestOpen = (alertId) => {
    if (!alertId) return;

    setReturnNavigation(null);
    setActiveDomain("operations");
    setActiveFunction("emergency");
    setActiveCenterTab("dashboard");
    setIsNavigationOpen(false);
    setEmergencyNavigation({
      alertId,
      navigationId: Date.now(),
    });
  };

  const handlePrototypeSectionReset = () => {
    setActiveDomain("overview");
    setActiveSubsection(null);
    setActiveFunction("command");
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setReturnNavigation(null);
    setIsNavigationOpen(false);
    clearActiveEllyId();
  };

  const handleRegistrationRequestOpen = (registrationData) => {
    if (!registrationData) return;

    if (registrationData.eventId) {
      registrationRealtime.dismissNotification(registrationData.eventId);
    }
    clearNotification();

    if (registrationData.ellyId) {
      handlePatientSearch(registrationData.ellyId);
    }
  };

  return (
    <div
      className={`dashboard-shell${
        isLeftRailCollapsed ? " is-left-rail-collapsed" : ""
      }`}
    >
      <InteractionLayer />
      <LenisScrollLayer />
      <div className="dashboard-aurora" aria-hidden="true" />

      {/* Registration Toast Notification */}
      {showNotification && incomingPayload && (
        <div className="registration-toast fixed bottom-6 right-80 z-50 flex max-w-sm flex-col gap-2 p-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="registration-toast__dot h-2 w-2 animate-pulse rounded-full"></div>
            <h4 className="text-sm font-bold">Patient Registered</h4>
          </div>
          <p className="text-xs">
            Patient ID <span className="font-semibold">{incomingPayload.ellyId}</span> was registered and auto-accepted into operations by logical priority.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                dismissRegistrationToast();
                if (incomingPayload.ellyId) {
                  handlePatientSearch(incomingPayload.ellyId);
                }
              }}
              className="registration-toast__primary rounded px-3 py-1.5 text-xs font-semibold"
            >
              Open record
            </button>
            <button
              onClick={dismissRegistrationToast}
              className="registration-toast__secondary rounded px-3 py-1.5 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
      <LeftRail
        activeDomain={activeDomain}
        activeSubsection={activeSubsection}
        onDomainChange={handleDomainChange}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onSubsectionSelect={handleSubsectionSelect}
        onPatientSearch={handlePatientSearch}
        isOpen={isNavigationOpen}
        onOpenChange={setIsNavigationOpen}
        isCollapsed={isLeftRailCollapsed}
        onCollapsedChange={setIsLeftRailCollapsed}
      />

      <main className="dashboard-main" id="main-content">
        <ErrorBoundary
          resetKeys={[activeDomain, activeFunction, activeCenterTab]}
          onReset={handlePrototypeSectionReset}
        >
          <DashboardContent
            activeModule={activeModule}
            activeFunction={activeFunction}
            activeCenterTab={activeCenterTab}
            onModuleChange={handleModuleChange}
            onCenterTabChange={handleCenterTabChange}
            emergencyRealtime={emergencyRealtime}
            registrationRealtime={registrationRealtime}
            emergencyNavigation={emergencyNavigation}
            onNavigationOpen={() => setIsNavigationOpen(true)}
            onNotificationsOpen={handleNotificationsOpen}
            onNotificationsBack={handleNotificationsBack}
            onEmergencyRequestOpen={handleEmergencyRequestOpen}
            onRegistrationRequestOpen={handleRegistrationRequestOpen}
            onRoomSelect={handleRoomSelect}
            selectedRoomId={selectedRoomId}
          />
        </ErrorBoundary>
      </main>

      <RightRail
        activeFunction={activeFunction}
        emergencyRealtime={emergencyRealtime}
        onEmergencyRequestOpen={handleEmergencyRequestOpen}
      />
      </div>

      {isSettingsOpen && (
        <SettingsPage
          isDark={isDark}
          onClose={() => setIsSettingsOpen(false)}
          onThemeChange={setIsDark}
        />
      )}

      {diagnosticsDepartments.map((dept, i) => (
        <DiagnosticsPopup
          key={dept}
          department={dept}
          offsetIndex={i}
          onClose={() =>
            setDiagnosticsDepartments((prev) => prev.filter((d) => d !== dept))
          }
        />
      ))}

      <ToastContainer />
    </div>
  );
}

function App() {
  const [routePath, setRoutePath] = useState(getCurrentPath);

  const workspace = useSessionStore((state) => state.workspace);
  const setWorkspace = useSessionStore((state) => state.setWorkspace);

  useEffect(() => {
    const syncPath = () => setRoutePath(getCurrentPath());

    window.addEventListener("popstate", syncPath);

    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (isMockMode && routePath === HOSPITAL_ACCESS_ROUTE) {
      window.history.replaceState({}, "", DASHBOARD_ROUTE);
      setRoutePath(DASHBOARD_ROUTE);
      return;
    }

    if (workspace || routePath === HOSPITAL_ACCESS_ROUTE) return;

    window.history.replaceState({}, "", HOSPITAL_ACCESS_ROUTE);
    setRoutePath(HOSPITAL_ACCESS_ROUTE);
  }, [workspace, routePath]);

  const handleAccessGranted = (hospitalWorkspace) => {
    setWorkspace(hospitalWorkspace);

    window.history.pushState({}, "", DASHBOARD_ROUTE);
    setRoutePath(DASHBOARD_ROUTE);
  };

  if (!workspace || routePath === HOSPITAL_ACCESS_ROUTE) {
    return <HospitalAccessPage onAccessGranted={handleAccessGranted} />;
  }

  return <HospitalDashboardApp />;
}
export default App;

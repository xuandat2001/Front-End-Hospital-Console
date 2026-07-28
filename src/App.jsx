import { useEffect, useState } from "react";
import { centerTabs } from "./data";
import navData, {
  getSubsections,
  getFunction,
  getDefaultFunction,
  getSectionIds,
} from "./tab-data";
import { canAccessFunction } from "./constant/pagePermissions";
import {
  getPermissionsByRole,
  getRoleLanding,
  ROLES,
} from "./constant/rbac";
import LeftRail from "./components/dashboard/LeftRail";
import RightRail from "./components/dashboard/RightRail";
import DashboardContent from "./components/dashboard/DashboardContent";
import InteractionLayer from "./components/dashboard/InteractionLayer";
import DocumentModal from "./components/document/DocumentModal";
import DocumentModeOverlay from "./components/document/DocumentModeOverlay";
import LenisScrollLayer from "./components/dashboard/LenisScrollLayer";
import SettingsPage from "./components/dashboard/SettingsPage";
import useEmergencyRealtime from "./hooks/useEmergencyRealtime";
import useRegistrationRealtime from "./hooks/useRegistrationRealtime";
import useRegistrationStore from "./hooks/useRegistrationStore";
import HospitalAccessPage from "./pages/hospital-access/HospitalAccessPage";
import DiagnosticsPopup from "./pages/diagnostics/DiagnosticsPopup";
import ToastContainer from "./components/Toast";
import AccessDenied from "./components/auth/AccessDenied";
import useSessionStore from "./store/useSessionStore";
import usePatientSearchStore from "./store/usePatientSearchStore";
import { PERMISSIONS } from "./constant/rbac";
import "./App.css";

const HOSPITAL_ACCESS_ROUTE = "/hospital-access";
const DASHBOARD_ROUTE = "/";
const SESSION_STORAGE_KEY = "ellyFrontendSession";
const AUTH_STORAGE_KEY = "ellyAuthSession";

function readStoredSession() {
  try {
    const stored =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getSessionRole() {
  const session = readStoredSession();
  return session?.role || session?.currentUser?.role || ROLES.HOSPITAL_ADMIN;
}

function getSessionPermissions() {
  const session = readStoredSession();
  return (
    session?.permissions || getPermissionsByRole(getSessionRole())
  );
}

function getInitialDomain() {
  const permissions = getSessionPermissions();
  const landing = getRoleLanding(getSessionRole());
  const savedDomain = localStorage.getItem("activeDomain");

  if (savedDomain && getSectionIds(permissions).includes(savedDomain)) {
    return savedDomain;
  }

  return landing.domain;
}

function getInitialFunction() {
  const permissions = getSessionPermissions();
  const landing = getRoleLanding(getSessionRole());
  const domain = getInitialDomain();
  const savedFunction = localStorage.getItem("activeFunction");

  if (savedFunction && canAccessFunction(savedFunction, permissions)) {
    const subs = getSubsections(domain, permissions);
    if (subs.length > 0) {
      const mappedViaTab = subs.some((sub) =>
        Object.values(sub.tabs || {}).includes(savedFunction),
      );
      if (mappedViaTab || subs.some((sub) => sub.id === savedFunction)) {
        return savedFunction;
      }
    } else if (navData[domain]?.tabs) {
      const tabFunctions = Object.values(navData[domain].tabs);
      if (tabFunctions.includes(savedFunction)) {
        return savedFunction;
      }
    }
  }

  if (landing.function && canAccessFunction(landing.function, permissions)) {
    return landing.function;
  }

  return getDefaultFunction(domain, permissions) || landing.function || "command";
}

function getInitialSubsection() {
  const permissions = getSessionPermissions();
  const landing = getRoleLanding(getSessionRole());
  const domain = getInitialDomain();
  const savedFunction = localStorage.getItem("activeFunction");
  const subs = getSubsections(domain, permissions);

  if (subs.length === 0) {
    return landing.subsection || null;
  }

  for (const sub of subs) {
    if (sub.id === savedFunction) return sub.id;
    const tabFunctions = Object.values(sub.tabs || {});
    if (tabFunctions.includes(savedFunction)) return sub.id;
  }

  return landing.subsection || subs[0].id;
}

function applyRoleLanding(role) {
  const landing = getRoleLanding(role);
  localStorage.setItem("activeDomain", landing.domain);
  localStorage.setItem("activeFunction", landing.function);
  localStorage.setItem("activeCenterTab", "dashboard");
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
  const permissions = useSessionStore((state) => state.permissions);
  const showWelcome = useSessionStore((state) => state.showWelcome);
  const setShowWelcome = useSessionStore((state) => state.setShowWelcome);
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
  const pendingOpenRecord = usePatientSearchStore((state) => state.pendingOpenRecord);
  const consumePendingOpenRecord = usePatientSearchStore(
    (state) => state.consumePendingOpenRecord,
  );
  const canReadPatients = useSessionStore((state) => state.can(PERMISSIONS.PATIENT_READ));
  const currentUser = useSessionStore((state) => state.currentUser);
  const workspace = useSessionStore((state) => state.activeWorkspace || state.workspace);
  const role = useSessionStore((state) => state.role);
  const consoleType = useSessionStore((state) => state.consoleType);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const logout = useSessionStore((state) => state.logout);

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

  function handleWelcomeOpen() {
    setActiveFunction("welcome");
  }

  useEffect(() => {
    if (showWelcome) {
      setShowWelcome(false);
      handleWelcomeOpen();
    }
  }, []);

  useEffect(() => {
    const role = currentUser?.role;
    const title = role
      ? `Elly - ${role.replaceAll("_", " ")} Console`
      : "Elly - Console";
    document.title = title;
  }, [currentUser?.role]);

  const handleDomainChange = (domainId) => {
    if (consoleType === "RESTRICTED") return;

    setActiveDomain(domainId);
    setActiveSubsection(null);
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setIsNavigationOpen(false);
    clearActiveEllyId();

    const fn = getDefaultFunction(domainId, permissions);
    if (fn) setActiveFunction(fn);
  };

  const handleSubsectionSelect = (domainId, subsectionId) => {
    setActiveDomain(domainId);
    setActiveSubsection(subsectionId);

    const defaultTab = subsectionId === "surgery" ? "planning" : "dashboard";
    const fn = getFunction(domainId, subsectionId, defaultTab);
    setActiveFunction(fn || subsectionId);
    setActiveCenterTab(defaultTab);
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

  useEffect(() => {
    if (!pendingOpenRecord || !canReadPatients) return;
    setActiveDomain("management");
    setActiveSubsection("patient");
    setActiveFunction("patient-dashboard");
    setActiveCenterTab("dashboard");
    setEmergencyNavigation(null);
    setReturnNavigation(null);
    setIsNavigationOpen(false);
    consumePendingOpenRecord();
  }, [pendingOpenRecord, canReadPatients, consumePendingOpenRecord]);

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
    <div className="dashboard-shell">
      <InteractionLayer />
      <LenisScrollLayer />
      <div className="dashboard-aurora" aria-hidden="true" />
      {isAuthenticated && (
        <div className="session-badge" aria-label="Current session">
          <div>
            <strong>{role || currentUser?.role}</strong>
            <span>{workspace?.workspaceName || workspace?.hospitalName}</span>
          </div>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      )}

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
        activeModule={activeModule}
        activeSubsection={activeSubsection}
        onDomainChange={handleDomainChange}
        onModuleChange={handleModuleChange}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onSubsectionSelect={handleSubsectionSelect}
        onPatientSearch={handlePatientSearch}
        onWelcomeOpen={handleWelcomeOpen}
        isOpen={isNavigationOpen}
        onOpenChange={setIsNavigationOpen}
      />

      <main className="dashboard-main" id="main-content">
        <DocumentModeOverlay>
        <DashboardContent
          activeFunction={activeFunction}
          activeCenterTab={activeCenterTab}
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
        </DocumentModeOverlay>
      </main>

      <RightRail
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

      <DocumentModal />
      <ToastContainer />
    </div>
  );
}

function App() {
  const [routePath, setRoutePath] = useState(getCurrentPath);

  const workspace = useSessionStore((state) => state.workspace);
  const setWorkspace = useSessionStore((state) => state.setWorkspace);
  const accessToken = useSessionStore((state) => state.accessToken);
  const loadMe = useSessionStore((state) => state.loadMe);
  const currentUser = useSessionStore((state) => state.currentUser);
  const consoleType = useSessionStore((state) => state.consoleType);

  useEffect(() => {
    const syncPath = () => setRoutePath(getCurrentPath());

    window.addEventListener("popstate", syncPath);

    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (workspace || routePath === HOSPITAL_ACCESS_ROUTE) return;

    window.history.replaceState({}, "", HOSPITAL_ACCESS_ROUTE);
    setRoutePath(HOSPITAL_ACCESS_ROUTE);
  }, [workspace, routePath]);

  useEffect(() => {
    if (!accessToken || workspace) return;

    loadMe().catch(() => {
      useSessionStore.getState().clearSession();
    });
  }, [accessToken, loadMe, workspace]);

  const handleAccessGranted = (hospitalWorkspace) => {
    setWorkspace(hospitalWorkspace);
    applyRoleLanding(useSessionStore.getState().role);

    window.history.pushState({}, "", DASHBOARD_ROUTE);
    setRoutePath(DASHBOARD_ROUTE);
  };

  if (!workspace || routePath === HOSPITAL_ACCESS_ROUTE) {
    return <HospitalAccessPage onAccessGranted={handleAccessGranted} />;
  }

  if (consoleType === "RESTRICTED") {
    return <AccessDenied />;
  }

  return (
    <HospitalDashboardApp
      key={`${workspace.id || workspace.ellyHospitalId}-${currentUser?.role}`}
    />
  );
}
export default App;

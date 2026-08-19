import { useCallback, useEffect, useState } from "react";
import { ROLES } from "./constant/rbac";
import LeftRail from "./components/dashboard/LeftRail";
import RightRail from "./components/dashboard/RightRail";
import DashboardContent from "./components/dashboard/DashboardContent";
import PrototypeErrorBoundary from "./components/prototype/PrototypeErrorBoundary";
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
import useDocumentStore from "./store/useDocumentStore";
import useMessagingStore from "./stores/useMessagingStore";
import { PERMISSIONS } from "./constant/rbac";
import { applyThemeClass, getInitialThemePreference } from "./utils/theme";
import {
  readStoredNavigation,
  resolveCenterTabNavigation,
  resolveDomainNavigation,
  resolveRoleLandingNavigation,
  resolveSafeNavigationState,
  resolveSubsectionNavigation,
  writeStoredNavigation,
} from "./utils/dashboardNavigation";
import "./App.css";

const HOSPITAL_ACCESS_ROUTE = "/hospital-access";
const DASHBOARD_ROUTE = "/";

function getSessionRole() {
  return useSessionStore.getState().role || ROLES.HOSPITAL_ADMIN;
}

function getSessionPermissions() {
  const permissions = useSessionStore.getState().permissions;
  return permissions?.length ? permissions : [];
}

function getInitialNavigation() {
  const permissions = getSessionPermissions();
  const role = getSessionRole();
  const storedNavigation = readStoredNavigation();
  const resolvedNavigation = resolveSafeNavigationState({
    ...storedNavigation,
    permissions,
    role,
  });

  if (!storedNavigation.functionId) {
    return resolvedNavigation;
  }

  const storedNavigationMatches =
    storedNavigation.domain === resolvedNavigation.domain &&
    (storedNavigation.subsection || null) === resolvedNavigation.subsection &&
    storedNavigation.centerTab === resolvedNavigation.centerTab &&
    storedNavigation.functionId === resolvedNavigation.functionId;

  if (storedNavigationMatches) {
    return resolvedNavigation;
  }

  return resolveRoleLandingNavigation({
    permissions,
    role,
  });
}

function getInitialDomain() {
  return getInitialNavigation().domain;
}

function getInitialFunction() {
  return getInitialNavigation().functionId;
}

function getInitialSubsection() {
  return getInitialNavigation().subsection;
}

function applyRoleLanding(role) {
  writeStoredNavigation(
    resolveRoleLandingNavigation({
      permissions: getSessionPermissions(),
      role,
    }),
  );
}

function getInitialCenterTab() {
  return getInitialNavigation().centerTab || "dashboard";
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
  const [isDark, setIsDark] = useState(getInitialThemePreference);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [diagnosticsDepartments, setDiagnosticsDepartments] = useState([]);
  const [transientResetKey, setTransientResetKey] = useState(0);
  const emergencyRealtime = useEmergencyRealtime();
  const registrationRealtime = useRegistrationRealtime();

  // Zustand state for the global notification
  const showNotification = useRegistrationStore((state) => state.showNotification);
  const incomingPayload = useRegistrationStore((state) => state.incomingPayload);
  const clearNotification = useRegistrationStore((state) => state.clearNotification);
  const setActiveEllyId = usePatientSearchStore((state) => state.setActiveEllyId);
  const activeEllyId = usePatientSearchStore((state) => state.activeEllyId);
  const clearActiveEllyId = usePatientSearchStore((state) => state.clearActiveEllyId);
  const pendingOpenRecord = usePatientSearchStore((state) => state.pendingOpenRecord);
  const consumePendingOpenRecord = usePatientSearchStore(
    (state) => state.consumePendingOpenRecord,
  );
  const canReadPatients = useSessionStore((state) => state.can(PERMISSIONS.PATIENT_READ));
  const currentUser = useSessionStore((state) => state.currentUser);
  const consoleType = useSessionStore((state) => state.consoleType);
  const role = currentUser?.role || getSessionRole();
  const diagnosticsPatientEllyId =
    activeFunction === "patient-dashboard" ? activeEllyId : null;
  const navigationKey = `${activeDomain}:${activeSubsection || ""}:${activeCenterTab}:${activeFunction}`;

  const dismissTransientUi = useCallback(() => {
    setIsNavigationOpen(false);
    setIsSettingsOpen(false);
    setDiagnosticsDepartments([]);
    setTransientResetKey((key) => key + 1);
    useDocumentStore.getState().exitDocumentMode();
    useMessagingStore.getState().dismissTransientMessagingUi();
  }, []);

  const dismissRegistrationToast = () => {
    if (incomingPayload?.eventId) {
      registrationRealtime.dismissNotification(incomingPayload.eventId);
    }
    clearNotification();
  };

  useEffect(() => {
    writeStoredNavigation({
      centerTab: activeCenterTab,
      domain: activeDomain,
      functionId: activeFunction,
      subsection: activeSubsection,
    });
  }, [activeCenterTab, activeDomain, activeFunction, activeSubsection]);

  useEffect(() => {
    applyThemeClass(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    localStorage.removeItem("rightRailWidth");
    localStorage.removeItem("leftRailWidth");
    document.documentElement.style.removeProperty("--right-rail-width");
    document.documentElement.style.removeProperty("--left-rail-width");
  }, []);

  useEffect(() => {
    const role = currentUser?.role;
    const title = role
      ? `Elly - ${role.replaceAll("_", " ")} Console`
      : "Elly - Console";
    document.title = title;
  }, [currentUser?.role]);

  const applyNavigation = useCallback((navigation) => {
    setActiveDomain(navigation.domain);
    setActiveSubsection(navigation.subsection || null);
    setActiveFunction(navigation.functionId);
    setActiveCenterTab(navigation.centerTab || "dashboard");
    writeStoredNavigation(navigation);
  }, []);

  const isExactNavigationMatch = useCallback((requested, resolved) => {
    if (!requested?.functionId || requested.functionId !== resolved.functionId) {
      return false;
    }

    if (requested.domain && requested.domain !== resolved.domain) {
      return false;
    }

    if (
      requested.subsection !== undefined &&
      (requested.subsection || null) !== resolved.subsection
    ) {
      return false;
    }

    if (
      requested.centerTab &&
      requested.centerTab !== (resolved.centerTab || "dashboard")
    ) {
      return false;
    }

    return true;
  }, []);

  const updateDashboardHistory = useCallback((navigation, mode = "push") => {
    const historyState = {
      ...(window.history.state || {}),
      dashboardNavigation: navigation,
    };

    if (mode === "replace") {
      window.history.replaceState(historyState, "", window.location.pathname || DASHBOARD_ROUTE);
      return;
    }

    window.history.pushState(historyState, "", window.location.pathname || DASHBOARD_ROUTE);
  }, []);

  const commitNavigation = useCallback(
    (target, options = {}) => {
      const resolved = resolveSafeNavigationState({
        ...target,
        permissions,
        role,
      });

      if (!options.allowFallback && !isExactNavigationMatch(target, resolved)) {
        if (import.meta.env.DEV) {
          console.warn("[Prototype] Ignored invalid dashboard navigation", {
            requested: target,
            resolved,
          });
        }
        return false;
      }

      dismissTransientUi();
      applyNavigation(resolved);
      setEmergencyNavigation(null);

      if (options.clearReturnNavigation !== false) {
        setReturnNavigation(null);
      }

      if (options.clearPatient !== false) {
        clearActiveEllyId();
      }

      if (options.history !== false) {
        updateDashboardHistory(resolved, options.history);
      }

      return true;
    },
    [
      applyNavigation,
      clearActiveEllyId,
      dismissTransientUi,
      isExactNavigationMatch,
      permissions,
      role,
      updateDashboardHistory,
    ],
  );

  const getSafeLandingNavigation = useCallback(
    () =>
      resolveRoleLandingNavigation({
        permissions,
        role,
      }),
    [permissions, role],
  );

  const handlePrototypePageError = useCallback(() => {
    writeStoredNavigation(getSafeLandingNavigation());
  }, [getSafeLandingNavigation]);

  const handlePrototypeErrorReset = useCallback(() => {
    setActiveModule("clinical-operations");
    setSelectedRoomId(null);
    commitNavigation(getSafeLandingNavigation(), {
      allowFallback: true,
      history: "replace",
    });
  }, [commitNavigation, getSafeLandingNavigation]);

  const handleWelcomeOpen = useCallback(() => {
    commitNavigation(
      {
        centerTab: "dashboard",
        domain: "overview",
        functionId: "welcome",
        subsection: null,
      },
      { clearPatient: false },
    );
  }, [commitNavigation]);

  useEffect(() => {
    if (showWelcome) {
      const timer = window.setTimeout(() => {
        setShowWelcome(false);
        handleWelcomeOpen();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [handleWelcomeOpen, showWelcome, setShowWelcome]);

  const handleDomainChange = (domainId) => {
    if (consoleType === "RESTRICTED") return;

    commitNavigation(resolveDomainNavigation(domainId, permissions, role), {
      allowFallback: true,
    });
  };

  const handleSubsectionSelect = (domainId, subsectionId) => {
    commitNavigation(
      resolveSubsectionNavigation(domainId, subsectionId, permissions, role),
      { allowFallback: true },
    );
  };

  const handleCenterTabChange = (tabId) => {
    commitNavigation(
      resolveCenterTabNavigation({
        activeDomain,
        activeSubsection,
        centerTab: tabId,
        permissions,
        role,
      }),
      { allowFallback: true },
    );
  };

  const handleNotificationsOpen = () => {
    setReturnNavigation({
      domain: activeDomain,
      subsection: activeSubsection,
      functionId: activeFunction,
      centerTab: activeCenterTab,
    });
    commitNavigation(
      {
        centerTab: "dashboard",
        domain: "overview",
        functionId: "notifications",
        subsection: null,
      },
      {
        clearPatient: false,
        clearReturnNavigation: false,
      },
    );
  };

  const handleNotificationsBack = () => {
    if (returnNavigation) {
      commitNavigation(returnNavigation);
      return;
    }

    commitNavigation(getSafeLandingNavigation(), { allowFallback: true });
  };

  const handlePatientSearch = (ellyId) => {
    const trimmed = (ellyId || "").trim();
    if (!trimmed || !canReadPatients) return;

    if (
      commitNavigation({
        centerTab: "dashboard",
        domain: "management",
        functionId: "patient-dashboard",
        subsection: "patient",
      })
    ) {
      setActiveEllyId(trimmed);
    }
  };

  useEffect(() => {
    if (!pendingOpenRecord || !canReadPatients) return;
    const timer = window.setTimeout(() => {
      commitNavigation({
        centerTab: "dashboard",
        domain: "management",
        functionId: "patient-dashboard",
        subsection: "patient",
      });
      consumePendingOpenRecord();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingOpenRecord, canReadPatients, consumePendingOpenRecord, commitNavigation]);

  const handleModuleChange = (moduleValue) => {
    dismissTransientUi();
    setActiveModule(moduleValue);

    if (moduleValue === "radiology") {
      setDiagnosticsDepartments(["RADIOLOGY"]);
      return;
    }
    if (moduleValue === "laboratory") {
      setDiagnosticsDepartments(["LABORATORY"]);
      return;
    }

    setDiagnosticsDepartments([]);
  };

  const handleDiagnosticsClose = () => {
    setDiagnosticsDepartments([]);
    setActiveModule("clinical-operations");
  };

  const handleRoomSelect = (roomId) => {
    if (!roomId) return;
    setSelectedRoomId(roomId);
    commitNavigation({
      centerTab: "resources",
      domain: "management",
      functionId: "room-management",
      subsection: "room",
    });
  };

  const handleNavigateToFunction = (target) => {
    if (consoleType === "RESTRICTED") return;
    if (!target?.functionId) return;

    commitNavigation({
      centerTab: target.centerTab || "dashboard",
      domain: target.domain || activeDomain,
      functionId: target.functionId,
      subsection: target.subsection ?? activeSubsection,
    });
  };

  const handleEmergencyRequestOpen = (alertId) => {
    if (!alertId) return;

    if (
      commitNavigation({
        centerTab: "dashboard",
        domain: "operations",
        functionId: "emergency",
        subsection: "emergency-workflow",
      })
    ) {
      setEmergencyNavigation({
        alertId,
        navigationId: Date.now(),
      });
    }
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

  useEffect(() => {
    const navigation = {
      centerTab: activeCenterTab,
      domain: activeDomain,
      functionId: activeFunction,
      subsection: activeSubsection,
    };

    updateDashboardHistory(navigation, "replace");
  }, [
    activeCenterTab,
    activeDomain,
    activeFunction,
    activeSubsection,
    updateDashboardHistory,
  ]);

  useEffect(() => {
    const handlePopState = (event) => {
      dismissTransientUi();
      const restoredNavigation = event.state?.dashboardNavigation;
      if (!restoredNavigation) return;

      const resolved = resolveSafeNavigationState({
        ...restoredNavigation,
        permissions,
        role,
      });

      applyNavigation(resolved);
      setEmergencyNavigation(null);
      setReturnNavigation(null);
      clearActiveEllyId();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyNavigation, clearActiveEllyId, dismissTransientUi, permissions, role]);

  return (
    <div className="dashboard-shell">
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
        onProfileClick={handleWelcomeOpen}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onSubsectionSelect={handleSubsectionSelect}
        onPatientSearch={handlePatientSearch}
        isOpen={isNavigationOpen}
        onOpenChange={setIsNavigationOpen}
      />

      <main className="dashboard-main" id="main-content">
        <PrototypeErrorBoundary
          pageId={activeFunction}
          resetKey={navigationKey}
          onError={handlePrototypePageError}
          onReset={handlePrototypeErrorReset}
        >
          <DocumentModeOverlay>
            <DashboardContent
              activeModule={activeModule}
              activeDomain={activeDomain}
              activeFunction={activeFunction}
              activeCenterTab={activeCenterTab}
              activeSubsection={activeSubsection}
              onDomainChange={handleDomainChange}
              onModuleChange={handleModuleChange}
              onCenterTabChange={handleCenterTabChange}
              onSubsectionSelect={handleSubsectionSelect}
              onPatientSearch={canReadPatients ? handlePatientSearch : undefined}
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
              onNavigateToFunction={handleNavigateToFunction}
            />
          </DocumentModeOverlay>
        </PrototypeErrorBoundary>
      </main>

      <RightRail
        emergencyRealtime={emergencyRealtime}
        onEmergencyRequestOpen={handleEmergencyRequestOpen}
        transientResetKey={transientResetKey}
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
          patientEllyId={diagnosticsPatientEllyId}
          offsetIndex={i}
          onClose={handleDiagnosticsClose}
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
  const role = useSessionStore((state) => state.role);
  const clearSession = useSessionStore((state) => state.clearSession);
  const hasUsableSession = Boolean(accessToken && workspace && currentUser && role);

  useEffect(() => {
    const syncPath = () => setRoutePath(getCurrentPath());

    window.addEventListener("popstate", syncPath);

    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (hasUsableSession || routePath === HOSPITAL_ACCESS_ROUTE) return;

    window.history.replaceState({}, "", HOSPITAL_ACCESS_ROUTE);
    const timer = window.setTimeout(() => {
      setRoutePath(HOSPITAL_ACCESS_ROUTE);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasUsableSession, routePath]);

  useEffect(() => {
    if (!accessToken && !workspace && !currentUser) return;
    if (hasUsableSession) return;

    clearSession();
  }, [accessToken, clearSession, currentUser, hasUsableSession, workspace]);

  useEffect(() => {
    if (!accessToken || workspace) return;

    loadMe().catch(() => {
      useSessionStore.getState().clearSession();
    });
  }, [accessToken, loadMe, workspace]);

  const handleAccessGranted = (hospitalWorkspace) => {
    setWorkspace(hospitalWorkspace);
    applyRoleLanding(useSessionStore.getState().role);
    useSessionStore.getState().setShowWelcome(true);

    window.history.pushState({}, "", DASHBOARD_ROUTE);
    setRoutePath(DASHBOARD_ROUTE);
  };

  if (!hasUsableSession || routePath === HOSPITAL_ACCESS_ROUTE) {
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

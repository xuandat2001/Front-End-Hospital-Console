import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ellyLogo from "../../assets/elly-logo.png";
import { getVisibleNavEntries, getVisibleSubsections } from "../../tab-data";
import Icon from "./Icon";
import { workspaceModules } from "./workspaceModules";
import useSessionStore from "../../store/useSessionStore";
import { PERMISSIONS, ROLES } from "../../constant/rbac";

function PatientSearchBox({ onPatientSearch, onClose }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onPatientSearch?.(trimmed);
    onClose?.();
  };

  return (
    <div className="dashboard-patient-search" role="search">
      <Icon name="search" size={15} className="dashboard-patient-search__icon" />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Find patient by EllyID"
        aria-label="Find patient by EllyID"
      />
      <button
        type="button"
        onClick={submit}
        aria-label="Search patient"
        className="dashboard-patient-search__go"
      >
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}

function RailContent({
  activeDomain,
  activeModule,
  activeSubsection,
  onClose,
  onDomainChange,
  onModuleChange,
  onSettingsOpen,
  onSubsectionSelect,
  onPatientSearch,
  onWelcomeOpen,
  showClose = false,
}) {
  const workspace = useSessionStore((state) => state.workspace);
  const currentUser = useSessionStore((state) => state.currentUser);
  const permissions = useSessionStore((state) => state.permissions);
  const can = useSessionStore((state) => state.can);
  const canSearchPatients = can(PERMISSIONS.PATIENT_READ);
  const navEntries = getVisibleNavEntries(permissions);
  const isClinicDoctor =
    currentUser?.role === ROLES.DOCTOR || currentUser?.role === ROLES.CLINIC_DOCTOR;
  const workspaceTitle = isClinicDoctor
    ? currentUser?.clinicName || workspace?.workspaceName || "Clinic Workspace"
    : workspace?.hospitalName || workspace?.workspaceName || "Hospital Workspace";
  const workspaceSubtitle = isClinicDoctor
    ? workspace?.workspaceEllyId || "No Clinic ELLY ID"
    : workspace?.ellyHospitalId || workspace?.workspaceEllyId || "No Hospital ELLY ID";
  const [expandedSections, setExpandedSections] = useState({});
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);
  const closeTimerRef = useRef(null);
  const activeWorkspace =
    workspaceModules.find((module) => module.value === activeModule)?.label ||
    workspaceModules[0].label;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openWorkspaceFlyout = () => {
    clearCloseTimer();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setFlyoutPosition({
        top: Math.max(12, rect.top),
        left: rect.right + 8,
      });
    }
    setFlyoutOpen(true);
  };

  const scheduleWorkspaceFlyoutClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setFlyoutOpen(false);
    }, 140);
  };

  const toggleSection = (domainId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  const handleItemClick = (domainId, section) => {
    const subs = section.subsections ? Object.keys(section.subsections) : [];
    if (subs.length > 0) {
      toggleSection(domainId);
    } else {
      onDomainChange(domainId);
    }
  };

  const handleSubClick = (domainId, subsectionId) => {
    onSubsectionSelect(domainId, subsectionId);
  };

  return (
    <>
      <div
        className="dashboard-logo-card"
        onBlur={scheduleWorkspaceFlyoutClose}
        onFocus={openWorkspaceFlyout}
        onMouseEnter={openWorkspaceFlyout}
        onMouseLeave={scheduleWorkspaceFlyoutClose}
        ref={cardRef}
        tabIndex={0}
      >
        <img alt="Elly" src={ellyLogo} />
        <div
          className="dashboard-logo-card__identity"
          onClick={onWelcomeOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onWelcomeOpen?.(); }}
        >
          <strong>{workspaceTitle}</strong>
          <span title={workspaceSubtitle}>{workspaceSubtitle}</span>
          <small>
            {currentUser?.role
              ? currentUser.role.replaceAll("_", " ")
              : "Authorized Staff"}
          </small>
        </div>
        {showClose && (
          <button
            aria-label="Close navigation"
            className="icon-button dashboard-nav-close"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {flyoutOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="identity-workspace-flyout is-open"
            onFocus={openWorkspaceFlyout}
            onMouseEnter={openWorkspaceFlyout}
            onMouseLeave={scheduleWorkspaceFlyoutClose}
            style={{
              top: `${flyoutPosition.top}px`,
              left: `${flyoutPosition.left}px`,
            }}
          >
            <div
              aria-label="Hospital workspace"
              className="identity-workspace-options"
              role="listbox"
            >
              <div className="identity-workspace-heading">
                <Icon name="operations" size={15} />
                <span>
                  <small>Workspace</small>
                  {activeWorkspace}
                </span>
              </div>
              {workspaceModules.map((module) => (
                <button
                  aria-selected={module.value === activeModule}
                  className={module.value === activeModule ? "is-selected" : ""}
                  key={module.value}
                  onClick={() => {
                    onModuleChange(module.value);
                    setFlyoutOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{module.label}</span>
                  {module.value === activeModule && <i>Active</i>}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      <nav className="dashboard-domain-nav" aria-label="Dashboard sections">
        {navEntries.map(([id, section]) => {
          const subs = getVisibleSubsections(id, permissions);
          const hasSubsections = subs.length > 0;
          const isExpanded = expandedSections[id];
          const isSubActive =
            hasSubsections &&
            activeSubsection &&
            subs.some((sub) => sub.id === activeSubsection);
          const isActive =
            activeDomain === id && (!hasSubsections || isSubActive);

          return (
            <div key={id} className="dashboard-nav-item-group">
              <button
                aria-current={isActive ? "page" : undefined}
                className={
                  (isActive ? "is-active" : "") +
                  (hasSubsections ? " has-subsections" : "")
                }
                onClick={() => handleItemClick(id, section)}
                type="button"
              >
                <Icon name={section.icon} size={19} />
                <span>{section.label}</span>
                {hasSubsections && (
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={`nav-chevron ${isExpanded ? "is-open" : ""}`}
                  />
                )}
              </button>
              {id === "overview" && canSearchPatients && (
                <PatientSearchBox
                  onPatientSearch={onPatientSearch}
                  onClose={onClose}
                />
              )}
              {hasSubsections && isExpanded && (
                <div className="dashboard-nav-subsections">
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      aria-current={
                        activeDomain === id && activeSubsection === sub.id
                          ? "page"
                          : undefined
                      }
                      className={
                        activeDomain === id && activeSubsection === sub.id
                          ? "is-active"
                          : ""
                      }
                      onClick={() => handleSubClick(id, sub.id)}
                      type="button"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="dashboard-rail-actions">
        <button className="dashboard-settings-button" onClick={onSettingsOpen} type="button">
          <Icon name="settings" size={20} />
          <span>Settings</span>
        </button>
      </div>
    </>
  );
}

function LeftRail({
  activeDomain,
  activeModule,
  activeSubsection,
  onDomainChange,
  onModuleChange,
  onSettingsOpen,
  onSubsectionSelect,
  onPatientSearch,
  onWelcomeOpen,
  isOpen,
  onOpenChange,
}) {
  return (
    <>
      <aside className="dashboard-left-rail">
        <RailContent
          activeDomain={activeDomain}
          activeModule={activeModule}
          activeSubsection={activeSubsection}
          onDomainChange={onDomainChange}
          onModuleChange={onModuleChange}
          onSettingsOpen={onSettingsOpen}
          onSubsectionSelect={onSubsectionSelect}
          onPatientSearch={onPatientSearch}
          onWelcomeOpen={onWelcomeOpen}
        />
      </aside>

      {isOpen && (
        <>
          <button
            aria-label="Close navigation"
            className="dashboard-nav-backdrop"
            onClick={() => onOpenChange(false)}
            type="button"
          />
          <aside className="dashboard-mobile-panel">
            <RailContent
              activeDomain={activeDomain}
              activeModule={activeModule}
              activeSubsection={activeSubsection}
              onClose={() => onOpenChange(false)}
              onDomainChange={onDomainChange}
              onModuleChange={onModuleChange}
              onSettingsOpen={() => {
                onSettingsOpen();
                onOpenChange(false);
              }}
              onSubsectionSelect={onSubsectionSelect}
              onPatientSearch={(query) => {
                onPatientSearch?.(query);
                onOpenChange(false);
              }}
              onWelcomeOpen={onWelcomeOpen}
              showClose
            />
          </aside>
        </>
      )}
    </>
  );
}

export default LeftRail;

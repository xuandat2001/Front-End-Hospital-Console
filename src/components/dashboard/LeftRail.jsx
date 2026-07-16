import { useEffect, useRef, useState } from "react";
import ellyLogo from "../../assets/elly-logo.png";
import navData from "../../tab-data";
import Icon from "./Icon";
import useSessionStore from "../../store/useSessionStore";
import { PERMISSIONS } from "../../constant/rbac";
const navEntries = Object.entries(navData);
const overviewEntry = navEntries.find(([id]) => id === "overview");
const sectionEntries = navEntries.filter(([id]) => id !== "overview");

function formatRole(role = "") {
  return role
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUserName(user) {
  return (
    user?.fullName ||
    user?.displayName ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

function HospitalIdentity({ isCollapsed = false, onLogoClick }) {
  const workspace = useSessionStore((state) => state.workspace);
  const currentUser = useSessionStore((state) => state.currentUser);
  const ellyId =
    workspace?.ellyHospitalId || currentUser?.ellyId || "No ELLY ID available";
  const userName = getUserName(currentUser);
  const roleLabel = formatRole(currentUser?.role) || "Authorized Staff";
  const userSummary = [roleLabel, userName].filter(Boolean).join(" · ");

  return (
    <div className="dashboard-identity-row">
      <div
        aria-label={`Account identity: ${ellyId}`}
        className="dashboard-logo-card"
      >
        <button
          aria-label="Open hospital profile (coming soon)"
          className="dashboard-logo-mark"
          onClick={onLogoClick}
          title="Hospital profile (coming soon)"
          type="button"
        >
          <img alt="" aria-hidden="true" src={ellyLogo} />
        </button>
        <div className="dashboard-logo-card__identity" aria-hidden={isCollapsed}>
          <span className="dashboard-identity-elly-id" title={ellyId}>
            {ellyId}
          </span>
          <small className="dashboard-user-summary" title={userSummary}>
            {userSummary}
          </small>
        </div>
      </div>
    </div>
  );
}

function PatientSearchBox({ inputRef, onPatientSearch, onClose }) {
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
        ref={inputRef}
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
  activeSubsection,
  onClose,
  onDomainChange,
  onSettingsOpen,
  onSubsectionSelect,
  onPatientSearch,
  isCollapsed = false,
  onExpand,
  onPatientSearchExpand,
  patientSearchInputRef,
  onCollapse,
  onIdentityLogoClick,
  showIdentity = false,
  subsectionIdPrefix = "dashboard-nav",
  showClose = false,
}) {
  const can = useSessionStore((state) => state.can);
  const canSearchPatients = can(PERMISSIONS.PATIENT_READ);
  const [expandedSections, setExpandedSections] = useState(() =>
    activeDomain ? { [activeDomain]: true } : {},
  );

  const toggleSection = (domainId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  const handleItemClick = (domainId, section) => {
    const subs = section.subsections ? Object.keys(section.subsections) : [];
    if (subs.length > 0) {
      if (isCollapsed) {
        setExpandedSections((prev) => ({ ...prev, [domainId]: true }));
        onExpand?.();
        return;
      }
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
      {showClose && (
        <div className="dashboard-mobile-nav-header">
          <strong>Navigation</strong>
          <button
            aria-label="Close navigation"
            className="icon-button dashboard-nav-close"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {showIdentity && (
        <HospitalIdentity onLogoClick={onIdentityLogoClick} />
      )}

      {isCollapsed && onExpand && (
        <button
          aria-controls="dashboard-primary-navigation"
          aria-expanded="false"
          aria-label="Expand navigation"
          className="dashboard-rail-toggle dashboard-rail-toggle--standalone"
          data-rail-tooltip="Expand navigation"
          onClick={onExpand}
          type="button"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      )}

      <div
        className={`dashboard-nav-overview-row${
          activeDomain === "overview" ? " is-active" : ""
        }`}
      >
        <button
          aria-current={activeDomain === "overview" ? "page" : undefined}
          aria-label={isCollapsed ? "Overview" : undefined}
          className={`dashboard-nav-overview-button${
            activeDomain === "overview" ? " is-active" : ""
          }`}
          data-no-ripple="true"
          data-rail-tooltip={isCollapsed ? "Overview" : undefined}
          onClick={() => {
            onDomainChange("overview");
          }}
          title={isCollapsed ? "Overview" : undefined}
          type="button"
        >
          <Icon name={overviewEntry?.[1]?.icon || "overview"} size={19} />
          <span className="dashboard-nav-label">
            {overviewEntry?.[1]?.label || "Overview"}
          </span>
        </button>
        {!isCollapsed && onCollapse && (
          <button
            aria-controls="dashboard-primary-navigation"
            aria-expanded="true"
            aria-label="Collapse navigation"
            className="dashboard-rail-toggle"
            onClick={onCollapse}
            type="button"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
        )}
      </div>

      {canSearchPatients && (
        isCollapsed ? (
          <button
            aria-label="Find patient by EllyID"
            className="dashboard-patient-search-trigger"
            data-rail-tooltip="Find patient by EllyID"
            onClick={onPatientSearchExpand}
            title="Find patient by EllyID"
            type="button"
          >
            <Icon name="search" size={15} />
          </button>
        ) : (
          <PatientSearchBox
            inputRef={patientSearchInputRef}
            onPatientSearch={onPatientSearch}
            onClose={onClose}
          />
        )
      )}

      <nav className="dashboard-domain-nav" aria-label="Dashboard sections">
        {sectionEntries.map(([id, section]) => {
          const subs = section.subsections
            ? Object.entries(section.subsections)
            : [];
          const hasSubsections = subs.length > 0;
          const isExpanded = expandedSections[id];
          const isSubActive =
            hasSubsections &&
            activeSubsection &&
            subs.some(([sid]) => sid === activeSubsection);
          const subsectionListId = `${subsectionIdPrefix}-subsections-${id}`;
          const isActive =
            activeDomain === id && (!hasSubsections || isSubActive);

          return (
            <div key={id} className="dashboard-nav-item-group">
              <button
                aria-controls={
                  hasSubsections ? subsectionListId : undefined
                }
                aria-current={isActive ? "page" : undefined}
                aria-expanded={
                  hasSubsections ? Boolean(isExpanded && !isCollapsed) : undefined
                }
                aria-label={isCollapsed ? section.label : undefined}
                className={
                  (isActive ? "is-active" : "") +
                  (hasSubsections ? " has-subsections" : "")
                }
                data-rail-tooltip={isCollapsed ? section.label : undefined}
                onClick={() => handleItemClick(id, section)}
                title={isCollapsed ? section.label : undefined}
                type="button"
              >
                <Icon name={section.icon} size={19} />
                <span className="dashboard-nav-label">{section.label}</span>
                {hasSubsections && (
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={`nav-chevron ${isExpanded ? "is-open" : ""}`}
                  />
                )}
              </button>
              {hasSubsections && (
                <div
                  className="dashboard-nav-subsections"
                  hidden={!isExpanded || isCollapsed}
                  id={subsectionListId}
                >
                  {subs.map(([sid, sub]) => (
                    <button
                      key={sid}
                      aria-current={
                        activeDomain === id && activeSubsection === sid
                          ? "page"
                          : undefined
                      }
                      className={
                        activeDomain === id && activeSubsection === sid
                          ? "is-active"
                          : ""
                      }
                      onClick={() => handleSubClick(id, sid)}
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
        <button
          aria-label={isCollapsed ? "Settings" : undefined}
          className="dashboard-settings-button"
          data-rail-tooltip={isCollapsed ? "Settings" : undefined}
          onClick={onSettingsOpen}
          title={isCollapsed ? "Settings" : undefined}
          type="button"
        >
          <Icon name="settings" size={20} />
          <span className="dashboard-nav-label">Settings</span>
        </button>
      </div>
    </>
  );
}

function LeftRail({
  activeDomain,
  activeSubsection,
  onDomainChange,
  onSettingsOpen,
  onSubsectionSelect,
  onPatientSearch,
  onIdentityLogoClick,
  isOpen,
  onOpenChange,
  isCollapsed = false,
  onCollapsedChange,
}) {
  const patientSearchInputRef = useRef(null);
  const shouldFocusPatientSearchRef = useRef(false);

  useEffect(() => {
    if (!isCollapsed && shouldFocusPatientSearchRef.current) {
      shouldFocusPatientSearchRef.current = false;
      patientSearchInputRef.current?.focus();
    }
  }, [isCollapsed]);

  const expandRail = () => {
    if (!isCollapsed) return;
    onCollapsedChange?.(false);
  };

  const collapseRail = () => {
    onCollapsedChange?.(true);
  };

  const expandForPatientSearch = () => {
    shouldFocusPatientSearchRef.current = true;
    expandRail();
  };

  return (
    <>
      <div
        className={`dashboard-left-column${isCollapsed ? " is-collapsed" : ""}`}
      >
        <div className="dashboard-identity-holder">
          <HospitalIdentity
            isCollapsed={isCollapsed}
            onLogoClick={onIdentityLogoClick}
          />
        </div>

        <aside
          aria-label="Primary navigation"
          className={`dashboard-left-rail${isCollapsed ? " is-collapsed is-content-collapsed" : ""}`}
          id="dashboard-primary-navigation"
        >
          <RailContent
            activeDomain={activeDomain}
            activeSubsection={activeSubsection}
            isCollapsed={isCollapsed}
            onCollapse={collapseRail}
            onExpand={expandRail}
            onDomainChange={onDomainChange}
            onPatientSearchExpand={expandForPatientSearch}
            onSettingsOpen={onSettingsOpen}
            onSubsectionSelect={onSubsectionSelect}
            onPatientSearch={onPatientSearch}
            patientSearchInputRef={patientSearchInputRef}
            subsectionIdPrefix="dashboard-primary-nav"
          />
        </aside>
      </div>

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
              activeSubsection={activeSubsection}
              onClose={() => onOpenChange(false)}
              onDomainChange={onDomainChange}
              onSettingsOpen={() => {
                onSettingsOpen();
                onOpenChange(false);
              }}
              onSubsectionSelect={onSubsectionSelect}
              onPatientSearch={(query) => {
                onPatientSearch?.(query);
                onOpenChange(false);
              }}
              onIdentityLogoClick={onIdentityLogoClick}
              showIdentity
              subsectionIdPrefix="dashboard-mobile-nav"
              showClose
            />
          </aside>
        </>
      )}
    </>
  );
}

export default LeftRail;

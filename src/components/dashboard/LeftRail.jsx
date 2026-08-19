import { useState } from "react";
import adminAvatar from "../../assets/admin_AI_image.jpg";
import doctorAvatar from "../../assets/doctor_AI_image.webp";
import { getVisibleNavEntries, getVisibleSubsections } from "../../tab-data";
import Icon from "./Icon";
import PatientSearchBox from "./PatientSearchBox";
import ProfileDropdown from "./ProfileDropdown";
import useSessionStore from "../../store/useSessionStore";
import { PERMISSIONS, ROLES } from "../../constant/rbac";

function AccessControls({
  onClose,
  onPatientSearch,
  onProfileClick,
  showClose = false,
  showPatientSearch = false,
}) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const can = useSessionStore((state) => state.can);
  const logout = useSessionStore((state) => state.logout);
  const canSearchPatients = can(PERMISSIONS.PATIENT_READ);
  const profileName = currentUser?.fullName || "Hospital user";
  const profileEllyId = currentUser?.ellyId || "No ELLY ID";
  const isDoctor =
    currentUser?.role === ROLES.DOCTOR ||
    currentUser?.role === ROLES.CLINIC_DOCTOR;
  const profileAvatar = isDoctor ? doctorAvatar : adminAvatar;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCopyEllyId = async () => {
    await navigator.clipboard.writeText(profileEllyId);
  };

  const profileMenuItems = [
    {
      icon: "copy",
      id: "copy-id",
      label: "Copy ID",
      onSelect: handleCopyEllyId,
    },
    {
      disabled: isLoggingOut,
      icon: "logout",
      id: "sign-out",
      label: "Sign out",
      onSelect: handleLogout,
      pendingLabel: "Signing out…",
      tone: "danger",
    },
  ];

  return (
    <div className="dashboard-access-stack">
      <div className="dashboard-profile-card">
        <ProfileDropdown
          className="dashboard-profile-dropdown"
          data={{
            avatar: profileAvatar,
            name: profileName,
            secondary: profileEllyId,
          }}
          items={profileMenuItems}
          menuOffsetTop={6}
          onOpen={onProfileClick}
        />
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

      {showPatientSearch && canSearchPatients && (
        <PatientSearchBox
          onClose={onClose}
          onPatientSearch={onPatientSearch}
        />
      )}
    </div>
  );
}

function RailContent({
  activeDomain,
  activeSubsection,
  onDomainChange,
  onSettingsOpen,
  onSubsectionSelect,
  isCollapsed = false,
  onCollapseChange,
  allowCollapse = true,
}) {
  const permissions = useSessionStore((state) => state.permissions);
  const navEntries = getVisibleNavEntries(permissions);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (domainId) => {
    setExpandedSections((prev) =>
      isCollapsed
        ? { [domainId]: !prev[domainId] }
        : { ...prev, [domainId]: !prev[domainId] },
    );
  };

  const toggleRail = () => {
    if (!isCollapsed) {
      setExpandedSections({});
    }
    onCollapseChange?.(!isCollapsed);
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
    if (isCollapsed) {
      setExpandedSections({});
    }
  };

  return (
    <>
      {allowCollapse && (
        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          className="dashboard-rail-toggle reference-sidebar__toggle"
          onClick={toggleRail}
          type="button"
        >
          <Icon
            className="reference-sidebar__toggle-icon"
            name={isCollapsed ? "chevronRight" : "chevronLeft"}
            size={15}
          />
        </button>
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
            <div
              className={`dashboard-nav-item-group${
                isExpanded ? " is-expanded" : ""
              }`}
              key={id}
            >
              <button
                aria-current={isActive ? "page" : undefined}
                aria-expanded={
                  hasSubsections ? Boolean(isExpanded) : undefined
                }
                className={
                  (isActive ? "is-active" : "") +
                  (hasSubsections ? " has-subsections" : "")
                }
                data-rail-tooltip={isCollapsed ? section.label : undefined}
                onClick={() => handleItemClick(id, section)}
                type="button"
              >
                <Icon name={section.icon} size={19} />
                <span className="dashboard-nav-label">{section.label}</span>
                {hasSubsections && (
                  <Icon
                    className={`nav-chevron ${
                      isExpanded ? "is-open" : ""
                    }`}
                    name="chevronDown"
                    size={16}
                  />
                )}
              </button>
              {hasSubsections && isExpanded && (
                <div
                  aria-label={`${section.label} sections`}
                  className={`dashboard-nav-subsections${
                    isCollapsed ? " is-floating global-content-dropdown" : ""
                  }`}
                  role="group"
                >
                  {subs.map((sub) => (
                    <button
                      aria-current={
                        activeDomain === id && activeSubsection === sub.id
                          ? "page"
                          : undefined
                      }
                      className={`${
                        activeDomain === id && activeSubsection === sub.id
                          ? "is-active"
                          : ""
                      }${isCollapsed ? " global-content-dropdown__item" : ""}`.trim()}
                      key={sub.id}
                      onClick={() => handleSubClick(id, sub.id)}
                      type="button"
                    >
                      {sub.icon && (
                        <Icon
                          className="dashboard-nav-subsection-icon"
                          name={sub.icon}
                          size={16}
                        />
                      )}
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
          className="dashboard-settings-button"
          data-rail-tooltip={isCollapsed ? "Settings" : undefined}
          onClick={onSettingsOpen}
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
  onProfileClick,
  onSettingsOpen,
  onSubsectionSelect,
  onPatientSearch,
  isOpen,
  onOpenChange,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <div
        className={`dashboard-left-column${
          isCollapsed ? " is-collapsed" : ""
        }`}
      >
        <AccessControls onPatientSearch={onPatientSearch} onProfileClick={onProfileClick} />

        <aside
          aria-label="Primary navigation"
          className={`dashboard-left-rail reference-sidebar${
            isCollapsed ? " is-collapsed is-content-collapsed" : ""
          }`}
        >
          <RailContent
            activeDomain={activeDomain}
            activeSubsection={activeSubsection}
            isCollapsed={isCollapsed}
            onCollapseChange={setIsCollapsed}
            onDomainChange={onDomainChange}
            onSettingsOpen={onSettingsOpen}
            onSubsectionSelect={onSubsectionSelect}
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
          <aside aria-label="Mobile navigation" className="dashboard-mobile-panel">
            <AccessControls
              onClose={() => onOpenChange(false)}
              onPatientSearch={(query) => {
                onPatientSearch?.(query);
                onOpenChange(false);
              }}
              onProfileClick={() => {
                onProfileClick?.();
                onOpenChange(false);
              }}
              showClose
              showPatientSearch
            />
            <RailContent
              activeDomain={activeDomain}
              activeSubsection={activeSubsection}
              allowCollapse={false}
              isCollapsed={false}
              onDomainChange={onDomainChange}
              onSettingsOpen={() => {
                onSettingsOpen();
                onOpenChange(false);
              }}
              onSubsectionSelect={onSubsectionSelect}
            />
          </aside>
        </>
      )}
    </>
  );
}

export default LeftRail;

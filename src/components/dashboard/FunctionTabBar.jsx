import { useMemo } from "react";
import { centerTabs } from "../../data";
import navData from "../../tab-data";
import PillNav from "../ui/PillNav";
import Icon from "./Icon";

function getAvailableTabIds(activeDomain, activeSubsection) {
  const section = navData[activeDomain];
  if (!section) return null;

  const tabs = activeSubsection
    ? section.subsections?.[activeSubsection]?.tabs
    : section.tabs;

  return tabs ? Object.keys(tabs) : null;
}

function FunctionTabBar({
  activeCenterTab,
  activeDomain,
  activeFunction,
  activeSubsection,
  onCenterTabChange,
}) {
  const emergencyContext = activeFunction === "emergency";
  const availableTabIds = getAvailableTabIds(activeDomain, activeSubsection);
  const items = useMemo(
    () =>
      centerTabs
        .filter((tab) => !availableTabIds || availableTabIds.includes(tab.id))
        .map((tab) => ({
          ...tab,
          icon: <Icon name="sparkle" size={14} />,
          label:
            emergencyContext && tab.id === "resources" ? "Resource" : tab.label,
        })),
    [availableTabIds, emergencyContext],
  );

  return (
    <PillNav
      activeId={activeCenterTab}
      ariaLabel="Workspace views"
      className="dashboard-center-nav"
      items={items}
      onChange={onCenterTabChange}
    />
  );
}

export default FunctionTabBar;

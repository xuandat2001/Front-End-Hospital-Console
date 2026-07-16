import { centerTabs } from "../../data";
import Icon from "./Icon";


function FunctionTabBar({
  activeCenterTab,
  activeFunction,
  onCenterTabChange,
}) {
  const emergencyContext = activeFunction === "emergency";
  const activeIndex = Math.max(
    0,
    centerTabs.findIndex((tab) => tab.id === activeCenterTab),
  );

  return (
    <nav className="dashboard-function-bar" aria-label="Workspace views">
      <div
        style={{
          "--active-tab-index": activeIndex,
          "--tab-count": centerTabs.length,
        }}
      >
        <span className="dashboard-function-bubble" aria-hidden="true" />
        {centerTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onCenterTabChange(tab.id)}
            aria-current={activeCenterTab === tab.id ? "page" : undefined}
            className={activeCenterTab === tab.id ? "is-active" : ""}
          >
            <Icon name="sparkle" size={14} />
            {emergencyContext && tab.id === "resources" ? "Resource" : tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default FunctionTabBar;

import { centerTabs, workspacePages } from "../../data";
import navData from "../../tab-data";

const SPECIAL_PAGE_LABELS = {
  command: "Command Overview",
  "icu-monitoring": "ICU Monitoring",
  notifications: "Notifications",
  welcome: "Welcome",
};

function humanize(value = "") {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      if (normalized === "icu") return "ICU";
      if (normalized === "ai") return "AI";
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

function breadcrumbHref(...parts) {
  return `#/dashboard/${parts.filter(Boolean).join("/")}`;
}

function asCurrent(items) {
  const lastItem = items.at(-1);
  return [
    ...items.slice(0, -1),
    {
      label: lastItem.label,
    },
  ];
}

export function buildDashboardBreadcrumbs({
  activeCenterTab,
  activeDomain,
  activeFunction,
  activeSubsection,
}) {
  const rootItem = {
    href: breadcrumbHref(),
    label: "Console",
    target: { domainId: "overview", type: "domain" },
  };

  if (activeFunction === "notifications" || activeFunction === "welcome") {
    return asCurrent([
      rootItem,
      {
        label: SPECIAL_PAGE_LABELS[activeFunction],
      },
    ]);
  }

  if (activeDomain === "overview" && activeFunction === "command") {
    return [{ label: "Console" }];
  }

  const section = navData[activeDomain];
  if (!section) {
    return asCurrent([
      rootItem,
      {
        label:
          SPECIAL_PAGE_LABELS[activeFunction] ||
          workspacePages[activeFunction]?.title ||
          humanize(activeFunction),
      },
    ]);
  }

  const items = [rootItem];

  items.push({
    label: section.label,
  });

  const subsection = activeSubsection
    ? section.subsections?.[activeSubsection]
    : null;

  if (subsection) {
    items.push({
      label: subsection.label,
    });
  }

  const centerTabLabel = centerTabs.find(
    (tab) => tab.id === activeCenterTab,
  )?.label;
  const pageLabel =
    activeCenterTab === "dashboard"
      ? SPECIAL_PAGE_LABELS[activeFunction] ||
        workspacePages[activeFunction]?.title ||
        humanize(activeFunction)
      : centerTabLabel ||
        workspacePages[activeFunction]?.title ||
        humanize(activeFunction);

  if (
    pageLabel &&
    items.at(-1)?.label.toLocaleLowerCase() !== pageLabel.toLocaleLowerCase()
  ) {
    items.push({ label: pageLabel });
  }

  return asCurrent(items);
}

export function navigateDashboardBreadcrumb(
  item,
  {
    onDomainChange,
    onSubsectionSelect,
  },
) {
  if (item.target?.type === "subsection") {
    onSubsectionSelect?.(
      item.target.domainId,
      item.target.subsectionId,
    );
    return;
  }

  if (item.target?.type === "domain") {
    onDomainChange?.(item.target.domainId);
  }
}

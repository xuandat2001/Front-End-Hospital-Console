import { centerTabs } from "../data";
import navData, {
  getDefaultFunction,
  getFunction,
  getSectionIds,
  getSubsections,
} from "../tab-data";
import { canAccessFunction } from "../constant/pagePermissions";
import { getPermissionsByRole, getRoleLanding, ROLES } from "../constant/rbac";
import { isKnownDashboardFunction } from "../components/dashboard/dashboardFunctionRegistry";

export const NAVIGATION_STORAGE_KEYS = {
  domain: "activeDomain",
  functionId: "activeFunction",
  centerTab: "activeCenterTab",
  subsection: "activeSubsection",
};

const SPECIAL_TARGETS = {
  notifications: {
    centerTab: "dashboard",
    domain: "overview",
    functionId: "notifications",
    subsection: null,
  },
  welcome: {
    centerTab: "dashboard",
    domain: "overview",
    functionId: "welcome",
    subsection: null,
  },
};

function getSafeRole(role) {
  return role || ROLES.HOSPITAL_ADMIN;
}

export function getEffectivePermissions(role, permissions = []) {
  return permissions.length ? permissions : getPermissionsByRole(getSafeRole(role));
}

export function findVisibleFunctionTarget(functionId, permissions = []) {
  if (!functionId || !isKnownDashboardFunction(functionId)) return null;

  const specialTarget = SPECIAL_TARGETS[functionId];
  if (specialTarget && canAccessFunction(functionId, permissions)) {
    return specialTarget;
  }

  const visibleDomainIds = getSectionIds(permissions);

  for (const domainId of visibleDomainIds) {
    const section = navData[domainId];
    if (!section) continue;

    for (const [centerTab, tabFunction] of Object.entries(section.tabs || {})) {
      if (tabFunction === functionId && canAccessFunction(functionId, permissions)) {
        return {
          centerTab,
          domain: domainId,
          functionId,
          subsection: null,
        };
      }
    }

    for (const subsection of getSubsections(domainId, permissions)) {
      for (const [centerTab, tabFunction] of Object.entries(subsection.tabs || {})) {
        if (tabFunction === functionId && canAccessFunction(functionId, permissions)) {
          return {
            centerTab,
            domain: domainId,
            functionId,
            subsection: subsection.id,
          };
        }
      }
    }
  }

  return null;
}

export function resolveRoleLandingNavigation({
  permissions = [],
  role = ROLES.HOSPITAL_ADMIN,
} = {}) {
  const safeRole = getSafeRole(role);
  const effectivePermissions = getEffectivePermissions(safeRole, permissions);
  const visibleDomainIds = getSectionIds(effectivePermissions);
  const landing = getRoleLanding(safeRole);
  const landingTarget = findVisibleFunctionTarget(
    landing.function,
    effectivePermissions,
  );

  if (landingTarget) {
    return landingTarget;
  }

  const domain = visibleDomainIds.includes(landing.domain)
    ? landing.domain
    : visibleDomainIds[0] || landing.domain;
  const fallbackFunction =
    getDefaultFunction(domain, effectivePermissions) || landing.function || "command";

  return (
    findVisibleFunctionTarget(fallbackFunction, effectivePermissions) || {
      centerTab: "dashboard",
      domain,
      functionId: fallbackFunction,
      subsection: landing.subsection || null,
    }
  );
}

export function isValidNavigationTarget({
  centerTab,
  domain,
  functionId,
  permissions = [],
  subsection = null,
}) {
  if (!centerTabs.some((tab) => tab.id === centerTab)) return false;
  if (!canAccessFunction(functionId, permissions)) return false;

  const resolvedTarget = findVisibleFunctionTarget(functionId, permissions);

  return Boolean(
    resolvedTarget &&
      resolvedTarget.domain === domain &&
      resolvedTarget.subsection === (subsection || null) &&
      resolvedTarget.centerTab === centerTab,
  );
}

export function resolveSafeNavigationState({
  centerTab,
  domain,
  functionId,
  permissions = [],
  role = ROLES.HOSPITAL_ADMIN,
  subsection = null,
} = {}) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  const directTarget = {
    centerTab: centerTab || "dashboard",
    domain,
    functionId,
    subsection: subsection || null,
  };

  if (isValidNavigationTarget({ ...directTarget, permissions: effectivePermissions })) {
    return directTarget;
  }

  const targetByFunction = findVisibleFunctionTarget(functionId, effectivePermissions);

  if (targetByFunction) {
    return targetByFunction;
  }

  return resolveRoleLandingNavigation({
    permissions: effectivePermissions,
    role,
  });
}

export function resolveDomainNavigation(domain, permissions = [], role) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  const visibleDomainIds = getSectionIds(effectivePermissions);

  if (!visibleDomainIds.includes(domain)) {
    return resolveRoleLandingNavigation({ permissions: effectivePermissions, role });
  }

  const functionId = getDefaultFunction(domain, effectivePermissions);
  return resolveSafeNavigationState({
    domain,
    functionId,
    permissions: effectivePermissions,
    role,
  });
}

export function resolveSubsectionNavigation(
  domain,
  subsection,
  permissions = [],
  role,
) {
  const effectivePermissions = getEffectivePermissions(role, permissions);
  const defaultTab = subsection === "surgery" ? "planning" : "dashboard";
  const functionId = getFunction(domain, subsection, defaultTab);

  return resolveSafeNavigationState({
    centerTab: defaultTab,
    domain,
    functionId,
    permissions: effectivePermissions,
    role,
    subsection,
  });
}

export function resolveCenterTabNavigation({
  activeDomain,
  activeSubsection,
  centerTab,
  permissions = [],
  role,
}) {
  const functionId = getFunction(activeDomain, activeSubsection, centerTab);

  return resolveSafeNavigationState({
    centerTab,
    domain: activeDomain,
    functionId,
    permissions,
    role,
    subsection: activeSubsection,
  });
}

export function readStoredNavigation() {
  const subsection = localStorage.getItem(NAVIGATION_STORAGE_KEYS.subsection);

  return {
    centerTab:
      localStorage.getItem(NAVIGATION_STORAGE_KEYS.centerTab) || "dashboard",
    domain: localStorage.getItem(NAVIGATION_STORAGE_KEYS.domain),
    functionId: localStorage.getItem(NAVIGATION_STORAGE_KEYS.functionId),
    subsection: subsection || null,
  };
}

export function writeStoredNavigation(navigation) {
  localStorage.setItem(NAVIGATION_STORAGE_KEYS.domain, navigation.domain);
  localStorage.setItem(
    NAVIGATION_STORAGE_KEYS.functionId,
    navigation.functionId,
  );
  localStorage.setItem(
    NAVIGATION_STORAGE_KEYS.centerTab,
    navigation.centerTab || "dashboard",
  );

  if (navigation.subsection) {
    localStorage.setItem(
      NAVIGATION_STORAGE_KEYS.subsection,
      navigation.subsection,
    );
    return;
  }

  localStorage.removeItem(NAVIGATION_STORAGE_KEYS.subsection);
}

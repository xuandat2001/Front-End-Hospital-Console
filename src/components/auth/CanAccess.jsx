import useSessionStore from "../../store/useSessionStore";

function CanAccess({
  permission,
  anyPermissions = [],
  fallback = null,
  children,
}) {
  const can = useSessionStore((state) => state.can);
  const canAny = useSessionStore((state) => state.canAny);

  const allowed = permission ? can(permission) : canAny(anyPermissions);

  if (!allowed) return fallback;

  return children;
}

export default CanAccess;
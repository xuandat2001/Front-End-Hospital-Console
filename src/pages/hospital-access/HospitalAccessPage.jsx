import { useEffect, useState } from "react";
import ellyLogo from "../../assets/elly-logo.png";
import Icon from "../../components/dashboard/Icon";
import useSessionStore from "../../store/useSessionStore";
import "./HospitalAccessPage.css";

function MetricTile({ icon, label, value, tone }) {
  return (
    <div className={`hospital-preview-metric hospital-preview-metric--${tone}`}>
      <span>
        <Icon name={icon} size={15} />
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function HospitalPreview() {
  return (
    <div className="hospital-preview" aria-hidden="true">
      <div className="hospital-preview-sidebar">
        <span className="hospital-preview-avatar" />
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="hospital-preview-content">
        <div className="hospital-preview-topline">
          <span>Healthcare command</span>
          <strong>Live workspace</strong>
        </div>

        <div className="hospital-preview-grid">
          <div className="hospital-preview-capacity">
            <div className="hospital-preview-ring">
              <span>46%</span>
            </div>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className="hospital-preview-forecast">
            <span>AI-powered forecast</span>
            <div className="forecast-line">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>

        <div className="hospital-preview-analysis">
          <span>Operational drivers</span>
          <i />
          <i />
          <i />
        </div>

        <div className="hospital-preview-metrics">
          <MetricTile
            icon="hospital"
            label="Bed utilization"
            value="46%"
            tone="blue"
          />
          <MetricTile
            icon="analytics"
            label="Flow health"
            value="92"
            tone="green"
          />
          <MetricTile
            icon="operations"
            label="Care teams"
            value="18"
            tone="purple"
          />
        </div>
      </div>
    </div>
  );
}

function normalizeEllyId(value) {
  return value.trim().toUpperCase();
}

function getResolvedWorkspace(resolved, selectedMembershipId) {
  if (!resolved) return null;

  if (resolved.requiresWorkspaceSelection) {
    return resolved.memberships?.find(
      (membership) => membership.membershipId === selectedMembershipId,
    );
  }

  return resolved.activeWorkspace;
}

function getAccountLabel(role, workspaceType) {
  if (role === "HOSPITAL_ADMIN" || workspaceType === "HOSPITAL") {
    return "Hospital Admin";
  }

  if (role === "DOCTOR") {
    return "Doctor";
  }

  if (role === "CLINIC_ADMIN") {
    return "Clinic Admin";
  }

  return "Healthcare Workspace";
}

function getAccessErrorMessage(error) {
  if (error?.status === 404) {
    return "ELLY ID was not found.";
  }

  if (error?.status === 403) {
    return "This account is not active.";
  }

  return error?.message || "We could not sign you in. Try again.";
}

function HospitalAccessPage({ onAccessGranted }) {
  const [ellyId, setEllyId] = useState("");
  const [resolved, setResolved] = useState(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const resolveEllyId = useSessionStore((state) => state.resolveEllyId);
  const loginWithEllyId = useSessionStore((state) => state.loginWithEllyId);

  const selectedWorkspace = getResolvedWorkspace(resolved, selectedMembershipId);
  const selectedRole = selectedWorkspace?.role || resolved?.role;
  const selectedWorkspaceType =
    selectedWorkspace?.workspaceType || selectedWorkspace?.type;
  const accountLabel = getAccountLabel(selectedRole, selectedWorkspaceType);
  const profile = resolved?.profileSnapshot || {};
  const canSubmitLogin =
    resolved && (!resolved.requiresWorkspaceSelection || selectedMembershipId);

  useEffect(() => {
    if (!isHelpOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isHelpOpen]);

  const resetResolution = () => {
    setResolved(null);
    setSelectedMembershipId("");
  };

  const handleEllyIdChange = (event) => {
    setEllyId(event.target.value);
    setError("");
    resetResolution();
  };

  const handleResolve = async () => {
    const normalized = normalizeEllyId(ellyId);

    if (!normalized) {
      setError("Enter your ELLY ID to continue.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await resolveEllyId(normalized);
      setEllyId(data.ellyId || normalized);
      setResolved(data);
      setSelectedMembershipId(data.memberships?.[0]?.membershipId || "");
    } catch (resolveError) {
      setError(getAccessErrorMessage(resolveError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!canSubmitLogin) {
      setError("Select a workspace to continue.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await loginWithEllyId({
        ellyId: normalizeEllyId(ellyId),
        membershipId: selectedMembershipId || undefined,
      });

      onAccessGranted(session.activeWorkspace);
    } catch (loginError) {
      setError(getAccessErrorMessage(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (resolved) {
      await handleLogin();
      return;
    }

    await handleResolve();
  };

  return (
    <main className="hospital-access-shell">
      <section
        className="hospital-access-panel"
        aria-label="ELLY healthcare access"
      >
        <div className="hospital-access-intro">
          <div className="hospital-access-brand">
            <img src={ellyLogo} alt="ELLY" />
            <span>ELLY</span>
          </div>

          <div className="hospital-access-copy">
            <h1>AI-powered operations for smarter healthcare</h1>
            <p>
              ELLY routes authorized hospital and clinic users into the right
              workspace from one secure identity.
            </p>
          </div>

          <HospitalPreview />
        </div>

        <form className="hospital-access-card" onSubmit={handleSubmit} noValidate>
          <div className="hospital-access-card__brand">
            <img src={ellyLogo} alt="" aria-hidden="true" />
            <strong>ELLY</strong>
          </div>

          <div className="hospital-access-card__heading">
            <h2>Welcome to ELLY Console</h2>
            <p>Enter your ELLY ID to open the right healthcare workspace.</p>
          </div>

          <label className="hospital-access-field" htmlFor="elly-id">
            <span>ELLY ID</span>
            <div className="hospital-access-input-wrap">
              <Icon name="records" size={19} />
              <input
                id="elly-id"
                name="ellyId"
                value={ellyId}
                onChange={handleEllyIdChange}
                onBlur={() => setEllyId((value) => normalizeEllyId(value))}
                placeholder="Enter Hospital Admin or Doctor ELLY ID"
                autoComplete="username"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "elly-id-error" : undefined}
                disabled={isLoading}
              />
            </div>
          </label>

          {resolved && (
            <div className="hospital-access-resolved" aria-live="polite">
              <div>
                <span>{accountLabel}</span>
                <strong>
                  {resolved.user?.fullName ||
                    selectedWorkspace?.user?.fullName ||
                    "Authorized user"}
                </strong>
              </div>
              <p>
                {selectedWorkspace?.workspaceName ||
                  selectedWorkspace?.name ||
                  "ELLY Workspace"}
              </p>
              {(profile.specialty || profile.specialization) && (
                <small>{profile.specialty || profile.specialization}</small>
              )}
            </div>
          )}

          {resolved?.requiresWorkspaceSelection && (
            <div className="hospital-access-workspaces">
              {resolved.memberships.map((membership) => (
                <button
                  key={membership.membershipId}
                  type="button"
                  disabled={isLoading}
                  className={
                    selectedMembershipId === membership.membershipId
                      ? "is-selected"
                      : ""
                  }
                  onClick={() => setSelectedMembershipId(membership.membershipId)}
                >
                  <strong>{membership.workspaceName}</strong>
                  <span>
                    {membership.workspaceType} / {membership.role}
                    {membership.user?.fullName
                      ? ` / ${membership.user.fullName}`
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          {import.meta.env.DEV && (
            <p className="hospital-access-demo-note">
              Demo IDs: ELLY-USER-HOSP-ADMIN-001 or ELLY-USER-DOCTOR-001
            </p>
          )}

          {error && (
            <p className="hospital-access-error" id="elly-id-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="hospital-access-submit"
            type="submit"
            disabled={isLoading || (resolved && !canSubmitLogin)}
          >
            <span>
              {isLoading ? "Working" : resolved ? "Sign in" : "Continue"}
            </span>
            {isLoading ? (
              <span className="hospital-access-spin" aria-hidden="true" />
            ) : (
              <span className="hospital-access-arrow" aria-hidden="true" />
            )}
          </button>

          <button
            className="hospital-access-help"
            type="button"
            aria-controls="elly-id-help-panel"
            aria-expanded={isHelpOpen}
            onClick={() => setIsHelpOpen((isOpen) => !isOpen)}
          >
            <span className="hospital-access-help-icon" aria-hidden="true">
              ?
            </span>
            <span>Need help to find ELLY ID?</span>
          </button>

          {isHelpOpen && (
            <section
              className="hospital-access-help-panel"
              id="elly-id-help-panel"
              aria-labelledby="elly-id-help-title"
            >
              <div className="hospital-access-help-panel__heading">
                <h3 id="elly-id-help-title">
                  Need help finding your ELLY ID?
                </h3>
                <button
                  className="hospital-access-help-panel__close"
                  type="button"
                  aria-label="Close ELLY ID help"
                  onClick={() => setIsHelpOpen(false)}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <p>
                Your ELLY ID is provided by the ELLY / Electra Wireless team
                when your hospital, clinic, doctor account, or organization
                workspace is registered.
              </p>
              <p>
                If you cannot find your ELLY ID, please contact Electra
                Wireless to request access or confirm your registered account.
              </p>

              <a
                className="hospital-access-help-panel__link"
                href="https://www.electrawireless.co/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Contact Electra Wireless
                <Icon name="arrowRight" size={16} />
              </a>
            </section>
          )}

          <div className="hospital-access-divider" />

          <p className="hospital-access-security">
            <Icon name="check" size={18} />
            <span>Secure access for authorized healthcare staff only</span>
          </p>

          <Icon className="hospital-access-card__spark" name="sparkle" size={22} />
        </form>
      </section>
    </main>
  );
}

export default HospitalAccessPage;

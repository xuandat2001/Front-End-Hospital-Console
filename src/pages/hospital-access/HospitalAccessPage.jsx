import { useState } from "react";
import ellyLogo from "../../assets/elly-logo.png";
import Icon from "../../components/dashboard/Icon";
import {
  normalizeEllyHospitalId,
  resolveEllyHospitalId,
  validateEllyHospitalId,
} from "../../services/hospitalAccess/hospitalAccessApi";
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
          <span>Hospital command</span>
          <strong>Live capacity</strong>
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
            label="Departments"
            value="18"
            tone="purple"
          />
        </div>
      </div>
    </div>
  );
}

function HospitalAccessPage({ onAccessGranted }) {
  const [ellyId, setEllyId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEllyId = normalizeEllyHospitalId(ellyId);
    const validationError = validateEllyHospitalId(normalizedEllyId);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const workspace = await resolveEllyHospitalId(normalizedEllyId);

      onAccessGranted(workspace);
    } catch (accessError) {
      setError(
        accessError.message ||
          "We could not verify that ELLY ID. Check it and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setEllyId(event.target.value);

    if (error) {
      setError("");
    }
  };

  const handleInputBlur = () => {
    setEllyId((value) => normalizeEllyHospitalId(value));
  };

  return (
    <main className="hospital-access-shell">
      <section
        className="hospital-access-panel"
        aria-label="ELLY hospital access"
      >
        <div className="hospital-access-intro">
          <div className="hospital-access-brand">
            <img src={ellyLogo} alt="ELLY" />
            <span>ELLY</span>
          </div>

          <div className="hospital-access-copy">
            <h1>AI-powered operations for smarter hospitals</h1>
            <p>
              ELLY helps hospital teams optimize capacity, improve patient flow,
              and deliver exceptional care every day.
            </p>
          </div>

          <HospitalPreview />
        </div>

        <form
          className="hospital-access-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="hospital-access-card__brand">
            <img src={ellyLogo} alt="" aria-hidden="true" />
            <strong>ELLY</strong>
          </div>

          <div className="hospital-access-card__heading">
            <h2>Welcome to ELLY Hospital Console</h2>
            <p>Enter your ELLY ID to access your hospital workspace</p>
          </div>

          <label className="hospital-access-field" htmlFor="elly-hospital-id">
            <span>ELLY ID</span>
            <div className="hospital-access-input-wrap">
              <Icon name="hospital" size={19} />
              <input
                id="elly-hospital-id"
                name="ellyHospitalId"
                value={ellyId}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="e.g. ELLY-ORG-xxxx or ELLY-HOSP-000124"
                autoComplete="organization"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "elly-id-error" : undefined}
                disabled={isLoading}
              />
            </div>
          </label>

          {error && (
            <p className="hospital-access-error" id="elly-id-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="hospital-access-submit"
            type="submit"
            disabled={isLoading}
          >
            <span>{isLoading ? "Verifying" : "Continue"}</span>
            {isLoading ? (
              <span className="hospital-access-spin" aria-hidden="true" />
            ) : (
              <span className="hospital-access-arrow" aria-hidden="true" />
            )}
          </button>

          <button className="hospital-access-help" type="button">
            <span className="hospital-access-help-icon" aria-hidden="true">
              ?
            </span>
            <span>Need help finding your ELLY ID?</span>
          </button>

          <div className="hospital-access-divider" />

          <p className="hospital-access-security">
            <Icon name="check" size={18} />
            <span>Secure access for authorized hospital staff only</span>
          </p>

          <Icon className="hospital-access-card__spark" name="sparkle" size={22} />
        </form>
      </section>
    </main>
  );
}

export default HospitalAccessPage;
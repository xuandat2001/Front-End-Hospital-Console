import { useEffect, useState } from "react";
import Icon from "./Icon";

const SETTINGS_CLOSE_ANIMATION_MS = 340;

const settingGroups = [
  {
    title: "Operations",
    description: "Mock defaults for command center thresholds.",
    settings: [
      {
        id: "alertSensitivity",
        label: "Alert sensitivity",
        enabled: true,
      },
      {
        id: "bedWarning",
        label: "Bed capacity warning",
        enabled: true,
      },
      {
        id: "registrationPriority",
        label: "Registration auto-priority",
        enabled: true,
      },
    ],
  },
  {
    title: "Realtime",
    description: "Mock timing for live workspace updates.",
    settings: [
      {
        id: "refreshCadence",
        label: "Data refresh cadence",
        enabled: true,
      },
      {
        id: "escalationLead",
        label: "Emergency escalation lead",
        enabled: true,
      },
      {
        id: "handoffWindow",
        label: "Staff handoff window",
        enabled: false,
      },
    ],
  },
  {
    title: "Notifications",
    description: "Mock signal balance for alerts and insights.",
    settings: [
      {
        id: "notificationVolume",
        label: "Notification volume",
        type: "volume",
        value: 46,
      },
      {
        id: "insightConfidence",
        label: "Insight confidence floor",
        enabled: true,
      },
      {
        id: "auditDetail",
        label: "Audit detail level",
        enabled: false,
      },
    ],
  },
];

function SettingToggle({ checked, label, onChange }) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle-copy">
        <span>{label}</span>
        <strong>{checked ? "On" : "Off"}</strong>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="settings-toggle-track" aria-hidden="true">
        <span className="settings-toggle-glyph" />
      </span>
    </label>
  );
}

function NotificationVolumeSlider({ value, isActive, onActiveChange, onChange }) {
  return (
    <label
      className={`settings-volume-control ${isActive ? "is-active" : ""}`}
      style={{ "--volume-percent": `${value}%` }}
    >
      <span className="settings-volume-copy">
        <span>Notification volume</span>
        <strong>{value}%</strong>
      </span>
      <span className="settings-volume-slider">
        <Icon className="settings-volume-icon settings-volume-icon-low" name="volumeLow" size={22} />
        <span className="settings-volume-track">
          <span className="settings-volume-fill" aria-hidden="true" />
          <span className="settings-volume-value" aria-hidden="true">
            {value}%
          </span>
          <input
            aria-label="Notification volume"
            max="100"
            min="0"
            onBlur={() => onActiveChange(false)}
            onChange={(event) => onChange(Number(event.target.value))}
            onFocus={() => onActiveChange(true)}
            onPointerCancel={() => onActiveChange(false)}
            onPointerDown={() => onActiveChange(true)}
            onPointerUp={() => onActiveChange(false)}
            type="range"
            value={value}
          />
        </span>
        <Icon className="settings-volume-icon settings-volume-icon-high" name="volume" size={24} />
      </span>
    </label>
  );
}

function SettingsPage({ isDark, onClose, onThemeChange }) {
  const [notificationVolume, setNotificationVolume] = useState(46);
  const [isVolumeActive, setIsVolumeActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [settings, setSettings] = useState(() =>
    settingGroups.reduce((acc, group) => {
      group.settings.forEach((setting) => {
        if (setting.type !== "volume") {
          acc[setting.id] = setting.enabled;
        }
      });
      return acc;
    }, {}),
  );

  const updateSetting = (settingId, value) => {
    setSettings((current) => ({
      ...current,
      [settingId]: value,
    }));
  };

  const updateTheme = (event) => {
    onThemeChange(event.target.checked);
  };

  const closeSettings = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, SETTINGS_CLOSE_ANIMATION_MS);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing]);

  return (
    <div className={`dashboard-settings-overlay ${isClosing ? "is-closing" : ""}`}>
      <button
        aria-label="Close settings"
        className="dashboard-settings-backdrop"
        onClick={closeSettings}
        type="button"
      />
      <section
        aria-labelledby="settings-page-title"
        aria-modal="true"
        className="dashboard-settings-page"
        role="dialog"
      >
        <header className="settings-page-header">
          <div>
            <span>Clinical workspace</span>
            <h2 id="settings-page-title">Settings</h2>
          </div>
          <button
            aria-label="Close settings"
            className="icon-button settings-close-button"
            onClick={closeSettings}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="settings-page-grid">
          <section className="settings-section settings-section-appearance">
            <div className="settings-section-heading">
              <Icon name={isDark ? "moon" : "sun"} size={20} />
              <div>
                <h3>Appearance</h3>
                <p>{isDark ? "Dark mode" : "Light mode"}</p>
              </div>
            </div>
            <label className="settings-toggle settings-theme-toggle">
              <span className="settings-toggle-copy">
                <span>Theme mode</span>
                <strong>{isDark ? "Dark" : "Light"}</strong>
              </span>
              <input
                aria-label="Theme mode"
                checked={isDark}
                onChange={updateTheme}
                type="checkbox"
              />
              <span className="settings-toggle-track" aria-hidden="true">
                <span className="settings-toggle-glyph" />
              </span>
            </label>
          </section>

          {settingGroups.map((group) => (
            <section className="settings-section" key={group.title}>
              <div className="settings-section-heading">
                <Icon name="settings" size={20} />
                <div>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
              </div>
              <div className="settings-toggle-stack">
                {group.settings.map((setting) => (
                  setting.type === "volume" ? (
                    <NotificationVolumeSlider
                      isActive={isVolumeActive}
                      key={setting.id}
                      onActiveChange={setIsVolumeActive}
                      onChange={setNotificationVolume}
                      value={notificationVolume}
                    />
                  ) : (
                    <SettingToggle
                      checked={settings[setting.id]}
                      key={setting.id}
                      label={setting.label}
                      onChange={(checked) => updateSetting(setting.id, checked)}
                    />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;

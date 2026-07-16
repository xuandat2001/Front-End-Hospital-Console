import Icon from "./Icon";

export function ThemeToggle({ isDark, onThemeChange, showLabel = false }) {
  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      className="theme-toggle"
      onClick={() => onThemeChange(!isDark)}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      <span className="theme-toggle-icon">
        <Icon name={isDark ? "sun" : "moon"} size={19} />
      </span>
      {showLabel && (
        <span className="theme-toggle-copy">
          <strong>Appearance</strong>
          <small>{isDark ? "Dark mode" : "Light mode"}</small>
        </span>
      )}
    </button>
  );
}

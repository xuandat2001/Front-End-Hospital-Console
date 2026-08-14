export function getInitialThemePreference() {
  if (typeof window === "undefined") return false;

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return savedTheme === "dark";

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeClass(isDark = getInitialThemePreference()) {
  document.documentElement.classList.toggle("dark", isDark);
}

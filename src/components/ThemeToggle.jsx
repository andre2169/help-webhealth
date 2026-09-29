import Icon from "./Icon";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " compact" : ""}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      <Icon name={isDark ? "sun" : "moon"} size={compact ? 17 : 18} />
      {!compact && <span className="theme-toggle-label">{isDark ? "Modo claro" : "Modo escuro"}</span>}
      {!compact && (
        <span className={`theme-switch${isDark ? " is-dark" : ""}`} aria-hidden="true">
          <span className="theme-switch-knob" />
          <small>{isDark ? "ON" : "OFF"}</small>
        </span>
      )}
    </button>
  );
}

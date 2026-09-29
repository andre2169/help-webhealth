import { useState } from "react";
import Icon from "./Icon";

function readPreference(key, defaultOpen) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved === null ? defaultOpen : saved === "open";
  } catch {
    return defaultOpen;
  }
}

export default function CollapsiblePanel({
  storageKey,
  scope = "local",
  title,
  icon,
  subtitle,
  heading,
  actions,
  children,
  as: Root = "section",
  className = "",
  headerClassName = "",
  contentClassName = "",
  defaultOpen = true,
}) {
  const preferenceKey = `helphealth:panel:${scope}:${storageKey}`;
  const panelId = `panel-${scope}-${storageKey}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const [open, setOpen] = useState(() => readPreference(preferenceKey, defaultOpen));

  function toggle() {
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(preferenceKey, next ? "open" : "closed");
      } catch {
        // A preferência indisponível não deve impedir o recolhimento do painel.
      }
      return next;
    });
  }

  function handlePanelClick(event) {
    if (event.target.closest("button, input, select, textarea, a, label, [role='button'], summary")) return;
    toggle();
  }

  function handleHeadingKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  }

  return (
    <Root
      className={`collapsible-panel ${open ? "is-open" : "is-collapsed"} ${className}`.trim()}
      onClick={handlePanelClick}
    >
      <header className={`collapsible-panel-header ${headerClassName}`.trim()}>
        <div
          className="collapsible-panel-heading-content"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          onKeyDown={handleHeadingKeyDown}
        >
          {heading || (
            <div className="collapsible-panel-heading-default">
              {icon && <Icon name={icon} />}
              <div>
                <h3>{title}</h3>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
          )}
        </div>
        {actions && <div className="collapsible-panel-tools">{actions}</div>}
      </header>
      <div
        id={panelId}
        className={`collapsible-panel-content ${contentClassName}`.trim()}
        hidden={!open}
      >
        {children}
      </div>
    </Root>
  );
}

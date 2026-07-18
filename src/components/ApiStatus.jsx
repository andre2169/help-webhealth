import { useEffect, useState } from "react";
import { checkApiHealth, getApiBaseUrl } from "../api/api";

export default function ApiStatus({ compact = false }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await checkApiHealth();
        if (active) setStatus("online");
      } catch {
        if (active) setStatus("offline");
      }
    }

    load();
    const interval = window.setInterval(load, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const labels = {
    checking: "Conectando",
    online: "API online",
    offline: "API offline",
  };

  return (
    <div className={`api-status ${status}${compact ? " compact" : ""}`}>
      <span className="api-status-dot" />
      <span>{labels[status]}</span>
      {!compact && <small>{getApiBaseUrl()}</small>}
    </div>
  );
}


import { useEffect, useState } from "react";
import { getTicketCatalog } from "../api/api";

export default function useTicketCatalog({ includeInactive = false } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getTicketCatalog({ includeInactive })
      .then(result => { if (active) setOptions(result); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeInactive, revision]);

  return {
    options, loading, error,
    sectors: options.filter(option => option.kind === "sector").map(option => option.name),
    categories: options.filter(option => option.kind === "category").map(option => option.name),
    reload: () => setRevision(current => current + 1),
  };
}

export function formatTicketCode(id) {
  return `CHM-${String(id ?? "").padStart(4, "0")}`;
}


const LABELS = {
  user: "Usuário",
  technician: "Técnico",
  admin: "Admin",
};

export default function RoleBadge({ role }) {
  return (
    <span className={`role-badge ${role}`}>{LABELS[role] || role}</span>
  );
}


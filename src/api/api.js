const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
const API_BASE_URL = API_URL.replace(/\/api\/v1$/, "");
const LEGACY_AUTH_TOKEN_KEYS = ["helpwebhealth_token", "token"];
const GET_CACHE_TTL_MS = 3000;
const getRequestCache = new Map();

function pruneGetCache(now) {
  for (const [key, item] of getRequestCache.entries()) {
    if (!item || item.expiresAt <= now) {
      getRequestCache.delete(key);
    }
  }

  if (getRequestCache.size > 80) {
    getRequestCache.clear();
  }
}

function clearApiGetCache() {
  getRequestCache.clear();
}

function removeLegacyAuthToken() {
  try {
    LEGACY_AUTH_TOKEN_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // Alguns navegadores bloqueiam storage em modo privado.
  }
}

removeLegacyAuthToken();

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return null;
}

export function storeAuthToken() {
  clearAuthToken();
}

export function clearAuthToken() {
  removeLegacyAuthToken();
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("API indisponível");
  }

  return response.json();
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function buildReportsQuery({
  startDate = "",
  endDate = "",
  status = "",
  priority = "",
  category = "",
  sector = "",
  operationalImpact = "",
} = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);
  if (category) params.append("category", category);
  if (sector) params.append("sector", sector);
  if (operationalImpact) params.append("operational_impact", operationalImpact);
  return params.toString();
}

async function handle(response) {
  const isNoContent = response.status === 204;
  const data = isNoContent ? null : await response.json().catch(() => null);

  if (!response.ok) {
    let message =
      (data && (data.detail || data.message)) || "Erro inesperado. Tente novamente.";

    if (Array.isArray(message)) {
      message =
        message
          .map((item) => item?.msg || item?.message)
          .find(Boolean)
          ?.replace(/^Value error,\s*/i, "") || "Revise os campos informados.";
    }

    throw new Error(typeof message === "string" ? message : "Erro inesperado.");
  }

  return data;
}

async function cachedGetJson(url, { ttl = GET_CACHE_TTL_MS } = {}) {
  const now = Date.now();
  pruneGetCache(now);

  const cached = getRequestCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetch(url, {
    credentials: "include",
    headers: getAuthHeaders(),
  }).then(handle);

  getRequestCache.set(url, {
    promise,
    expiresAt: now + ttl,
  });

  promise.catch(() => {
    if (getRequestCache.get(url)?.promise === promise) {
      getRequestCache.delete(url);
    }
  });

  return promise;
}

/* ---------- Auth ---------- */
export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(response);
}

export async function getMe() {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function updateMe({
  name,
  phone,
  jobTitle,
  department,
  unitName,
  notificationPreference,
  avatarImage,
}) {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name,
      phone,
      job_title: jobTitle,
      department,
      unit_name: unitName,
      notification_preference: notificationPreference,
      avatar_image: avatarImage,
    }),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

export async function requestPasswordChange({ currentPassword, newPassword }) {
  const response = await fetch(`${API_URL}/auth/me/password/request`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return handle(response);
}

export async function confirmPasswordChange({ newPassword, code }) {
  const response = await fetch(`${API_URL}/auth/me/password/confirm`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      new_password: newPassword,
      code,
    }),
  });
  return handle(response);
}

export async function requestAccountRecovery({ email, newPassword }) {
  const response = await fetch(`${API_URL}/auth/password/recovery/request`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      new_password: newPassword,
    }),
  });
  return handle(response);
}

export async function confirmAccountRecovery({ email, newPassword, code }) {
  const response = await fetch(`${API_URL}/auth/password/recovery/confirm`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      new_password: newPassword,
      code,
    }),
  });
  return handle(response);
}

export async function requestEmailChange({ newEmail, currentPassword }) {
  const response = await fetch(`${API_URL}/auth/me/email/request`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      new_email: newEmail,
      current_password: currentPassword,
    }),
  });
  return handle(response);
}

export async function confirmEmailChange({ newEmail, code }) {
  const response = await fetch(`${API_URL}/auth/me/email/confirm`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      new_email: newEmail,
      code,
    }),
  });
  return handle(response);
}

export async function requestEmailVerification() {
  const response = await fetch(`${API_URL}/auth/me/email-verification/request`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function confirmEmailVerification({ code }) {
  const response = await fetch(`${API_URL}/auth/me/email-verification/confirm`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ code }),
  });
  return handle(response);
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
  } finally {
    clearApiGetCache();
    clearAuthToken();
  }
}

/* ---------- Cadastro ---------- */
export async function registerUser({
  name,
  email,
  password,
  phone,
  jobTitle,
  department,
  unitName,
}) {
  const response = await fetch(`${API_URL}/users/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      job_title: jobTitle,
      department,
      unit_name: unitName,
    }),
  });
  return handle(response);
}

/* ---------- Tickets ---------- */
export async function getTickets({
  status = "",
  technicianId = "",
  userId = "",
  priority = "",
  category = "",
  sector = "",
  operationalImpact = "",
  orderBy = "created_at",
  direction = "desc",
  skip = 0,
  limit = 10,
} = {}) {
  const params = new URLSearchParams();
  params.append("skip", skip);
  params.append("limit", limit);
  params.append("order_by", orderBy);
  params.append("direction", direction);
  if (status) params.append("status", status);
  if (technicianId) params.append("technician_id", technicianId);
  if (userId) params.append("user_id", userId);
  if (priority) params.append("priority", priority);
  if (category) params.append("category", category);
  if (sector) params.append("sector", sector);
  if (operationalImpact) params.append("operational_impact", operationalImpact);

  return cachedGetJson(`${API_URL}/tickets/?${params.toString()}`);
}

export async function createTicket({
  title,
  description,
  category,
  priority,
  sector,
  equipment,
  assetTag,
  operationalImpact,
  issueImage,
  issueImages = [],
}) {
  const images = issueImages.length ? issueImages : issueImage ? [issueImage] : [];
  const response = await fetch(`${API_URL}/tickets/`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      description,
      category,
      priority,
      sector,
      equipment,
      asset_tag: assetTag,
      operational_impact: operationalImpact,
      issue_image: "",
      issue_images: images,
    }),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

export async function getTicketById(ticketId) {
  const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

function patchTicket(ticketId, action) {
  return fetch(`${API_URL}/tickets/${ticketId}/${action}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  })
    .then(handle)
    .then((data) => {
      clearApiGetCache();
      return data;
    });
}

export const assignTicket = (ticketId) => patchTicket(ticketId, "assign");
export const resolveTicket = (ticketId) => patchTicket(ticketId, "resolve");
export const closeTicket = (ticketId) => patchTicket(ticketId, "close");
export const reopenTicket = (ticketId) => patchTicket(ticketId, "reopen");

export async function deleteTicket(ticketId) {
  const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

export async function getTicketTimeline(ticketId) {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/timeline`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function createComment(ticketId, content) {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/comments/`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

/* ---------- Notificações ---------- */
export async function getNotifications({ unreadOnly = false, limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (unreadOnly) params.append("unread_only", "true");

  return cachedGetJson(`${API_URL}/notifications/?${params.toString()}`, {
    ttl: 5000,
  });
}

export async function markNotificationRead(notificationId) {
  const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

export async function markAllNotificationsRead() {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handle(response);
  clearApiGetCache();
  return data;
}

/* ---------- Dashboard / Relatórios ---------- */
export async function getDashboardSummary() {
  return cachedGetJson(`${API_URL}/dashboard/summary`);
}

export async function getReportsOverview({
  startDate = "",
  endDate = "",
  status = "",
  priority = "",
  category = "",
  sector = "",
  operationalImpact = "",
} = {}) {
  const query = buildReportsQuery({
    startDate,
    endDate,
    status,
    priority,
    category,
    sector,
    operationalImpact,
  });
  const response = await fetch(`${API_URL}/reports/overview${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function downloadReportsPdf(filters = {}) {
  const query = buildReportsQuery(filters);
  const response = await fetch(`${API_URL}/reports/overview.pdf${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    await handle(response);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const fileName =
    filenameMatch?.[1] || `helpweb-health-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = await response.blob();

  return { blob, fileName };
}

/* ---------- Admin ---------- */
export async function adminListUsers() {
  const response = await fetch(`${API_URL}/admin/users`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function adminGetUser(userId) {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}

export async function adminChangeUserRole(userId, role) {
  const response = await fetch(
    `${API_URL}/admin/users/${userId}/role?role=${encodeURIComponent(role)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  );
  return handle(response);
}

export async function adminUpdateUser(userId, { name, email }) {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email }),
  });
  return handle(response);
}

export async function adminDeleteUser(userId) {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  return handle(response);
}


const AVATARS_STORAGE_KEY = "helpdesk:user-avatars";
export const AVATAR_UPDATED_EVENT = "helpdesk:avatar-updated";

const AVATAR_PALETTE = [
  ["#315f3b", "#93ab45", "#ffffff"],
  ["#244b53", "#5e9aa2", "#ffffff"],
  ["#5a4d1f", "#c7a946", "#ffffff"],
  ["#4d3f67", "#9d84c2", "#ffffff"],
  ["#6b3f2a", "#d08b52", "#ffffff"],
  ["#2f5a48", "#78a66c", "#ffffff"],
];

function clearLegacyAvatarCache() {
  try {
    localStorage.removeItem(AVATARS_STORAGE_KEY);
  } catch {
    // Alguns navegadores bloqueiam storage em modo privado.
  }
}

clearLegacyAvatarCache();

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function getAvatarKey(user) {
  if (!user) return "";
  if (user.email) return `email:${String(user.email).toLowerCase()}`;
  if (user.name) return `name:${String(user.name).toLowerCase()}`;
  return "";
}

export function getAvatarTone(value) {
  const source = String(value || "usuario");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  const [start, end, text] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  return { start, end, text };
}

export function getUserAvatar(user) {
  if (user?.avatar_image) return user.avatar_image;
  return "";
}

export function saveUserAvatar(user, dataUrl) {
  clearLegacyAvatarCache();
  window.dispatchEvent(
    new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { hasAvatar: Boolean(user && dataUrl) } })
  );
}

export function removeUserAvatar(user) {
  clearLegacyAvatarCache();
  window.dispatchEvent(
    new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { removed: Boolean(user) } })
  );
}

export function subscribeAvatarUpdates(callback) {
  window.addEventListener(AVATAR_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AVATAR_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Selecione uma imagem válida."));
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Use uma imagem de até 4 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      image.onload = () => {
        const outputSize = 320;
        const cropSize = Math.min(image.width, image.height);
        const sourceX = (image.width - cropSize) / 2;
        const sourceY = (image.height - cropSize) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const context = canvas.getContext("2d");
        context.drawImage(
          image,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          outputSize,
          outputSize
        );
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}



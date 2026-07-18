import { useEffect, useState } from "react";
import {
  getAvatarKey,
  getAvatarTone,
  getInitials,
  getUserAvatar,
  subscribeAvatarUpdates,
} from "../utils/avatar";

export default function UserAvatar({ user, name, size = 36, className = "", src }) {
  const displayName = name || user?.name || user?.email || "Usuario";
  const identity = user || { name: displayName };
  const avatarKey = getAvatarKey(identity);
  const [storedSrc, setStoredSrc] = useState(() => getUserAvatar(identity));
  const tone = getAvatarTone(displayName);
  const avatarSrc = src !== undefined ? src : user?.avatar_image || storedSrc;

  useEffect(() => {
    function refreshAvatar() {
      setStoredSrc(getUserAvatar(identity));
    }

    refreshAvatar();
    return subscribeAvatarUpdates(refreshAvatar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarKey]);

  return (
    <div
      className={`user-avatar ${className}`.trim()}
      style={{
        "--avatar-size": `${size}px`,
        "--avatar-start": tone.start,
        "--avatar-end": tone.end,
        "--avatar-text": tone.text,
      }}
      aria-label={displayName}
      title={displayName}
    >
      {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{getInitials(displayName)}</span>}
    </div>
  );
}


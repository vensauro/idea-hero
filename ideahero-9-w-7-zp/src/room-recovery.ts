import { normalizeInviteCode } from "./room-invite";

export const ROOM_RECOVERY_KEY = "idea-hero:active-room";

function browserStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function saveRecoverableRoom(code: string) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  browserStorage()?.setItem(ROOM_RECOVERY_KEY, normalized);
}

export function recoverableRoomCode() {
  return normalizeInviteCode(browserStorage()?.getItem(ROOM_RECOVERY_KEY));
}

export function clearRecoverableRoom() {
  browserStorage()?.removeItem(ROOM_RECOVERY_KEY);
}

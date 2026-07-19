const ROOM_QUERY_PARAM = "sala";

export function normalizeInviteCode(code: string | null | undefined) {
  const normalized = code?.trim().toLowerCase();
  return normalized && /^[a-z0-9-]{4,24}$/.test(normalized)
    ? normalized
    : undefined;
}

export function roomCodeFromUrl(url: string) {
  const parsed = new URL(url);
  return normalizeInviteCode(
    parsed.searchParams.get(ROOM_QUERY_PARAM) ??
      parsed.searchParams.get("room"),
  );
}

export function buildRoomInviteUrl(code: string, baseUrl: string) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) throw new Error("Código de sala inválido.");
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set(ROOM_QUERY_PARAM, normalized);
  return url.toString();
}

export function clearRoomInviteUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  url.searchParams.delete(ROOM_QUERY_PARAM);
  url.searchParams.delete("room");
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

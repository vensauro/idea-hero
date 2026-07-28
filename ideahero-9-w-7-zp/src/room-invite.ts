const ROOM_QUERY_PARAM = "sala";
const ACCEPTED_QUERY_PARAMS = [
  "sala",
  "room",
  "code",
  "codigo",
  "código",
  "invite",
  "convite",
];
const ACCEPTED_PATH_PREFIXES = ["sala", "room", "join", "convite", "c", "r"];

export function normalizeInviteCode(code: string | null | undefined) {
  const normalized = code?.trim().toLowerCase();
  return normalized && /^[a-z0-9-]{4,24}$/.test(normalized)
    ? normalized
    : undefined;
}

export function roomCodeFromUrl(url: string | null | undefined) {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  let parsed: URL | undefined;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      parsed = new URL(trimmed);
    } else if (trimmed.includes("://")) {
      parsed = new URL(trimmed);
    } else {
      parsed = new URL(trimmed, "https://dummy.local");
    }
  } catch {
    parsed = undefined;
  }

  if (parsed) {
    for (const param of ACCEPTED_QUERY_PARAMS) {
      const val = parsed.searchParams.get(param);
      const normalized = normalizeInviteCode(val);
      if (normalized) return normalized;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].toLowerCase();
      if (ACCEPTED_PATH_PREFIXES.includes(seg) && i + 1 < segments.length) {
        const candidate = normalizeInviteCode(segments[i + 1]);
        if (candidate) return candidate;
      }
    }
  }

  const queryMatch = trimmed.match(
    /(?:sala|room|code|codigo|código|invite|convite)=([a-z0-9-]{4,24})/i,
  );
  if (queryMatch) {
    const candidate = normalizeInviteCode(queryMatch[1]);
    if (candidate) return candidate;
  }

  const pathMatch = trimmed.match(
    /(?:sala|room|join|convite)\/([a-z0-9-]{4,24})/i,
  );
  if (pathMatch) {
    const candidate = normalizeInviteCode(pathMatch[1]);
    if (candidate) return candidate;
  }

  return undefined;
}

export function extractRoomCode(
  input: string | null | undefined,
): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const codeFromUrl = roomCodeFromUrl(trimmed);
  if (codeFromUrl) return codeFromUrl;

  return normalizeInviteCode(trimmed);
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


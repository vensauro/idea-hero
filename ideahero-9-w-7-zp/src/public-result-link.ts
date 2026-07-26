const RESULT_QUERY_PARAM = "resultado";
// Older published results used base-36 tokens; keep their links valid.
const TOKEN_PATTERN = /^[a-z0-9]{24,48}$/;

export function publicResultTokenFromUrl(url: string) {
  const token = new URL(url).searchParams.get(RESULT_QUERY_PARAM)?.trim();
  return token && TOKEN_PATTERN.test(token) ? token : undefined;
}

export function buildPublicResultUrl(token: string, baseUrl: string) {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Link publico invalido.");
  }
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set(RESULT_QUERY_PARAM, token);
  return url.toString();
}

export function createPublicResultToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

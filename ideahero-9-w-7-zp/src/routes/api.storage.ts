import {
  isPrototypeObjectKey,
  prototypeDownloadUrl,
  uploadPrototypeFile,
} from "../object-storage.server";

const MAX_MEDIA_BYTES = 650_000;
const MAX_DRAWING_BYTES = 2_000_000;
const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const audioTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function normalizedType(type: string) {
  return type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Use POST para enviar um arquivo." }, 405);
  }

  try {
    const formData = await request.formData();
    const roomId = String(formData.get("roomId") ?? "");
    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");

    if (!/^\d+$/.test(roomId)) {
      return json({ error: "A sala informada não é válida." }, 400);
    }
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Escolha um arquivo válido." }, 400);
    }
    if (kind !== "DRAWING" && kind !== "IMAGE" && kind !== "AUDIO") {
      return json({ error: "O tipo de registro não é válido." }, 400);
    }

    const type = normalizedType(file.type);
    const accepted = kind === "AUDIO" ? audioTypes : imageTypes;
    if (!accepted.has(type)) {
      return json({ error: "Este formato de arquivo não é compatível." }, 415);
    }

    const maximumSize =
      kind === "DRAWING" ? MAX_DRAWING_BYTES : MAX_MEDIA_BYTES;
    if (file.size > maximumSize) {
      return json(
        {
          error:
            kind === "DRAWING"
              ? "O desenho ficou grande demais para salvar."
              : "Use um arquivo de até 650 KB.",
        },
        413,
      );
    }

    const storedFile = new File([await file.arrayBuffer()], file.name, {
      type,
    });
    const key = await uploadPrototypeFile({ roomId, file: storedFile });
    return json({ key });
  } catch (error) {
    console.error("Prototype storage upload failed", error);
    return json(
      { error: "Não foi possível salvar o arquivo. Tente novamente." },
      502,
    );
  }
}

export async function loader({ request }: { request: Request }) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!isPrototypeObjectKey(key)) {
    return json({ error: "O arquivo solicitado não é válido." }, 400);
  }

  try {
    const url = await prototypeDownloadUrl(key);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, max-age=240",
      },
    });
  } catch (error) {
    console.error("Prototype storage download failed", error);
    return json({ error: "Não foi possível abrir o arquivo." }, 502);
  }
}

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const IDEA_HERO_PREFIX = "idea-hero/prototype";

function requiredSetting(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("O armazenamento de arquivos ainda não está configurado.");
  }
  return value;
}

function storageSettings() {
  const region = requiredSetting("OBJECT_STORAGE_REGION");
  const namespace = requiredSetting("OBJECT_STORAGE_NAMESPACE");
  const folder = requiredSetting("OBJECT_STORAGE_BUCKET").replace(/\/+$/, "");

  return {
    bucket: namespace,
    folder,
    client: new S3Client({
      region,
      endpoint: `https://compat.objectstorage.${region}.oraclecloud.com`,
      credentials: {
        accessKeyId: requiredSetting("OBJECT_STORAGE_ACCESS_KEY"),
        secretAccessKey: requiredSetting("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
      },
    }),
  };
}

function storageKey(key: string, folder: string) {
  return `${folder}/${key}`;
}

export function isPrototypeObjectKey(key: string) {
  return /^idea-hero\/prototype\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpe?g|png|webp|gif|mp3|wav|ogg|webm|m4a)$/i.test(
    key,
  );
}

function extensionFor(contentType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
  };
  const extension = extensions[contentType];
  if (!extension) throw new Error("Este formato de arquivo não é compatível.");
  return extension;
}

export async function uploadPrototypeFile({
  roomId,
  file,
}: {
  roomId: string;
  file: File;
}) {
  const { bucket, folder, client } = storageSettings();
  const key = `${IDEA_HERO_PREFIX}/${roomId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey(key, folder),
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );

  return key;
}

export async function prototypeDownloadUrl(key: string) {
  if (!isPrototypeObjectKey(key)) {
    throw new Error("O arquivo solicitado não é válido.");
  }
  const { bucket, folder, client } = storageSettings();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: storageKey(key, folder) }),
    { expiresIn: 60 * 5 },
  );
}

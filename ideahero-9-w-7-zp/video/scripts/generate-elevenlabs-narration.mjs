import {readFile, copyFile, mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(scriptDir, '..');
const appDir = path.resolve(videoDir, '..');
const keyPath = path.join(videoDir, '.elevenlabs-key');
const textPath = path.join(videoDir, 'narration', 'pt-BR-vertical.txt');
const outputDir = path.join(appDir, 'public', 'video');
const mp3Path = path.join(outputDir, 'narration-vertical-elevenlabs.mp3');
const wavPath = path.join(outputDir, 'narration-vertical.wav');
const omniVoiceBackup = path.join(outputDir, 'narration-vertical-omnivoice.wav');

// Adam: premade, deep and clear. It performs well as a narrator with Multilingual v2.
const voiceId = process.argv[2] || 'pNInz6obpgDQGcFmaJgB';
const apiKey = (await readFile(keyPath, 'utf8')).trim();
const text = (await readFile(textPath, 'utf8')).trim();

if (!apiKey) {
  throw new Error(`ElevenLabs API key is empty: ${keyPath}`);
}

await mkdir(outputDir, {recursive: true});

const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      language_code: 'pt',
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.78,
        style: 0.32,
        use_speaker_boost: true,
        speed: 0.9,
      },
    }),
  },
);

if (!response.ok) {
  const detail = await response.text();
  throw new Error(`ElevenLabs request failed (${response.status}): ${detail}`);
}

await writeFile(mp3Path, Buffer.from(await response.arrayBuffer()));

if (existsSync(wavPath) && !existsSync(omniVoiceBackup)) {
  await copyFile(wavPath, omniVoiceBackup);
}

const ffmpeg = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-i', mp3Path,
    '-filter:a', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '48000',
    '-ac', '1',
    wavPath,
  ],
  {stdio: 'inherit'},
);

if (ffmpeg.status !== 0) {
  throw new Error(`ffmpeg failed with exit code ${ffmpeg.status}`);
}

console.log(`ElevenLabs narration ready: ${wavPath}`);
console.log(`Voice ID: ${voiceId}`);

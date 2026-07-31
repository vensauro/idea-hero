import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(scriptDir, '..');
const appDir = path.resolve(videoDir, '..');
const rootEnv = path.join(appDir, '.env');
const textPath = path.join(videoDir, 'narration', 'pt-BR-vertical.txt');
const outputDir = path.join(appDir, 'public', 'video');
const pcmPath = path.join(outputDir, 'narration-vertical-gemini.pcm');
const wavPath = path.join(outputDir, 'narration-vertical-gemini.wav');

const model = 'gemini-3.1-flash-tts-preview';
const voiceName = 'Sulafat'; // Warm, appropriate for an inviting narrator.

const env = await readFile(rootEnv, 'utf8');
const keyLine = env.split(/\r?\n/).find((line) => line.startsWith('GEMINI_API_KEY='));
const apiKey = keyLine?.slice('GEMINI_API_KEY='.length).trim();
const transcript = (await readFile(textPath, 'utf8')).trim();

if (!apiKey) {
  throw new Error(`GEMINI_API_KEY is missing from ${rootEnv}`);
}

const promptFor = (spokenText) => `Generate spoken audio only. Do not read the headings, directions, or labels below.

# AUDIO PROFILE
A warm, confident Brazilian Portuguese narrator introducing a collaborative creativity game.

# DIRECTOR'S NOTES
Speak Brazilian Portuguese with clear articulation and an inviting, professional tone. Use a calm medium-slow pace. Let the ideas breathe: make a short natural pause after sentences and a slightly longer pause between paragraphs. Sound curious during the journey of the game, add a touch of wonder on “uma surpresa”, and end with an encouraging invitation. Do not rush. Do not add or omit words.

# TRANSCRIPT TO SPEAK VERBATIM
${spokenText}`;

await mkdir(outputDir, {recursive: true});

const synthesize = async (spokenText) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{parts: [{text: promptFor(spokenText)}]}],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {voiceName},
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini TTS request failed (${response.status}): ${await response.text()}`);
  }

  const result = await response.json();
  const inlineData = result.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) {
    throw new Error('Gemini TTS returned no inline audio data.');
  }
  return Buffer.from(inlineData.data, 'base64');
};

const [mainTranscript, closingTranscript] = transcript.split(/\n\s*\n(?=Agora é com você\.)/);
if (!mainTranscript || !closingTranscript) {
  throw new Error('Could not split the narration before the call to action.');
}

const mainAudio = await synthesize(mainTranscript);
const closingAudio = await synthesize(closingTranscript);
const pause = Buffer.alloc(24000 * 2 * 0.72); // 720ms in 24kHz, 16-bit mono PCM.
await writeFile(pcmPath, Buffer.concat([mainAudio, pause, closingAudio]));

const ffmpeg = spawnSync(
  'ffmpeg',
  [
    '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcmPath,
    '-filter:a', 'highpass=f=75,equalizer=f=190:t=q:w=1.1:g=-1.8,equalizer=f=3200:t=q:w=1.0:g=1.7,deesser=i=0.12:m=0.4:f=0.55,acompressor=threshold=0.12:ratio=2.2:attack=18:release=220:makeup=1.25:knee=3,loudnorm=I=-16:TP=-1.5:LRA=8',
    '-ar', '48000', '-ac', '1', wavPath,
  ],
  {stdio: 'inherit'},
);

if (ffmpeg.status !== 0) {
  throw new Error(`ffmpeg failed with exit code ${ffmpeg.status}`);
}

console.log(`Gemini TTS narration ready: ${wavPath}`);
console.log(`Model: ${model}; voice: ${voiceName}`);

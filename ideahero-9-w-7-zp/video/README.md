# Idea Hero tutorial video

Code-first 75-second tutorial built with Remotion. It uses the same logo, card
images, colors, and Palmer Lake font as the game.

The project contains two compositions:

- `IdeaHeroTutorial`: horizontal 1920x1080.
- `IdeaHeroVertical`: vertical 1080x1920, approximately 99 seconds, with one
  visual focus at a time and scene changes aligned to the narration.

## Generate narration with ElevenLabs

The restricted API key is stored in `video/.elevenlabs-key`, which is ignored by
Git. Generate the vertical narrator track with:

```bash
cd video
npm run narration:elevenlabs
```

The command uses Eleven Multilingual v2 with a slower, expressive narrator
preset. It backs up the original local voice to
`public/video/narration-vertical-omnivoice.wav` and writes the active track to
`public/video/narration-vertical.wav`.

## Generate narration with Gemini TTS

The project already reads `GEMINI_API_KEY` from the root `.env` file. Generate a
separate candidate track with:

```bash
cd video
npm run narration:gemini
```

The Gemini 3.1 Flash TTS narrator is directed to use Brazilian Portuguese,
clear diction, a measured pace, and natural breathing pauses. It writes to
`public/video/narration-vertical-gemini.wav` and does not replace the active
track until it has been reviewed and synchronized.

## Generate narration with local OmniVoice

From WSL:

```bash
cd /home/ivensauro/claraidea/idea-hero/ideahero-9-w-7-zp
bash video/scripts/generate-narration.sh
```

For the vertical version and its updated script:

```bash
bash video/scripts/generate-vertical-narration.sh
```

The default voice is designed locally in Portuguese. To clone a voice, provide a
clean reference WAV and its exact transcript:

```bash
OMNIVOICE_REF_WAV=/absolute/path/reference.wav \
OMNIVOICE_REF_TEXT=/absolute/path/reference.txt \
bash video/scripts/generate-narration.sh
```

Replace the final command with `generate-vertical-narration.sh` to clone the
voice in the vertical version.

To keep the original OmniVoice identity and add a light broadcast-style finish:

```bash
cd video
npm run narration:polish:omnivoice
```

The finish adds a high-pass filter, gentle presence EQ, de-essing, compression,
and streaming loudness normalization. The voice design can also be changed
within OmniVoice's supported vocabulary by setting `OMNIVOICE_INSTRUCT` when
regenerating.

Only clone a voice with the speaker's permission.

## Preview and render

```bash
cd video
npm install
npm run studio
npm run still
npm run render
npm run still:vertical
npm run render:vertical
```

Outputs are written to `video/out/`.

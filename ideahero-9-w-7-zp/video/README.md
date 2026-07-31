# Idea Hero tutorial video

Code-first 75-second tutorial built with Remotion. It uses the same logo, card
images, colors, and Palmer Lake font as the game.

## Generate narration with local OmniVoice

From WSL:

```bash
cd /home/ivensauro/claraidea/idea-hero/ideahero-9-w-7-zp
bash video/scripts/generate-narration.sh
```

The default voice is designed locally in Portuguese. To clone a voice, provide a
clean reference WAV and its exact transcript:

```bash
OMNIVOICE_REF_WAV=/absolute/path/reference.wav \
OMNIVOICE_REF_TEXT=/absolute/path/reference.txt \
bash video/scripts/generate-narration.sh
```

Only clone a voice with the speaker's permission.

## Preview and render

```bash
cd video
npm install
npm run studio
npm run still
npm run render
```

Outputs are written to `video/out/`.

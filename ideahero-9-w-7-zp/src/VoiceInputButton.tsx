import { useEffect, useRef, useState } from "react";
import "./voice-input.css";

export type VoiceInputResult = {
  transcript: string;
  summary: string;
};

type VoiceTarget = "contribution" | "journey-summary";
type VoiceStatus = "idle" | "recording" | "transcribing" | "error";

type VoiceInputButtonProps = {
  stage: string;
  target: VoiceTarget;
  onResult: (result: VoiceInputResult) => void;
  disabled?: boolean;
};

const MAX_RECORDING_MS = 45_000;
const preferredAudioTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function preferredMimeType() {
  return preferredAudioTypes.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

export function VoiceInputButton({
  stage,
  target,
  onResult,
  disabled = false,
}: VoiceInputButtonProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearStopTimer() {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  useEffect(
    () => () => {
      clearStopTimer();
      stopRecording();
      releaseStream();
    },
    [],
  );

  async function transcribe(audio: Blob) {
    if (audio.size === 0) {
      setStatus("error");
      setMessage("Nenhuma fala foi gravada. Tente de novo.");
      return;
    }

    setStatus("transcribing");
    setMessage("Transformando sua voz em texto...");
    try {
      const formData = new FormData();
      formData.append("audio", audio, "idea-hero-voice.webm");
      formData.append("stage", stage);
      formData.append("target", target);

      const response = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });
      const responseText = await response.text();
      let body: Partial<VoiceInputResult> & { error?: string } = {};

      if (responseText.trim()) {
        try {
          body = JSON.parse(responseText) as Partial<VoiceInputResult> & {
            error?: string;
          };
        } catch {
          throw new Error("O servico de voz respondeu em um formato invalido.");
        }
      }

      if (!response.ok) {
        throw new Error(
          body.error ?? "O servico de voz respondeu sem conteudo.",
        );
      }

      const transcript = body.transcript?.trim() ?? "";
      const summary = body.summary?.trim() ?? "";
      if (!transcript && !summary) {
        throw new Error("Nao encontramos uma fala compreensivel na gravacao.");
      }

      onResult({ transcript, summary });
      setStatus("idle");
      setMessage("Transcricao pronta. Revise o texto antes de salvar.");
    } catch (caught) {
      setStatus("error");
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel transcrever a gravacao.",
      );
    }
  }

  async function startRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("error");
      setMessage("Este navegador nao oferece gravacao por voz.");
      return;
    }

    try {
      setMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        clearStopTimer();
        releaseStream();
        setStatus("error");
        setMessage("A gravacao foi interrompida. Tente novamente.");
      };
      recorder.onstop = () => {
        clearStopTimer();
        releaseStream();
        recorderRef.current = null;
        void transcribe(
          new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
        );
      };

      recorder.start();
      setStatus("recording");
      setMessage("Ouvindo... toque novamente quando terminar.");
      stopTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (caught) {
      setStatus("error");
      setMessage(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Permita o uso do microfone para falar sua ideia."
          : "Nao foi possivel iniciar a gravacao.",
      );
    }
  }

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  return (
    <div className="voice-input" aria-live="polite">
      <button
        type="button"
        className={`voice-input-button ${recording ? "is-recording" : ""}`}
        aria-pressed={recording}
        disabled={disabled || transcribing}
        onClick={recording ? stopRecording : () => void startRecording()}
      >
        <span aria-hidden="true">{recording ? "\u25cf" : "REC"}</span>
        {recording
          ? "Parar gravacao"
          : transcribing
            ? "Transcrevendo..."
            : "Falar minha ideia"}
      </button>
      {message && (
        <small className={status === "error" ? "is-error" : ""}>
          {message}
        </small>
      )}
    </div>
  );
}

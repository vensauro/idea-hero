import { useState, type FormEvent } from "react";
import type { AiStoryFeedback, CollaborativeCrdtDoc, Player, Room, VisibleContribution } from "../module_bindings/types";
import { VoiceInputButton, type VoiceInputResult } from "../VoiceInputButton";
import { CollaborativeCrdtTextInput } from "./CollaborativeCrdtTextInput";

const EMOJI_REACTIONS = [
  { emoji: "🤯", label: "Épico", value: "🤯 Épico" },
  { emoji: "🎨", label: "Criativo", value: "🎨 Criativo" },
  { emoji: "💡", label: "Interessante", value: "💡 Interessante" },
  { emoji: "😐", label: "Razoável", value: "😐 Razoável" },
  { emoji: "💩", label: "Fraco", value: "💩 Fraco" },
] as const;

const AVATAR_GLYPHS: Record<string, string> = {
  seedling: "🌱",
  comet: "☄️",
  prism: "🔮",
  whale: "🐋",
  owl: "🦉",
  fox: "🦊",
};

function sameIdentity(
  left?: { toHexString?: () => string } | null,
  right?: { toHexString?: () => string } | null,
) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (
    typeof left.toHexString !== "function" ||
    typeof right.toHexString !== "function"
  ) {
    return false;
  }
  return left.toHexString() === right.toHexString();
}

type FinalStageValidationAndCustomEndingProps = {
  room: Room;
  currentPlayer: Player;
  players: readonly Player[];
  aiStoryFeedbacks: readonly AiStoryFeedback[];
  contributions: readonly VisibleContribution[];
  crdtDocs: readonly CollaborativeCrdtDoc[];
  onSubmitAiFeedback: (
    rating: number,
    emojiReaction: string,
    customEnding: string,
  ) => Promise<void>;
  onSubmitContribution: (content: string) => Promise<void>;
  onSubmitCrdtUpdate: (crdtStateJson: string, content: string) => Promise<void>;
  actionPending: boolean;
};

export function FinalStageValidationAndCustomEnding({
  room,
  currentPlayer,
  players,
  aiStoryFeedbacks,
  contributions,
  crdtDocs,
  onSubmitAiFeedback,
  onSubmitContribution,
  onSubmitCrdtUpdate,
  actionPending,
}: FinalStageValidationAndCustomEndingProps) {
  const myAiFeedback = aiStoryFeedbacks.find((item) =>
    sameIdentity(item.authorIdentity, currentPlayer.identity),
  );

  const [selectedRating, setSelectedRating] = useState<number>(
    myAiFeedback?.rating ?? 5,
  );
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    myAiFeedback?.emojiReaction || "🤯 Épico",
  );
  const [feedbackSavedNotice, setFeedbackSavedNotice] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [customEndingText, setCustomEndingText] = useState(
    myAiFeedback?.customEnding || "",
  );
  const [endingNotice, setEndingNotice] = useState("");
  const [endingError, setEndingError] = useState("");
  const [endingSubmitting, setEndingSubmitting] = useState(false);

  // Custom ending contributions for stage FINAL
  const finalContributions = contributions.filter(
    (item) => item.stage === "FINAL",
  );

  async function handleAiFeedbackSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackSavedNotice("");
    setFeedbackSubmitting(true);
    try {
      await onSubmitAiFeedback(selectedRating, selectedEmoji, customEndingText);
      setFeedbackSavedNotice("✓ Sua avaliação da IA foi salva!");
    } catch (caught) {
      setFeedbackError(
        caught instanceof Error ? caught.message : "Falha ao salvar feedback.",
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function handleCustomEndingSubmit(e: FormEvent) {
    e.preventDefault();
    const text = customEndingText.trim();
    if (!text) {
      setEndingError("Escreva ou grave um texto para o seu desfecho.");
      return;
    }
    setEndingError("");
    setEndingNotice("");
    setEndingSubmitting(true);
    try {
      await onSubmitContribution(text);
      await onSubmitAiFeedback(selectedRating, selectedEmoji, text);
      setEndingNotice("✓ Seu desfecho foi gravado e compartilhado com a equipe!");
    } catch (caught) {
      setEndingError(
        caught instanceof Error ? caught.message : "Falha ao salvar desfecho.",
      );
    } finally {
      setEndingSubmitting(false);
    }
  }

  function handleVoiceResult(result: VoiceInputResult) {
    const text = (result.summary || result.transcript).trim();
    if (text) {
      setCustomEndingText((prev) => (prev ? `${prev} ${text}` : text));
    }
  }

  return (
    <div className="final-stage-validation-container" style={{ marginTop: "1.5rem" }}>
      {/* SECTION 1: AI CREATIVITY VALIDATION & EMOJI FEEDBACK */}
      <section className="feedback-editor ai-feedback-section" aria-labelledby="ai-feedback-title">
        <div className="feedback-heading">
          <div>
            <p className="kicker">Validação da IA</p>
            <h2 id="ai-feedback-title">O que você achou da criatividade da IA?</h2>
          </div>
          <span>⭐️ Avaliação</span>
        </div>

        <form onSubmit={handleAiFeedbackSubmit}>
          {/* STAR RATING */}
          <div className="nps-container">
            <label className="nps-label">Nota de Criatividade (1 a 5 estrelas)</label>
            <div className="star-buttons" role="radiogroup" aria-label="Nota da IA">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-chip ${selectedRating >= star ? "is-active" : ""}`}
                  onClick={() => setSelectedRating(star)}
                  aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
              <span className="star-rating-label">{selectedRating} / 5</span>
            </div>
          </div>

          {/* EMOJI REACTION CHIPS */}
          <div className="nps-container">
            <label className="nps-label">Como você define este desfecho?</label>
            <div className="emoji-chips" role="radiogroup" aria-label="Veredito sobre o desfecho">
              {EMOJI_REACTIONS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`emoji-chip ${selectedEmoji === item.value ? "is-selected" : ""}`}
                  onClick={() => setSelectedEmoji(item.value)}
                  aria-pressed={selectedEmoji === item.value}
                >
                  <span className="chip-emoji">{item.emoji}</span>
                  <span className="chip-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="feedback-footer" style={{ marginTop: "0.5rem" }}>
            {feedbackSavedNotice && (
              <small className="success-message">{feedbackSavedNotice}</small>
            )}
            {feedbackError && <small className="error-message">{feedbackError}</small>}
            <button
              type="submit"
              className="primary-button"
              disabled={feedbackSubmitting || actionPending}
            >
              {feedbackSubmitting ? "Salvando..." : myAiFeedback ? "Atualizar Avaliação da IA" : "Enviar Avaliação da IA"}
            </button>
          </div>
        </form>

        {/* SUMMARY OF ROOM FEEDBACKS */}
        {aiStoryFeedbacks.length > 0 && (
          <div className="room-ai-ratings-summary">
            <h4>Avaliações da Sala ({aiStoryFeedbacks.length})</h4>
            <div className="ratings-list">
              {aiStoryFeedbacks.map((fb) => {
                const author = players.find((p) =>
                  sameIdentity(p.identity, fb.authorIdentity),
                );
                return (
                  <div key={fb.id.toString()} className="rating-item">
                    <span className="rating-author">
                      {AVATAR_GLYPHS[author?.avatarId ?? "seedling"]} {author?.displayName ?? "Jogador"}
                    </span>
                    <span className="rating-emoji">{fb.emojiReaction}</span>
                    <span className="rating-stars">{"★".repeat(fb.rating)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: REAL-TIME CRDT COLLABORATIVE TEXT INPUT */}
      <CollaborativeCrdtTextInput
        room={room}
        stage="FINAL"
        currentPlayer={currentPlayer}
        players={players}
        crdtDocs={crdtDocs}
        onSubmitCrdtUpdate={onSubmitCrdtUpdate}
        disabled={actionPending}
        label="✍️ Texto Colaborativo em Tempo Real (CRDT)"
        placeholder="Escreva ou edite a história aqui. Qualquer pessoa na sala pode digitar ao mesmo tempo sem conflitos!"
      />

      {/* SECTION 3: HUMAN INTELLIGENCE CHALLENGE (VOICE & TEXT CUSTOM ENDING) */}
      <section className="feedback-editor human-challenge-section" aria-labelledby="human-challenge-title">
        <div className="feedback-heading">
          <div>
            <p className="kicker">Desafio da Inteligência Humana</p>
            <h2 id="human-challenge-title">Agora é a sua vez! Crie o SEU desfecho</h2>
          </div>
          <span>🧠 Desafio Final</span>
        </div>

        <p className="challenge-prompt">
          A IA fez a versão dela, mas nada substitui a criatividade humana! Use a sua própria inteligência para gravar por voz ou escrever o final definitivo da história.
        </p>

        <form onSubmit={handleCustomEndingSubmit}>
          <div className="voice-recorder-wrapper">
            <label className="nps-label">Gravador de Voz & Texto</label>
            <div className="voice-recorder-controls">
              <VoiceInputButton
                stage="FINAL"
                target="contribution"
                idleLabel="🎙️ Falar meu desfecho por voz"
                onResult={handleVoiceResult}
                disabled={endingSubmitting || actionPending}
              />
            </div>
          </div>

          <label htmlFor="custom-ending-input" className="nps-label" style={{ marginTop: "0.75rem" }}>
            Seu desfecho da jornada
          </label>
          <textarea
            id="custom-ending-input"
            rows={4}
            className="custom-ending-textarea"
            placeholder="Neste final surpreendente, nossa equipe conseguiu..."
            value={customEndingText}
            onChange={(e) => setCustomEndingText(e.target.value)}
            disabled={endingSubmitting || actionPending}
          />

          <div className="feedback-footer" style={{ marginTop: "0.5rem" }}>
            {endingNotice && <small className="success-message">{endingNotice}</small>}
            {endingError && <small className="error-message">{endingError}</small>}
            <button
              type="submit"
              className="primary-button"
              disabled={endingSubmitting || actionPending}
            >
              {endingSubmitting ? "Gravando desfecho..." : "Gravar & Compartilhar Meu Desfecho"}
            </button>
          </div>
        </form>

        {/* GALLERY OF PLAYERS' CUSTOM ENDINGS */}
        {(finalContributions.length > 0 || aiStoryFeedbacks.some((f) => f.customEnding)) && (
          <div className="custom-endings-gallery">
            <h4>✨ Desfechos da Inteligência Humana da Sala</h4>
            <div className="endings-grid">
              {players.map((player) => {
                const playerFeedback = aiStoryFeedbacks.find((fb) =>
                  sameIdentity(fb.authorIdentity, player.identity),
                );
                const playerContribs = finalContributions.filter((c) =>
                  sameIdentity(c.authorIdentity, player.identity),
                );
                const endingContent =
                  playerFeedback?.customEnding ||
                  playerContribs[playerContribs.length - 1]?.content;

                if (!endingContent) return null;

                return (
                  <article key={player.id.toString()} className="custom-ending-card">
                    <header className="card-author">
                      <b aria-hidden="true">{AVATAR_GLYPHS[player.avatarId] ?? "✦"}</b>
                      <strong>{player.displayName}</strong>
                      {playerFeedback?.emojiReaction && (
                        <span className="author-reaction">{playerFeedback.emojiReaction}</span>
                      )}
                    </header>
                    <p className="card-text">“{endingContent}”</p>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

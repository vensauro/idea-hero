import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { CollaborativeCrdtDoc, Player, Room } from "../module_bindings/types";
import {
  applyTextDiffToCRDT,
  createCRDTState,
  mergeCRDTStates,
  renderCRDTText,
  type CRDTDocState,
} from "../crdt/text-crdt";

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

type CollaborativeCrdtTextInputProps = {
  room: Room;
  stage: string;
  currentPlayer: Player;
  players: readonly Player[];
  crdtDocs: readonly CollaborativeCrdtDoc[];
  onSubmitCrdtUpdate: (crdtStateJson: string, content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
};

export function CollaborativeCrdtTextInput({
  room,
  stage,
  currentPlayer,
  players,
  crdtDocs,
  onSubmitCrdtUpdate,
  disabled = false,
  placeholder = "Digite aqui... Todos na sala podem editar simultaneamente em tempo real!",
  label = "✍️ Texto Colaborativo em Tempo Real (CRDT)",
}: CollaborativeCrdtTextInputProps) {
  const siteId = useMemo(
    () => currentPlayer.identity.toHexString?.() || currentPlayer.id.toString(),
    [currentPlayer],
  );

  const docRecord = crdtDocs.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );

  // Local CRDT State
  const [localCrdtState, setLocalCrdtState] = useState<CRDTDocState>(() =>
    createCRDTState(siteId),
  );

  const isDebouncingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Synchronize remote CRDT state changes
  useEffect(() => {
    if (!docRecord?.crdtStateJson) return;
    try {
      const remoteState = JSON.parse(docRecord.crdtStateJson) as CRDTDocState;
      setLocalCrdtState((prev) => mergeCRDTStates(prev, remoteState));
    } catch {
      // Fallback if JSON parse fails
    }
  }, [docRecord?.crdtStateJson, docRecord?.clock]);

  const currentText = renderCRDTText(localCrdtState);

  const lastAuthor = docRecord?.lastAuthorIdentity
    ? players.find((p) => sameIdentity(p.identity, docRecord.lastAuthorIdentity))
    : undefined;

  async function syncCrdtUpdate(nextState: CRDTDocState) {
    const text = renderCRDTText(nextState);
    const jsonState = JSON.stringify(nextState);
    try {
      await onSubmitCrdtUpdate(jsonState, text);
    } catch (err) {
      console.error("Failed to sync CRDT update:", err);
    }
  }

  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const nextText = e.target.value;
    const updatedState = applyTextDiffToCRDT(localCrdtState, nextText, siteId);
    setLocalCrdtState(updatedState);

    // Debounce network dispatch to prevent spamming transactions
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    isDebouncingRef.current = true;
    debounceTimerRef.current = window.setTimeout(() => {
      isDebouncingRef.current = false;
      void syncCrdtUpdate(updatedState);
    }, 200);
  }

  return (
    <section className="feedback-editor crdt-text-section" aria-labelledby="crdt-title">
      <div className="feedback-heading">
        <div>
          <p className="kicker">Algoritmo CRDT · Tempo Real</p>
          <h2 id="crdt-title">{label}</h2>
        </div>
        <span>⚡ Convergência Livre de Conflito</span>
      </div>

      <p className="crdt-info-note">
        Qualquer pessoa na sala pode editar este texto ao mesmo tempo. As alterações são sincronizadas usando <strong>CRDT (Conflict-free Replicated Data Type)</strong> para convergência automática sem perda de dados.
      </p>

      <div className="crdt-input-wrapper">
        <textarea
          rows={5}
          className="custom-ending-textarea crdt-textarea"
          placeholder={placeholder}
          value={currentText}
          onChange={handleTextChange}
          disabled={disabled}
        />
      </div>

      <div className="crdt-status-bar">
        <span className="crdt-badge">
          🟢 CRDT Ativo ({Object.keys(localCrdtState.chars).length} nós)
        </span>
        {lastAuthor && (
          <span className="crdt-last-editor">
            Última edição: <strong>{lastAuthor.displayName}</strong>
          </span>
        )}
      </div>
    </section>
  );
}

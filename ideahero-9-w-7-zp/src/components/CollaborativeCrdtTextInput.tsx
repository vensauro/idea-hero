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
  initialText?: string;
  disabled?: boolean;
  placeholder?: string;
  onTextChange?: (text: string) => void;
};

export function CollaborativeCrdtTextInput({
  room,
  stage,
  currentPlayer,
  players,
  crdtDocs,
  onSubmitCrdtUpdate,
  initialText = "",
  disabled = false,
  placeholder = "Reescreva o desfecho da jornada aqui...",
  onTextChange,
}: CollaborativeCrdtTextInputProps) {
  const siteId = useMemo(
    () => currentPlayer.identity.toHexString?.() || currentPlayer.id.toString(),
    [currentPlayer],
  );

  const docRecord = crdtDocs.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Local CRDT State
  const [localCrdtState, setLocalCrdtState] = useState<CRDTDocState>(() =>
    createCRDTState(siteId),
  );

  const initializedRef = useRef(false);

  // Sync remote CRDT state changes instantly while preserving cursor selection
  useEffect(() => {
    if (!docRecord?.crdtStateJson) return;
    try {
      const remoteState = JSON.parse(docRecord.crdtStateJson) as CRDTDocState;

      // Record cursor position if active textarea is focused
      const textarea = textareaRef.current;
      const isFocused = document.activeElement === textarea;
      const selStart = textarea?.selectionStart;
      const selEnd = textarea?.selectionEnd;

      setLocalCrdtState((prev) => {
        const merged = mergeCRDTStates(prev, remoteState);
        return merged;
      });
      initializedRef.current = true;

      // Restore cursor position after state merge render
      if (isFocused && textarea && selStart !== undefined && selEnd !== undefined) {
        requestAnimationFrame(() => {
          textarea.setSelectionRange(selStart, selEnd);
        });
      }
    } catch {
      // Fallback
    }
  }, [docRecord?.crdtStateJson, docRecord?.clock]);

  // Pre-populate CRDT with initial AI story if database record does not exist yet
  useEffect(() => {
    if (initializedRef.current || docRecord) return;
    if (!initialText || initialText.trim().length === 0) return;

    initializedRef.current = true;
    const initState = applyTextDiffToCRDT(
      createCRDTState("ai-init"),
      initialText.trim(),
      "ai-init",
    );
    setLocalCrdtState(initState);
    void syncCrdtUpdate(initState);
  }, [initialText, docRecord]);

  const currentText = renderCRDTText(localCrdtState);

  // Notify parent component of text state
  useEffect(() => {
    onTextChange?.(currentText);
  }, [currentText, onTextChange]);

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
    // Instant real-time transmission on every keystroke
    void syncCrdtUpdate(updatedState);
  }

  return (
    <div className="crdt-editor-container">
      <div className="crdt-input-wrapper">
        <textarea
          ref={textareaRef}
          rows={6}
          className="custom-ending-textarea crdt-textarea"
          placeholder={placeholder}
          value={currentText}
          onChange={handleTextChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

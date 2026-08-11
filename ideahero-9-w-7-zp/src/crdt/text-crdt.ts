export type CRDTChar = {
  id: string;
  char: string;
  parentId: string;
  clock: number;
  siteId: string;
  deleted: boolean;
};

export type CRDTDocState = {
  chars: Record<string, CRDTChar>;
  siteId: string;
  clock: number;
};

/**
 * Creates an empty CRDT document state for a site.
 */
export function createCRDTState(siteId: string): CRDTDocState {
  return {
    chars: {},
    siteId,
    clock: 0,
  };
}

/**
 * Merges two CRDT states deterministically using RGA / LWW state-based CRDT rules.
 */
export function mergeCRDTStates(
  local: CRDTDocState,
  remote: CRDTDocState,
): CRDTDocState {
  const mergedChars: Record<string, CRDTChar> = { ...local.chars };

  for (const [id, remoteChar] of Object.entries(remote.chars)) {
    const existing = mergedChars[id];
    if (!existing) {
      mergedChars[id] = { ...remoteChar };
    } else {
      // Tombstone & clock convergence
      mergedChars[id] = {
        ...existing,
        deleted: existing.deleted || remoteChar.deleted,
        clock: Math.max(existing.clock, remoteChar.clock),
      };
    }
  }

  return {
    chars: mergedChars,
    siteId: local.siteId,
    clock: Math.max(local.clock, remote.clock),
  };
}

/**
 * Renders non-deleted characters from CRDT state into a plain text string.
 */
export function renderCRDTText(doc: CRDTDocState): string {
  const charList = Object.values(doc.chars);
  if (charList.length === 0) return "";

  // Group children by parentId
  const childrenMap: Record<string, CRDTChar[]> = {};
  for (const item of charList) {
    const p = item.parentId || "";
    if (!childrenMap[p]) childrenMap[p] = [];
    childrenMap[p].push(item);
  }

  // Sort siblings deterministically (higher clock first, then lexicographical siteId)
  for (const parentId of Object.keys(childrenMap)) {
    childrenMap[parentId].sort((a, b) => {
      if (a.clock !== b.clock) return b.clock - a.clock;
      return a.siteId.localeCompare(b.siteId);
    });
  }

  // Traversal (Pre-order RGA tree traversal)
  const result: string[] = [];
  function traverse(currentId: string) {
    const children = childrenMap[currentId] || [];
    for (const child of children) {
      if (!child.deleted) {
        result.push(child.char);
      }
      traverse(child.id);
    }
  }

  traverse("");
  return result.join("");
}

/**
 * Applies a text change (new text vs rendered CRDT text) and returns updated CRDT state.
 */
export function applyTextDiffToCRDT(
  currentDoc: CRDTDocState,
  newText: string,
  siteId: string,
): CRDTDocState {
  const currentText = renderCRDTText(currentDoc);
  if (currentText === newText) return currentDoc;

  // Re-build sequence of active characters
  const charList = Object.values(currentDoc.chars);
  const childrenMap: Record<string, CRDTChar[]> = {};
  for (const item of charList) {
    const p = item.parentId || "";
    if (!childrenMap[p]) childrenMap[p] = [];
    childrenMap[p].push(item);
  }
  for (const parentId of Object.keys(childrenMap)) {
    childrenMap[parentId].sort((a, b) => {
      if (a.clock !== b.clock) return b.clock - a.clock;
      return a.siteId.localeCompare(b.siteId);
    });
  }

  const activeChars: CRDTChar[] = [];
  function traverse(currentId: string) {
    const children = childrenMap[currentId] || [];
    for (const child of children) {
      if (!child.deleted) {
        activeChars.push(child);
      }
      traverse(child.id);
    }
  }
  traverse("");

  // Diffing algorithm (prefix & suffix matching)
  let prefixLen = 0;
  while (
    prefixLen < currentText.length &&
    prefixLen < newText.length &&
    currentText[prefixLen] === newText[prefixLen]
  ) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < currentText.length - prefixLen &&
    suffixLen < newText.length - prefixLen &&
    currentText[currentText.length - 1 - suffixLen] ===
      newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const deletedRangeCount = activeChars.length - prefixLen - suffixLen;
  const insertedText = newText.slice(prefixLen, newText.length - suffixLen);

  const updatedChars = { ...currentDoc.chars };
  let clock = currentDoc.clock;

  // Mark deleted active characters as deleted
  for (let i = 0; i < deletedRangeCount; i++) {
    const target = activeChars[prefixLen + i];
    if (target && updatedChars[target.id]) {
      updatedChars[target.id] = {
        ...updatedChars[target.id],
        deleted: true,
        clock: ++clock,
      };
    }
  }

  // Insert new characters
  let lastParentId =
    prefixLen > 0 && activeChars[prefixLen - 1]
      ? activeChars[prefixLen - 1].id
      : "";
  for (let i = 0; i < insertedText.length; i++) {
    const charVal = insertedText[i];
    clock++;
    const randomPart = siteId === "ai-init" ? "init" : Math.random().toString(36).slice(2, 7);
    const newCharId = `${siteId}:${clock}:${randomPart}`;
    const newChar: CRDTChar = {
      id: newCharId,
      char: charVal,
      parentId: lastParentId,
      clock,
      siteId,
      deleted: false,
    };
    updatedChars[newCharId] = newChar;
    lastParentId = newCharId;
  }

  return {
    chars: updatedChars,
    siteId,
    clock,
  };
}

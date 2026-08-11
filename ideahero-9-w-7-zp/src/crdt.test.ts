import { describe, expect, it } from "vitest";
import {
  applyTextDiffToCRDT,
  createCRDTState,
  mergeCRDTStates,
  renderCRDTText,
} from "./crdt/text-crdt";

describe("RGA Text CRDT Engine", () => {
  it("creates empty CRDT state and renders empty string", () => {
    const doc = createCRDTState("site-A");
    expect(renderCRDTText(doc)).toBe("");
  });

  it("applies single character insertion and renders correctly", () => {
    let doc = createCRDTState("site-A");
    doc = applyTextDiffToCRDT(doc, "Hello", "site-A");
    expect(renderCRDTText(doc)).toBe("Hello");
  });

  it("applies text deletion and insertion diffs", () => {
    let doc = createCRDTState("site-A");
    doc = applyTextDiffToCRDT(doc, "Hello World", "site-A");
    expect(renderCRDTText(doc)).toBe("Hello World");

    doc = applyTextDiffToCRDT(doc, "Hello CRDT World", "site-A");
    expect(renderCRDTText(doc)).toBe("Hello CRDT World");

    doc = applyTextDiffToCRDT(doc, "Hello CRDT", "site-A");
    expect(renderCRDTText(doc)).toBe("Hello CRDT");
  });

  it("converges deterministically when merging two site edits (Commutative & Associative CRDT property)", () => {
    // Initial shared document
    const base = applyTextDiffToCRDT(createCRDTState("site-A"), "Idea", "site-A");

    // Site A edits: "Idea Hero"
    const siteA = applyTextDiffToCRDT(base, "Idea Hero", "site-A");

    // Site B edits: "Idea World"
    const siteB = applyTextDiffToCRDT(
      { ...base, siteId: "site-B" },
      "Idea World",
      "site-B",
    );

    // Merge A into B, and B into A
    const mergedAB = mergeCRDTStates(siteA, siteB);
    const mergedBA = mergeCRDTStates(siteB, siteA);

    const textAB = renderCRDTText(mergedAB);
    const textBA = renderCRDTText(mergedBA);

    // Both clients must converge to the EXACT same text string!
    expect(textAB).toBe(textBA);
    expect(textAB).toContain("Idea");
  });
});

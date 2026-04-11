import { describe, expect, it } from "vitest";
import { parseInlineMarkerBlock } from "../src/parser/inlineStore";

const NOTE_SINGLE = `# Adventure Log

Some intro text.

\`\`\`zoommap
image: assets/world.webp
storage: note
id: map-1
\`\`\`

Other prose after the map.

%%
ZOOMMAP-DATA id=map-1
{
  "layers": [{ "id": "default", "name": "Default", "visible": true }],
  "markers": [
    { "id": "m_tavern", "x": 0.5, "y": 0.3, "layer": "default", "tooltip": "Tavern" }
  ]
}
/ZOOMMAP-DATA
%%
`;

const NOTE_MULTI = `# Two Maps

\`\`\`zoommap
storage: note
id: map-a
\`\`\`

\`\`\`zoommap
storage: note
id: map-b
\`\`\`

%%
ZOOMMAP-DATA id=map-a
{
  "layers": [{ "id": "default", "name": "Default", "visible": true }],
  "markers": [
    { "id": "a1", "x": 0.2, "y": 0.2, "layer": "default", "tooltip": "From A" }
  ]
}
/ZOOMMAP-DATA
%%

%%
ZOOMMAP-DATA id=map-b
{
  "layers": [{ "id": "default", "name": "Default", "visible": true }],
  "markers": [
    { "id": "b1", "x": 0.8, "y": 0.8, "layer": "default", "tooltip": "From B" }
  ]
}
/ZOOMMAP-DATA
%%
`;

describe("parseInlineMarkerBlock", () => {
  describe("edge cases", () => {
    it("returns null for empty source", () => {
      expect(parseInlineMarkerBlock("", "map-1")).toBeNull();
    });

    it("returns null for empty mapId", () => {
      expect(parseInlineMarkerBlock(NOTE_SINGLE, "")).toBeNull();
    });

    it("returns null when no matching header is present", () => {
      expect(parseInlineMarkerBlock("Just some text\n", "map-1")).toBeNull();
    });

    it("returns null when footer is missing", () => {
      const truncated = `%%\nZOOMMAP-DATA id=map-1\n{"layers":[],"markers":[]}\n`;
      expect(parseInlineMarkerBlock(truncated, "map-1")).toBeNull();
    });
  });

  describe("single-map notes", () => {
    it("parses a valid inline block and returns normalized data", () => {
      const result = parseInlineMarkerBlock(NOTE_SINGLE, "map-1");
      expect(result).not.toBeNull();
      expect(result?.markers).toHaveLength(1);
      expect(result?.markers[0]?.tooltip).toBe("Tavern");
    });

    it("does not match a different map id", () => {
      const result = parseInlineMarkerBlock(NOTE_SINGLE, "map-other");
      expect(result).toBeNull();
    });
  });

  describe("multi-map notes", () => {
    it("parses block map-a by id", () => {
      const result = parseInlineMarkerBlock(NOTE_MULTI, "map-a");
      expect(result).not.toBeNull();
      expect(result?.markers[0]?.tooltip).toBe("From A");
    });

    it("parses block map-b by id", () => {
      const result = parseInlineMarkerBlock(NOTE_MULTI, "map-b");
      expect(result).not.toBeNull();
      expect(result?.markers[0]?.tooltip).toBe("From B");
    });
  });

  describe("malformed content", () => {
    it("returns null for malformed JSON inside the block", () => {
      const note = `%%\nZOOMMAP-DATA id=map-1\n{ not-valid-json\n/ZOOMMAP-DATA\n%%\n`;
      expect(parseInlineMarkerBlock(note, "map-1")).toBeNull();
    });

    it("returns null when JSON body is empty", () => {
      const note = `%%\nZOOMMAP-DATA id=map-1\n/ZOOMMAP-DATA\n%%\n`;
      expect(parseInlineMarkerBlock(note, "map-1")).toBeNull();
    });

    it("returns null when JSON parses but fails normalization", () => {
      const note = `%%\nZOOMMAP-DATA id=map-1\n"just a string"\n/ZOOMMAP-DATA\n%%\n`;
      expect(parseInlineMarkerBlock(note, "map-1")).toBeNull();
    });
  });

  describe("custom header id", () => {
    it("uses a custom header identifier when provided", () => {
      const note = `%%\nCUSTOM-HEADER id=x\n{"layers":[],"markers":[]}\n/CUSTOM-HEADER\n%%\n`;
      const result = parseInlineMarkerBlock(note, "x", "CUSTOM-HEADER");
      expect(result).not.toBeNull();
      expect(result?.markers).toEqual([]);
    });
  });
});

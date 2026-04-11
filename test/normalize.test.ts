import { describe, expect, it } from "vitest";
import { emptyMapData, normalizeMarkerData } from "../src/parser/normalize";

describe("normalizeMarkerData", () => {
  describe("top-level validation", () => {
    it("returns null for null/undefined", () => {
      expect(normalizeMarkerData(null)).toBeNull();
      expect(normalizeMarkerData(undefined)).toBeNull();
    });

    it("returns null for a string", () => {
      expect(normalizeMarkerData("not an object")).toBeNull();
    });

    it("returns null for an array", () => {
      expect(normalizeMarkerData([])).toBeNull();
    });

    it("accepts an empty object and fills in defaults", () => {
      const result = normalizeMarkerData({});
      expect(result).not.toBeNull();
      expect(result?.layers).toHaveLength(1);
      expect(result?.layers[0]?.id).toBe("default");
      expect(result?.markers).toEqual([]);
      expect(result?.panClamp).toBe(true);
    });
  });

  describe("layers", () => {
    it("passes through valid layers", () => {
      const result = normalizeMarkerData({
        layers: [
          { id: "cities", name: "Cities", visible: true },
          { id: "routes", name: "Routes", visible: false, locked: true },
        ],
      });
      expect(result?.layers).toEqual([
        { id: "cities", name: "Cities", visible: true },
        { id: "routes", name: "Routes", visible: false, locked: true },
      ]);
    });

    it("creates a default layer if layers is missing", () => {
      const result = normalizeMarkerData({ markers: [] });
      expect(result?.layers).toHaveLength(1);
      expect(result?.layers[0]?.id).toBe("default");
    });

    it("filters out invalid layer entries", () => {
      const result = normalizeMarkerData({
        layers: [
          { id: "valid", name: "Valid", visible: true },
          { name: "Missing id" },
          null,
          "not an object",
          {},
        ],
      });
      expect(result?.layers).toHaveLength(1);
      expect(result?.layers[0]?.id).toBe("valid");
    });

    it("falls back to default when all layers are invalid", () => {
      const result = normalizeMarkerData({
        layers: [{ name: "No id" }, null],
      });
      expect(result?.layers).toHaveLength(1);
      expect(result?.layers[0]?.id).toBe("default");
    });
  });

  describe("markers", () => {
    it("passes through valid markers", () => {
      const result = normalizeMarkerData({
        layers: [{ id: "default", name: "Default", visible: true }],
        markers: [
          {
            id: "m1",
            x: 0.5,
            y: 0.3,
            layer: "default",
            tooltip: "A place",
            iconKey: "pin-red",
          },
        ],
      });
      expect(result?.markers).toHaveLength(1);
      expect(result?.markers[0]?.tooltip).toBe("A place");
      expect(result?.markers[0]?.iconKey).toBe("pin-red");
    });

    it("reassigns markers with invalid layer to the first existing layer", () => {
      const result = normalizeMarkerData({
        layers: [{ id: "cities", name: "Cities", visible: true }],
        markers: [{ id: "m1", x: 0.5, y: 0.5, layer: "nonexistent" }],
      });
      expect(result?.markers[0]?.layer).toBe("cities");
    });

    it("drops markers with missing required fields", () => {
      const result = normalizeMarkerData({
        markers: [
          { id: "good", x: 0.5, y: 0.5, layer: "default" },
          { id: "missing-x", y: 0.5, layer: "default" },
          { id: "nan-y", x: 0.5, y: Number.NaN, layer: "default" },
          { x: 0.5, y: 0.5, layer: "default" },
          null,
        ],
      });
      expect(result?.markers).toHaveLength(1);
      expect(result?.markers[0]?.id).toBe("good");
    });

    it("coerces unknown marker kind to 'pin'", () => {
      const result = normalizeMarkerData({
        markers: [{ id: "m1", x: 0.5, y: 0.5, layer: "default", type: "unknown-type" }],
      });
      expect(result?.markers[0]?.type).toBe("pin");
    });

    it("accepts valid marker kinds", () => {
      const result = normalizeMarkerData({
        markers: [
          { id: "a", x: 0, y: 0, layer: "default", type: "sticker" },
          { id: "b", x: 0, y: 0, layer: "default", type: "swap" },
          { id: "c", x: 0, y: 0, layer: "default", type: "switch" },
        ],
      });
      expect(result?.markers.map((m) => m.type)).toEqual(["sticker", "swap", "switch"]);
    });

    it("preserves zoom range fields", () => {
      const result = normalizeMarkerData({
        markers: [{ id: "m1", x: 0.5, y: 0.5, layer: "default", minZoom: 0.5, maxZoom: 4 }],
      });
      expect(result?.markers[0]?.minZoom).toBe(0.5);
      expect(result?.markers[0]?.maxZoom).toBe(4);
    });
  });

  describe("legacy image migration", () => {
    it("converts a legacy 'image' field into a single-entry bases array", () => {
      const result = normalizeMarkerData({
        image: "assets/legacy-map.webp",
        markers: [],
      });
      expect(result?.bases).toEqual(["assets/legacy-map.webp"]);
    });

    it("prefers explicit bases over legacy image", () => {
      const result = normalizeMarkerData({
        image: "assets/legacy.webp",
        bases: ["assets/new.webp"],
        markers: [],
      });
      expect(result?.bases).toEqual(["assets/new.webp"]);
    });
  });

  describe("overlays", () => {
    it("normalizes overlays with visibility defaults", () => {
      const result = normalizeMarkerData({
        overlays: [{ path: "roads.png" }, { path: "labels.png", visible: false, name: "Labels" }],
      });
      expect(result?.overlays).toEqual([
        { path: "roads.png", visible: true },
        { path: "labels.png", visible: false, name: "Labels" },
      ]);
    });
  });

  describe("grids", () => {
    it("normalizes square and hex grids with defaults", () => {
      const result = normalizeMarkerData({
        grids: [
          { id: "g1", shape: "square", color: "#ffffff", spacing: 64 },
          { id: "g2", shape: "hex", spacing: 48 },
        ],
      });
      expect(result?.grids).toHaveLength(2);
      expect(result?.grids?.[0]?.shape).toBe("square");
      expect(result?.grids?.[1]?.shape).toBe("hex");
      expect(result?.grids?.[0]?.opacity).toBe(0.5);
    });

    it("clamps grid opacity to [0, 1]", () => {
      const result = normalizeMarkerData({
        grids: [
          { id: "g1", shape: "square", spacing: 64, opacity: 1.5 },
          { id: "g2", shape: "square", spacing: 64, opacity: -0.3 },
        ],
      });
      expect(result?.grids?.[0]?.opacity).toBe(1);
      expect(result?.grids?.[1]?.opacity).toBe(0);
    });
  });

  describe("drawings", () => {
    it("normalizes rect/circle/polygon/polyline drawings", () => {
      const result = normalizeMarkerData({
        drawLayers: [{ id: "dl1", name: "Layer 1", visible: true }],
        drawings: [
          {
            id: "d1",
            layerId: "dl1",
            kind: "rect",
            rect: { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5 },
            style: { strokeColor: "#ff0000", strokeWidth: 2 },
          },
          {
            id: "d2",
            layerId: "dl1",
            kind: "circle",
            circle: { cx: 0.5, cy: 0.5, r: 0.1 },
            style: { strokeColor: "#00ff00", strokeWidth: 1 },
          },
          {
            id: "d3",
            layerId: "dl1",
            kind: "polygon",
            polygon: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 0.5, y: 1 },
            ],
            style: { strokeColor: "#0000ff", strokeWidth: 3 },
          },
          {
            id: "d4",
            layerId: "dl1",
            kind: "polyline",
            polyline: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
            style: { strokeColor: "#ffff00", strokeWidth: 2 },
          },
        ],
      });
      expect(result?.drawings).toHaveLength(4);
      expect(result?.drawings?.[0]?.kind).toBe("rect");
      expect(result?.drawings?.[1]?.kind).toBe("circle");
      expect(result?.drawings?.[2]?.kind).toBe("polygon");
      expect(result?.drawings?.[3]?.kind).toBe("polyline");
    });

    it("drops drawings with missing or invalid geometry", () => {
      const result = normalizeMarkerData({
        drawLayers: [{ id: "dl1", name: "Layer 1", visible: true }],
        drawings: [
          { id: "bad1", layerId: "dl1", kind: "rect" },
          { id: "bad2", layerId: "dl1", kind: "polygon", polygon: [{ x: 0, y: 0 }] },
          { id: "bad3", layerId: "dl1", kind: "circle", circle: { cx: 0.5, cy: 0.5, r: -1 } },
          { id: "bad4", layerId: "dl1", kind: "unknown" },
        ],
      });
      expect(result?.drawings ?? []).toHaveLength(0);
    });
  });

  describe("text layers", () => {
    it("normalizes text layers with boxes and baselines", () => {
      const result = normalizeMarkerData({
        textLayers: [
          {
            id: "labels",
            name: "Labels",
            visible: true,
            style: { fontFamily: "serif", fontSize: 18, color: "#000" },
            boxes: [
              {
                id: "b1",
                name: "Box",
                mode: "custom",
                rect: { x0: 0, y0: 0, x1: 1, y1: 0.2 },
                lines: [{ id: "l1", x0: 0, y0: 0.1, x1: 1, y1: 0.1, text: "Hello" }],
              },
            ],
          },
        ],
      });
      expect(result?.textLayers).toHaveLength(1);
      expect(result?.textLayers?.[0]?.boxes).toHaveLength(1);
      expect(result?.textLayers?.[0]?.boxes[0]?.lines[0]?.text).toBe("Hello");
    });
  });

  describe("panClamp", () => {
    it("defaults panClamp to true", () => {
      const result = normalizeMarkerData({});
      expect(result?.panClamp).toBe(true);
    });

    it("honors explicit panClamp=false", () => {
      const result = normalizeMarkerData({ panClamp: false });
      expect(result?.panClamp).toBe(false);
    });
  });
});

describe("emptyMapData", () => {
  it("returns a minimal valid structure with a default layer", () => {
    const data = emptyMapData();
    expect(data.layers).toHaveLength(1);
    expect(data.layers[0]?.id).toBe("default");
    expect(data.markers).toEqual([]);
  });
});

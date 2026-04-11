import { describe, expect, it } from "vitest";
import { DEFAULT_YAML_OPTIONS, parseZoomMapYaml } from "../src/parser/yamlConfig";

describe("parseZoomMapYaml", () => {
  describe("edge cases", () => {
    it("returns defaults for an empty block", () => {
      expect(parseZoomMapYaml("")).toEqual(DEFAULT_YAML_OPTIONS);
    });

    it("returns defaults for a whitespace-only block", () => {
      expect(parseZoomMapYaml("   \n  \t")).toEqual(DEFAULT_YAML_OPTIONS);
    });

    it("returns defaults when YAML parses to null", () => {
      expect(parseZoomMapYaml("~")).toEqual(DEFAULT_YAML_OPTIONS);
    });

    it("returns null for an invalid YAML structure", () => {
      expect(parseZoomMapYaml(": invalid : yaml :")).toBeNull();
    });

    it("returns null for a top-level array", () => {
      expect(parseZoomMapYaml("- one\n- two")).toBeNull();
    });

    it("returns null for a top-level scalar", () => {
      expect(parseZoomMapYaml("just-a-string")).toBeNull();
    });
  });

  describe("scalar fields", () => {
    it("parses image and markers", () => {
      const result = parseZoomMapYaml(`
image: assets/world.webp
markers: assets/world.markers.json
`);
      expect(result?.image).toBe("assets/world.webp");
      expect(result?.markers).toBe("assets/world.markers.json");
    });

    it("parses id", () => {
      const result = parseZoomMapYaml("id: map-abc");
      expect(result?.id).toBe("map-abc");
    });

    it("ignores empty string fields", () => {
      const result = parseZoomMapYaml(`
image: ""
markers: ""
id: ""
`);
      expect(result?.image).toBeUndefined();
      expect(result?.markers).toBeUndefined();
      expect(result?.id).toBeUndefined();
    });
  });

  describe("enum coercion", () => {
    it("accepts valid storage modes", () => {
      expect(parseZoomMapYaml("storage: json")?.storage).toBe("json");
      expect(parseZoomMapYaml("storage: note")?.storage).toBe("note");
    });

    it("falls back to default storage for invalid values", () => {
      expect(parseZoomMapYaml("storage: bogus")?.storage).toBe("json");
    });

    it("accepts valid align modes", () => {
      expect(parseZoomMapYaml("align: center")?.align).toBe("center");
      expect(parseZoomMapYaml("align: right")?.align).toBe("right");
    });

    it("falls back to default align for invalid values", () => {
      expect(parseZoomMapYaml("align: sideways")?.align).toBe("left");
    });

    it("accepts valid render modes", () => {
      expect(parseZoomMapYaml("render: dom")?.render).toBe("dom");
      expect(parseZoomMapYaml("render: canvas")?.render).toBe("canvas");
    });
  });

  describe("zoom coercion", () => {
    it("parses numeric zoom values", () => {
      const result = parseZoomMapYaml(`
minZoom: 0.5
maxZoom: 4
`);
      expect(result?.minZoom).toBe(0.5);
      expect(result?.maxZoom).toBe(4);
    });

    it("parses percentage string zoom values", () => {
      const result = parseZoomMapYaml(`
minZoom: "50%"
maxZoom: "400%"
`);
      expect(result?.minZoom).toBe(0.5);
      expect(result?.maxZoom).toBe(4);
    });

    it("parses decimal string zoom values", () => {
      const result = parseZoomMapYaml(`
minZoom: "1.25"
maxZoom: "12.5"
`);
      expect(result?.minZoom).toBe(1.25);
      expect(result?.maxZoom).toBe(12.5);
    });

    it("rejects non-positive or non-finite zoom values", () => {
      const result = parseZoomMapYaml(`
minZoom: 0
maxZoom: -5
`);
      expect(result?.minZoom).toBe(DEFAULT_YAML_OPTIONS.minZoom);
      expect(result?.maxZoom).toBe(DEFAULT_YAML_OPTIONS.maxZoom);
    });
  });

  describe("CSS size coercion", () => {
    it("parses numeric width/height as pixels", () => {
      const result = parseZoomMapYaml(`
width: 640
height: 480
`);
      expect(result?.width).toBe("640px");
      expect(result?.height).toBe("480px");
    });

    it("preserves string width/height with units", () => {
      const result = parseZoomMapYaml(`
width: 100%
height: 50vh
`);
      expect(result?.width).toBe("100%");
      expect(result?.height).toBe("50vh");
    });

    it("uses defaults for invalid size values", () => {
      const result = parseZoomMapYaml(`
width: -100
height: {}
`);
      expect(result?.width).toBe(DEFAULT_YAML_OPTIONS.width);
      expect(result?.height).toBe(DEFAULT_YAML_OPTIONS.height);
    });
  });

  describe("responsive mode", () => {
    it("overrides width/height/zoom when responsive is true", () => {
      const result = parseZoomMapYaml(`
responsive: true
width: 500px
height: 300px
minZoom: 2
maxZoom: 5
`);
      expect(result?.responsive).toBe(true);
      expect(result?.width).toBe("500px");
      expect(result?.height).toBe("300px");
      expect(result?.minZoom).toBe(1e-6);
      expect(result?.maxZoom).toBe(1e6);
    });

    it("defaults height to auto when responsive and height is missing", () => {
      const result = parseZoomMapYaml(`
responsive: true
width: 100%
`);
      expect(result?.height).toBe("auto");
    });
  });

  describe("imageBases and imageOverlays", () => {
    it("normalizes string base entries", () => {
      const result = parseZoomMapYaml(`
imageBases:
  - assets/a.png
  - assets/b.png
`);
      expect(result?.imageBases).toEqual([{ path: "assets/a.png" }, { path: "assets/b.png" }]);
    });

    it("normalizes object base entries", () => {
      const result = parseZoomMapYaml(`
imageBases:
  - path: assets/world.webp
    name: World Map
  - path: assets/city.webp
`);
      expect(result?.imageBases).toEqual([
        { path: "assets/world.webp", name: "World Map" },
        { path: "assets/city.webp" },
      ]);
    });

    it("normalizes overlays with default visible=true", () => {
      const result = parseZoomMapYaml(`
imageOverlays:
  - assets/roads.png
  - path: assets/labels.png
    visible: false
    name: Labels
`);
      expect(result?.imageOverlays).toEqual([
        { path: "assets/roads.png", visible: true },
        { path: "assets/labels.png", visible: false, name: "Labels" },
      ]);
    });

    it("drops invalid entries", () => {
      const result = parseZoomMapYaml(`
imageBases:
  - path: ""
  - {}
  - 42
imageOverlays:
  - path: ""
`);
      expect(result?.imageBases).toBeUndefined();
      expect(result?.imageOverlays).toBeUndefined();
    });
  });

  describe("classes", () => {
    it("normalizes a single-string class", () => {
      expect(parseZoomMapYaml("classes: highlighted")?.classes).toEqual(["highlighted"]);
    });

    it("normalizes an array of classes", () => {
      const result = parseZoomMapYaml(`
classes:
  - highlighted
  - featured
`);
      expect(result?.classes).toEqual(["highlighted", "featured"]);
    });

    it("drops non-string entries from class array", () => {
      const result = parseZoomMapYaml(`
classes:
  - valid
  - 42
  - ""
`);
      expect(result?.classes).toEqual(["valid"]);
    });
  });

  describe("full realistic config from source plugin Template.md", () => {
    it("parses the canonical example", () => {
      const raw = `
render: canvas
imageBases:
  - path: z_Attachments/Map.webp
    name: Map of the Forbidden Lands
imageOverlays:
  - path: z_Attachments/overlay.png
    name: Roads
    visible: true
markers: z_Attachments/Map.webp.markers.json
minZoom: 0.3
maxZoom: 20
height: 350px
width: 60%
resizable: true
align: left
wrap: true
`;
      const result = parseZoomMapYaml(raw);
      expect(result).not.toBeNull();
      expect(result?.render).toBe("canvas");
      expect(result?.imageBases?.[0]?.path).toBe("z_Attachments/Map.webp");
      expect(result?.imageBases?.[0]?.name).toBe("Map of the Forbidden Lands");
      expect(result?.imageOverlays?.[0]).toEqual({
        path: "z_Attachments/overlay.png",
        name: "Roads",
        visible: true,
      });
      expect(result?.markers).toBe("z_Attachments/Map.webp.markers.json");
      expect(result?.minZoom).toBe(0.3);
      expect(result?.maxZoom).toBe(20);
      expect(result?.height).toBe("350px");
      expect(result?.width).toBe("60%");
      expect(result?.align).toBe("left");
      expect(result?.wrap).toBe(true);
    });
  });
});

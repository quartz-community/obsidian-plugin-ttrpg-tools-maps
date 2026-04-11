import { describe, expect, it } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { normalizeMarkerData } from "../src/parser/normalize";

describe("full-features fixture", () => {
  it("normalizes a rich real-world marker file end-to-end", async () => {
    const abs = path.resolve(__dirname, "fixtures", "full-features.markers.json");
    const raw = await fs.readFile(abs, "utf-8");
    const parsed = JSON.parse(raw);
    const data = normalizeMarkerData(parsed);

    expect(data).not.toBeNull();
    expect(data?.size).toEqual({ w: 2048, h: 1536 });

    expect(data?.layers).toHaveLength(3);
    expect(data?.layers.map((l) => l.id)).toEqual(["cities", "quests", "hidden-stuff"]);

    expect(data?.markers).toHaveLength(4);
    const prancingPony = data?.markers.find((m) => m.id === "m_prancing_pony");
    expect(prancingPony?.link).toBe("Taverns/Prancing Pony");
    expect(prancingPony?.iconKey).toBe("pin-red");

    const bree = data?.markers.find((m) => m.id === "m_bree");
    expect(bree?.minZoom).toBe(0.5);
    expect(bree?.maxZoom).toBe(6);
    expect(bree?.tooltipLabelAlways).toBe(true);

    const sticker = data?.markers.find((m) => m.id === "m_sticker");
    expect(sticker?.type).toBe("sticker");
    expect(sticker?.stickerPath).toBe("assets/stickers/dragon.png");
    expect(sticker?.stickerSize).toBe(48);

    expect(data?.bases).toHaveLength(2);
    expect(data?.overlays).toHaveLength(2);
    expect(data?.activeBase).toBe("assets/world-base.webp");

    expect(data?.grids).toHaveLength(2);
    expect(data?.grids?.[0]?.shape).toBe("square");
    expect(data?.grids?.[1]?.shape).toBe("hex");
    expect(data?.grids?.[1]?.visible).toBe(false);

    expect(data?.drawLayers).toHaveLength(2);
    expect(data?.drawings).toHaveLength(4);

    const eriador = data?.drawings?.find((d) => d.id === "d_eriador");
    expect(eriador?.kind).toBe("polygon");
    expect(eriador?.polygon).toHaveLength(4);
    expect(eriador?.style.label).toBe("Eriador");
    expect(eriador?.style.fillPattern).toBe("striped");

    const mordor = data?.drawings?.find((d) => d.id === "d_mordor");
    expect(mordor?.kind).toBe("circle");
    expect(mordor?.circle).toEqual({ cx: 0.78, cy: 0.62, r: 0.08 });

    const road = data?.drawings?.find((d) => d.id === "d_road");
    expect(road?.kind).toBe("polyline");
    expect(road?.polyline).toHaveLength(3);
    expect(road?.style.strokeDash).toEqual([6, 4]);
    expect(road?.style.distanceLabel).toBe(true);

    const rect = data?.drawings?.find((d) => d.id === "d_rect");
    expect(rect?.kind).toBe("rect");
    expect(rect?.rect).toEqual({ x0: 0.02, y0: 0.02, x1: 0.25, y1: 0.15 });

    expect(data?.textLayers).toHaveLength(1);
    expect(data?.textLayers?.[0]?.boxes).toHaveLength(1);
    expect(data?.textLayers?.[0]?.boxes[0]?.lines[0]?.text).toBe("ERIADOR");

    expect(data?.pinSizeOverrides).toEqual({ "pin-red": 40 });
    expect(data?.panClamp).toBe(true);
  });

  it("survives a serialize/parse round-trip without data loss", async () => {
    const abs = path.resolve(__dirname, "fixtures", "full-features.markers.json");
    const raw = await fs.readFile(abs, "utf-8");
    const first = normalizeMarkerData(JSON.parse(raw));
    const serialized = JSON.stringify(first);
    const second = normalizeMarkerData(JSON.parse(serialized));
    expect(second).toEqual(first);
  });
});

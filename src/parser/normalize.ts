/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 */

import type {
  BaseImage,
  DrawLayer,
  Drawing,
  DrawingKind,
  DrawingStyle,
  FillPatternKind,
  GridOverlay,
  GridShape,
  ImageOverlay,
  Marker,
  MarkerKind,
  MarkerLayer,
  TextBaseline,
  TextBox,
  TextLayer,
  TextLayerStyle,
  TTRPGMapData,
} from "../types";

export function emptyMapData(): TTRPGMapData {
  return {
    layers: [{ id: "default", name: "Default", visible: true }],
    markers: [],
  };
}

export function normalizeMarkerData(input: unknown): TTRPGMapData | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const i = input as Record<string, unknown>;

  const layers = normalizeLayers(i.layers);
  const drawLayers = normalizeDrawLayers(i.drawLayers);

  const bases = normalizeBases(i.bases, typeof i.image === "string" ? i.image : undefined);
  const overlays = normalizeOverlays(i.overlays);

  const data: TTRPGMapData = {
    layers,
    markers: normalizeMarkers(i.markers, layers),
  };

  const size = normalizeSize(i.size);
  if (size) data.size = size;

  if (bases.length > 0) data.bases = bases;
  if (overlays.length > 0) data.overlays = overlays;
  if (typeof i.activeBase === "string" && i.activeBase.length > 0) {
    data.activeBase = i.activeBase;
  }

  const grids = normalizeGrids(i.grids);
  if (grids.length > 0) data.grids = grids;

  if (drawLayers.length > 0) data.drawLayers = drawLayers;

  const drawings = normalizeDrawings(i.drawings, drawLayers);
  if (drawings.length > 0) data.drawings = drawings;

  const textLayers = normalizeTextLayers(i.textLayers);
  if (textLayers.length > 0) data.textLayers = textLayers;

  if (
    i.pinSizeOverrides &&
    typeof i.pinSizeOverrides === "object" &&
    !Array.isArray(i.pinSizeOverrides)
  ) {
    const overrides: Record<string, number> = {};
    for (const [k, v] of Object.entries(i.pinSizeOverrides)) {
      if (typeof v === "number" && Number.isFinite(v)) overrides[k] = v;
    }
    if (Object.keys(overrides).length > 0) data.pinSizeOverrides = overrides;
  }

  data.panClamp = typeof i.panClamp === "boolean" ? i.panClamp : true;

  return data;
}

function normalizeSize(input: unknown): { w: number; h: number } | undefined {
  if (!input || typeof input !== "object") return undefined;
  const s = input as Record<string, unknown>;
  const w = typeof s.w === "number" && s.w > 0 ? s.w : null;
  const h = typeof s.h === "number" && s.h > 0 ? s.h : null;
  if (w === null || h === null) return undefined;
  return { w, h };
}

function normalizeLayers(input: unknown): MarkerLayer[] {
  if (!Array.isArray(input)) {
    return [{ id: "default", name: "Default", visible: true }];
  }
  const out: MarkerLayer[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const layer: MarkerLayer = {
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
    if (typeof r.locked === "boolean") layer.locked = r.locked;
    if (typeof r.boundBase === "string" && r.boundBase.length > 0) layer.boundBase = r.boundBase;
    out.push(layer);
  }
  if (out.length === 0) {
    out.push({ id: "default", name: "Default", visible: true });
  }
  return out;
}

function normalizeDrawLayers(input: unknown): DrawLayer[] {
  if (!Array.isArray(input)) return [];
  const out: DrawLayer[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const layer: DrawLayer = {
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
    if (typeof r.locked === "boolean") layer.locked = r.locked;
    if (typeof r.boundBase === "string" && r.boundBase.length > 0) layer.boundBase = r.boundBase;
    out.push(layer);
  }
  return out;
}

function normalizeMarkers(input: unknown, layers: MarkerLayer[]): Marker[] {
  if (!Array.isArray(input)) return [];
  const layerIds = new Set(layers.map((l) => l.id));
  const fallbackLayer = layers[0]?.id ?? "default";
  const out: Marker[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    if (typeof r.x !== "number" || !Number.isFinite(r.x)) continue;
    if (typeof r.y !== "number" || !Number.isFinite(r.y)) continue;

    const layer = typeof r.layer === "string" && layerIds.has(r.layer) ? r.layer : fallbackLayer;

    const marker: Marker = {
      id: r.id,
      x: r.x,
      y: r.y,
      layer,
    };

    if (typeof r.link === "string" && r.link.length > 0) marker.link = r.link;
    if (typeof r.resolvedHref === "string" && r.resolvedHref.length > 0)
      marker.resolvedHref = r.resolvedHref;
    if (typeof r.iconKey === "string" && r.iconKey.length > 0) marker.iconKey = r.iconKey;
    if (typeof r.iconColor === "string" && r.iconColor.length > 0) marker.iconColor = r.iconColor;
    if (typeof r.tooltip === "string") marker.tooltip = r.tooltip;
    if (typeof r.tooltipAlwaysOn === "boolean") marker.tooltipAlwaysOn = r.tooltipAlwaysOn;
    if (typeof r.tooltipLabelAlways === "boolean") marker.tooltipLabelAlways = r.tooltipLabelAlways;
    if (r.tooltipLabelPosition === "above" || r.tooltipLabelPosition === "below") {
      marker.tooltipLabelPosition = r.tooltipLabelPosition;
    }
    if (typeof r.tooltipLabelOffsetX === "number")
      marker.tooltipLabelOffsetX = r.tooltipLabelOffsetX;
    if (typeof r.tooltipLabelOffsetY === "number")
      marker.tooltipLabelOffsetY = r.tooltipLabelOffsetY;
    marker.type = coerceMarkerKind(r.type);
    if (typeof r.stickerPath === "string" && r.stickerPath.length > 0)
      marker.stickerPath = r.stickerPath;
    if (typeof r.stickerSize === "number" && r.stickerSize > 0) marker.stickerSize = r.stickerSize;
    if (typeof r.swapKey === "string" && r.swapKey.length > 0) marker.swapKey = r.swapKey;
    if (typeof r.swapIndex === "number" && Number.isInteger(r.swapIndex) && r.swapIndex >= 0) {
      marker.swapIndex = r.swapIndex;
    }
    if (typeof r.switchBase === "string" && r.switchBase.length > 0)
      marker.switchBase = r.switchBase;
    if (typeof r.minZoom === "number" && r.minZoom > 0) marker.minZoom = r.minZoom;
    if (typeof r.maxZoom === "number" && r.maxZoom > 0) marker.maxZoom = r.maxZoom;
    if (typeof r.scaleLikeSticker === "boolean") marker.scaleLikeSticker = r.scaleLikeSticker;
    if (r.anchorSpace === "world" || r.anchorSpace === "viewport")
      marker.anchorSpace = r.anchorSpace;

    out.push(marker);
  }
  return out;
}

function coerceMarkerKind(input: unknown): MarkerKind {
  if (
    input === "sticker" ||
    input === "swap" ||
    input === "switch" ||
    input === "dice" ||
    input === "pin"
  ) {
    return input;
  }
  return "pin";
}

function normalizeBases(input: unknown, legacyImage: string | undefined): (string | BaseImage)[] {
  const out: (string | BaseImage)[] = [];
  if (Array.isArray(input)) {
    for (const raw of input) {
      if (typeof raw === "string" && raw.length > 0) {
        out.push(raw);
        continue;
      }
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (typeof r.path === "string" && r.path.length > 0) {
          const entry: BaseImage = { path: r.path };
          if (typeof r.name === "string" && r.name.length > 0) entry.name = r.name;
          out.push(entry);
        }
      }
    }
  }
  if (out.length === 0 && legacyImage) {
    out.push(legacyImage);
  }
  return out;
}

function normalizeOverlays(input: unknown): ImageOverlay[] {
  if (!Array.isArray(input)) return [];
  const out: ImageOverlay[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.path !== "string" || r.path.length === 0) continue;
    const entry: ImageOverlay = {
      path: r.path,
      visible: typeof r.visible === "boolean" ? r.visible : true,
    };
    if (typeof r.name === "string" && r.name.length > 0) entry.name = r.name;
    out.push(entry);
  }
  return out;
}

function normalizeGrids(input: unknown): GridOverlay[] {
  if (!Array.isArray(input)) return [];
  const out: GridOverlay[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const shape: GridShape = r.shape === "hex" ? "hex" : "square";
    const grid: GridOverlay = {
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      visible: typeof r.visible === "boolean" ? r.visible : true,
      shape,
      color: typeof r.color === "string" ? r.color : "#ffffff",
      width: typeof r.width === "number" && r.width > 0 ? r.width : 1,
      opacity: typeof r.opacity === "number" ? clamp01(r.opacity) : 0.5,
      spacing: typeof r.spacing === "number" && r.spacing > 0 ? r.spacing : 64,
      offsetX: typeof r.offsetX === "number" ? r.offsetX : 0,
      offsetY: typeof r.offsetY === "number" ? r.offsetY : 0,
    };
    if (typeof r.boundBase === "string" && r.boundBase.length > 0) grid.boundBase = r.boundBase;
    out.push(grid);
  }
  return out;
}

function normalizeDrawings(input: unknown, drawLayers: DrawLayer[]): Drawing[] {
  if (!Array.isArray(input)) return [];
  const layerIds = new Set(drawLayers.map((l) => l.id));
  const out: Drawing[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const kind = coerceDrawingKind(r.kind);
    if (!kind) continue;
    const layerId =
      typeof r.layerId === "string" && layerIds.has(r.layerId)
        ? r.layerId
        : (drawLayers[0]?.id ?? "default");

    const drawing: Drawing = {
      id: r.id,
      layerId,
      kind,
      visible: typeof r.visible === "boolean" ? r.visible : true,
      style: normalizeDrawingStyle(r.style),
    };

    let hasGeometry = false;
    if (kind === "rect" && r.rect && typeof r.rect === "object") {
      const rc = r.rect as Record<string, unknown>;
      if (numOk(rc.x0) && numOk(rc.y0) && numOk(rc.x1) && numOk(rc.y1)) {
        drawing.rect = {
          x0: rc.x0 as number,
          y0: rc.y0 as number,
          x1: rc.x1 as number,
          y1: rc.y1 as number,
        };
        hasGeometry = true;
      }
    } else if (kind === "circle" && r.circle && typeof r.circle === "object") {
      const c = r.circle as Record<string, unknown>;
      if (numOk(c.cx) && numOk(c.cy) && numOk(c.r) && (c.r as number) > 0) {
        drawing.circle = { cx: c.cx as number, cy: c.cy as number, r: c.r as number };
        hasGeometry = true;
      }
    } else if (kind === "polygon" && Array.isArray(r.polygon)) {
      const pts = normalizePoints(r.polygon);
      if (pts.length >= 3) {
        drawing.polygon = pts;
        hasGeometry = true;
      }
    } else if (kind === "polyline" && Array.isArray(r.polyline)) {
      const pts = normalizePoints(r.polyline);
      if (pts.length >= 2) {
        drawing.polyline = pts;
        hasGeometry = true;
      }
    }

    if (hasGeometry) out.push(drawing);
  }
  return out;
}

function coerceDrawingKind(input: unknown): DrawingKind | null {
  if (input === "rect" || input === "circle" || input === "polygon" || input === "polyline") {
    return input;
  }
  return null;
}

function normalizePoints(input: unknown[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const p of input) {
    if (p && typeof p === "object") {
      const pr = p as Record<string, unknown>;
      if (numOk(pr.x) && numOk(pr.y)) {
        out.push({ x: pr.x as number, y: pr.y as number });
      }
    }
  }
  return out;
}

function normalizeDrawingStyle(input: unknown): DrawingStyle {
  const style: DrawingStyle = {
    strokeColor: "#ff0000",
    strokeWidth: 2,
  };
  if (!input || typeof input !== "object") return style;
  const s = input as Record<string, unknown>;
  if (typeof s.strokeColor === "string") style.strokeColor = s.strokeColor;
  if (typeof s.strokeWidth === "number" && s.strokeWidth >= 0) style.strokeWidth = s.strokeWidth;
  if (typeof s.strokeOpacity === "number") style.strokeOpacity = clamp01(s.strokeOpacity);
  if (Array.isArray(s.strokeDash)) {
    const dash = s.strokeDash.filter((n): n is number => typeof n === "number" && n >= 0);
    if (dash.length > 0) style.strokeDash = dash;
  }
  if (typeof s.fillColor === "string") style.fillColor = s.fillColor;
  if (typeof s.fillOpacity === "number") style.fillOpacity = clamp01(s.fillOpacity);
  style.fillPattern = coerceFillPattern(s.fillPattern);
  if (typeof s.fillPatternAngle === "number") style.fillPatternAngle = s.fillPatternAngle;
  if (typeof s.fillPatternSpacing === "number" && s.fillPatternSpacing > 0) {
    style.fillPatternSpacing = s.fillPatternSpacing;
  }
  if (typeof s.fillPatternStrokeWidth === "number" && s.fillPatternStrokeWidth >= 0) {
    style.fillPatternStrokeWidth = s.fillPatternStrokeWidth;
  }
  if (typeof s.fillPatternOpacity === "number")
    style.fillPatternOpacity = clamp01(s.fillPatternOpacity);
  if (typeof s.label === "string") style.label = s.label;
  if (typeof s.arrowEnd === "boolean") style.arrowEnd = s.arrowEnd;
  if (typeof s.distanceLabel === "boolean") style.distanceLabel = s.distanceLabel;
  return style;
}

function coerceFillPattern(input: unknown): FillPatternKind | undefined {
  if (
    input === "none" ||
    input === "solid" ||
    input === "striped" ||
    input === "cross" ||
    input === "wavy"
  ) {
    return input;
  }
  return undefined;
}

function normalizeTextLayers(input: unknown): TextLayer[] {
  if (!Array.isArray(input)) return [];
  const out: TextLayer[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const layer: TextLayer = {
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      visible: typeof r.visible === "boolean" ? r.visible : true,
      boxes: normalizeTextBoxes(r.boxes),
    };
    if (typeof r.boundBase === "string" && r.boundBase.length > 0) layer.boundBase = r.boundBase;
    if (typeof r.locked === "boolean") layer.locked = r.locked;
    if (typeof r.autoFlow === "boolean") layer.autoFlow = r.autoFlow;
    if (typeof r.allowAngledBaselines === "boolean")
      layer.allowAngledBaselines = r.allowAngledBaselines;
    const style = normalizeTextLayerStyle(r.style);
    if (style) layer.style = style;
    out.push(layer);
  }
  return out;
}

function normalizeTextBoxes(input: unknown): TextBox[] {
  if (!Array.isArray(input)) return [];
  const out: TextBox[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    const rectRaw = r.rect as Record<string, unknown> | undefined;
    if (
      !rectRaw ||
      !numOk(rectRaw.x0) ||
      !numOk(rectRaw.y0) ||
      !numOk(rectRaw.x1) ||
      !numOk(rectRaw.y1)
    ) {
      continue;
    }
    const box: TextBox = {
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      mode: r.mode === "auto" ? "auto" : "custom",
      rect: {
        x0: rectRaw.x0 as number,
        y0: rectRaw.y0 as number,
        x1: rectRaw.x1 as number,
        y1: rectRaw.y1 as number,
      },
      lines: normalizeBaselines(r.lines),
    };
    if (typeof r.locked === "boolean") box.locked = r.locked;
    if (typeof r.autoFlow === "boolean") box.autoFlow = r.autoFlow;
    if (typeof r.allowAngledBaselines === "boolean")
      box.allowAngledBaselines = r.allowAngledBaselines;
    const style = normalizeTextLayerStyle(r.style);
    if (style) box.style = style;
    out.push(box);
  }
  return out;
}

function normalizeBaselines(input: unknown): TextBaseline[] {
  if (!Array.isArray(input)) return [];
  const out: TextBaseline[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    if (!numOk(r.x0) || !numOk(r.y0) || !numOk(r.x1) || !numOk(r.y1)) continue;
    const baseline: TextBaseline = {
      id: r.id,
      x0: r.x0 as number,
      y0: r.y0 as number,
      x1: r.x1 as number,
      y1: r.y1 as number,
    };
    if (typeof r.text === "string") baseline.text = r.text;
    out.push(baseline);
  }
  return out;
}

function normalizeTextLayerStyle(input: unknown): TextLayerStyle | undefined {
  if (!input || typeof input !== "object") return undefined;
  const s = input as Record<string, unknown>;
  const style: TextLayerStyle = {
    fontFamily: typeof s.fontFamily === "string" ? s.fontFamily : "serif",
    fontSize: typeof s.fontSize === "number" && s.fontSize > 0 ? s.fontSize : 16,
    color: typeof s.color === "string" ? s.color : "#000000",
  };
  if (typeof s.fontWeight === "string") style.fontWeight = s.fontWeight;
  if (typeof s.italic === "boolean") style.italic = s.italic;
  if (typeof s.letterSpacing === "number") style.letterSpacing = s.letterSpacing;
  if (typeof s.baselineOffset === "number") style.baselineOffset = s.baselineOffset;
  if (typeof s.lineHeight === "number" && s.lineHeight > 0) style.lineHeight = s.lineHeight;
  if (typeof s.padLeft === "number") style.padLeft = s.padLeft;
  if (typeof s.padRight === "number") style.padRight = s.padRight;
  return style;
}

function numOk(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

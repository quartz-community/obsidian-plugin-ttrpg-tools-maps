import { parse as parseYaml } from "yaml";
import type {
  AlignMode,
  RenderMode,
  StorageMode,
  YamlBaseImageEntry,
  YamlOptions,
  YamlOverlayEntry,
} from "../types";

export const DEFAULT_YAML_OPTIONS: YamlOptions = {
  minZoom: 0.25,
  maxZoom: 8,
  width: "100%",
  height: "480px",
  storage: "json",
  render: "dom",
  responsive: false,
  align: "left",
  wrap: false,
};

const VALID_STORAGE: readonly StorageMode[] = ["json", "note"];
const VALID_RENDER: readonly RenderMode[] = ["dom", "canvas"];
const VALID_ALIGN: readonly AlignMode[] = ["left", "center", "right"];

export function parseZoomMapYaml(raw: string): YamlOptions | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ...DEFAULT_YAML_OPTIONS };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(trimmed);
  } catch {
    return null;
  }

  if (parsed == null) {
    return { ...DEFAULT_YAML_OPTIONS };
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const src = parsed as Record<string, unknown>;
  const opts: YamlOptions = { ...DEFAULT_YAML_OPTIONS };

  if (typeof src.image === "string" && src.image.length > 0) {
    opts.image = src.image;
  }
  if (typeof src.markers === "string" && src.markers.length > 0) {
    opts.markers = src.markers;
  }
  if (typeof src.id === "string" && src.id.length > 0) {
    opts.id = src.id;
  }

  const storage = coerceEnum(src.storage, VALID_STORAGE);
  if (storage !== null) opts.storage = storage;

  const render = coerceEnum(src.render, VALID_RENDER);
  if (render !== null) opts.render = render;

  const align = coerceEnum(src.align, VALID_ALIGN);
  if (align !== null) opts.align = align;

  if (typeof src.responsive === "boolean") opts.responsive = src.responsive;
  if (typeof src.wrap === "boolean") opts.wrap = src.wrap;

  opts.minZoom = coerceZoom(src.minZoom, opts.minZoom);
  opts.maxZoom = coerceZoom(src.maxZoom, opts.maxZoom);

  if (opts.responsive) {
    opts.width = coerceCssSize(src.width, "100%");
    opts.height = coerceCssSize(src.height, "auto");
    opts.minZoom = 1e-6;
    opts.maxZoom = 1e6;
  } else {
    opts.width = coerceCssSize(src.width, opts.width);
    opts.height = coerceCssSize(src.height, opts.height);
  }

  if (Array.isArray(src.imageBases)) {
    const bases = src.imageBases
      .map(coerceBaseEntry)
      .filter((b): b is YamlBaseImageEntry => b !== null);
    if (bases.length > 0) opts.imageBases = bases;
  }

  if (Array.isArray(src.imageOverlays)) {
    const overlays = src.imageOverlays
      .map(coerceOverlayEntry)
      .filter((o): o is YamlOverlayEntry => o !== null);
    if (overlays.length > 0) opts.imageOverlays = overlays;
  }

  if (typeof src.classes === "string") {
    opts.classes = [src.classes];
  } else if (Array.isArray(src.classes)) {
    const classes = src.classes.filter((c): c is string => typeof c === "string" && c.length > 0);
    if (classes.length > 0) opts.classes = classes;
  }

  return opts;
}

function coerceEnum<T extends string>(value: unknown, valid: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  return (valid as readonly string[]).includes(value) ? (value as T) : null;
}

function coerceZoom(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      const num = Number.parseFloat(trimmed.slice(0, -1));
      if (Number.isFinite(num) && num > 0) {
        return num / 100;
      }
    } else {
      const num = Number.parseFloat(trimmed);
      if (Number.isFinite(num) && num > 0) {
        return num;
      }
    }
  }
  return fallback;
}

function coerceCssSize(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${value}px`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
}

function coerceBaseEntry(value: unknown): YamlBaseImageEntry | null {
  if (typeof value === "string" && value.length > 0) {
    return { path: value };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.path === "string" && v.path.length > 0) {
      const entry: YamlBaseImageEntry = { path: v.path };
      if (typeof v.name === "string" && v.name.length > 0) entry.name = v.name;
      return entry;
    }
  }
  return null;
}

function coerceOverlayEntry(value: unknown): YamlOverlayEntry | null {
  if (typeof value === "string" && value.length > 0) {
    return { path: value, visible: true };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.path === "string" && v.path.length > 0) {
      const entry: YamlOverlayEntry = {
        path: v.path,
        visible: typeof v.visible === "boolean" ? v.visible : true,
      };
      if (typeof v.name === "string" && v.name.length > 0) entry.name = v.name;
      return entry;
    }
  }
  return null;
}

/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 */

export type {
  BuildCtx,
  ChangeEvent,
  CSSResource,
  JSResource,
  ProcessedContent,
  QuartzEmitterPlugin,
  QuartzEmitterPluginInstance,
  QuartzFilterPlugin,
  QuartzFilterPluginInstance,
  QuartzPluginData,
  QuartzTransformerPlugin,
  QuartzTransformerPluginInstance,
  StaticResources,
  PageMatcher,
  PageGenerator,
  VirtualPage,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
} from "@quartz-community/types";

export interface TransformerOptions {
  blockLanguage: string;
  inlineBlockHeaderId: string;
  /**
   * Post-MVP escape hatch threshold in bytes. 0 (MVP default) means always
   * inline marker data into the placeholder; the sidecar-asset path is not
   * implemented in MVP.
   */
  maxInlineDataBytes: number;
  defaultIconKey: string;
}

export type StorageMode = "json" | "note";
export type RenderMode = "dom" | "canvas";
export type AlignMode = "left" | "center" | "right";

export interface YamlBaseImageEntry {
  path: string;
  name?: string;
}

export interface YamlOverlayEntry {
  path: string;
  name?: string;
  visible: boolean;
}

export interface YamlOptions {
  image?: string;
  markers?: string;
  imageBases?: YamlBaseImageEntry[];
  imageOverlays?: YamlOverlayEntry[];
  minZoom: number;
  maxZoom: number;
  width: string;
  height: string;
  storage: StorageMode;
  render: RenderMode;
  responsive: boolean;
  align: AlignMode;
  wrap: boolean;
  id?: string;
  classes?: string[];
}

export interface MarkerLayer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  boundBase?: string;
}

export interface DrawLayer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  boundBase?: string;
}

export type MarkerKind = "pin" | "sticker" | "swap" | "switch" | "dice";
export type AnchorSpace = "world" | "viewport";

/**
 * A marker on a TTRPG map. Coordinates `x` and `y` are normalized to [0, 1]
 * relative to the base image. See plan §2.4 for rendering semantics.
 */
export interface Marker {
  id: string;
  x: number;
  y: number;
  layer: string;
  link?: string;
  resolvedHref?: string;
  iconKey?: string;
  iconColor?: string;
  tooltip?: string;
  tooltipAlwaysOn?: boolean;
  tooltipLabelAlways?: boolean;
  tooltipLabelPosition?: "below" | "above";
  tooltipLabelOffsetX?: number;
  tooltipLabelOffsetY?: number;
  type?: MarkerKind;
  stickerPath?: string;
  resolvedStickerUrl?: string;
  stickerSize?: number;
  swapKey?: string;
  swapIndex?: number;
  switchBase?: string;
  minZoom?: number;
  maxZoom?: number;
  scaleLikeSticker?: boolean;
  anchorSpace?: AnchorSpace;
}

export type GridShape = "square" | "hex";

export interface GridOverlay {
  id: string;
  name: string;
  visible: boolean;
  boundBase?: string;
  shape: GridShape;
  color: string;
  width: number;
  opacity: number;
  spacing: number;
  offsetX: number;
  offsetY: number;
}

export type DrawingKind = "polygon" | "polyline" | "rect" | "circle";
export type FillPatternKind = "none" | "solid" | "striped" | "cross" | "wavy";

export interface DrawingStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDash?: number[];
  strokeOpacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  fillPattern?: FillPatternKind;
  fillPatternAngle?: number;
  fillPatternSpacing?: number;
  fillPatternStrokeWidth?: number;
  fillPatternOpacity?: number;
  label?: string;
  arrowEnd?: boolean;
  distanceLabel?: boolean;
}

export interface Drawing {
  id: string;
  layerId: string;
  kind: DrawingKind;
  visible: boolean;
  rect?: { x0: number; y0: number; x1: number; y1: number };
  circle?: { cx: number; cy: number; r: number };
  polygon?: { x: number; y: number }[];
  polyline?: { x: number; y: number }[];
  style: DrawingStyle;
}

export interface TextLayerStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight?: string;
  italic?: boolean;
  letterSpacing?: number;
  baselineOffset?: number;
  lineHeight?: number;
  padLeft?: number;
  padRight?: number;
}

export interface TextBaseline {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text?: string;
}

export interface TextBox {
  id: string;
  name: string;
  mode: "custom" | "auto";
  rect: { x0: number; y0: number; x1: number; y1: number };
  lines: TextBaseline[];
  style?: TextLayerStyle;
  locked?: boolean;
  autoFlow?: boolean;
  allowAngledBaselines?: boolean;
}

export interface TextLayer {
  id: string;
  name: string;
  visible: boolean;
  boundBase?: string;
  locked?: boolean;
  autoFlow?: boolean;
  allowAngledBaselines?: boolean;
  style?: TextLayerStyle;
  boxes: TextBox[];
}

export interface BaseImage {
  path: string;
  name?: string;
}

export interface ImageOverlay {
  path: string;
  visible: boolean;
  name?: string;
}

/**
 * Root shape of a `.markers.json` sidecar file or a `%% ZOOMMAP-DATA %%`
 * inline block. This is a read-only subset of the source plugin's
 * `MarkerFileData`. Fields intentionally omitted from this plugin:
 * `measurement`, `secondScreen`, `frame` (post-MVP — see plan §2.4).
 */
export interface TTRPGMapData {
  size?: { w: number; h: number };
  layers: MarkerLayer[];
  markers: Marker[];
  bases?: (string | BaseImage)[];
  overlays?: ImageOverlay[];
  activeBase?: string;
  grids?: GridOverlay[];
  drawLayers?: DrawLayer[];
  drawings?: Drawing[];
  textLayers?: TextLayer[];
  pinSizeOverrides?: Record<string, number>;
  panClamp?: boolean;
}

export interface ResolvedImageRef {
  sourcePath: string;
  destRel: string;
  url: string;
}

/**
 * Data attached to `vfile.data.ttrpgMaps` by the transformer and serialized
 * to the placeholder `<div>` for the client script to pick up at runtime.
 */
export interface ResolvedMap {
  index: number;
  id: string;
  yaml: YamlOptions;
  data: TTRPGMapData;
  resolvedImageUrls: ResolvedImageRef[];
  error?: ResolveError;
}

export type ResolveError = "invalid-yaml" | "markers-missing" | "invalid-markers";

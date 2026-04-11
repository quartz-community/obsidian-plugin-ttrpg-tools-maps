export { BuildCtx, CSSResource, ChangeEvent, JSResource, PageGenerator, PageMatcher, ProcessedContent, QuartzEmitterPlugin, QuartzEmitterPluginInstance, QuartzFilterPlugin, QuartzFilterPluginInstance, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzPluginData, QuartzTransformerPlugin, QuartzTransformerPluginInstance, StaticResources, VirtualPage } from '@quartz-community/types';

interface TransformerOptions {
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
type StorageMode = "json" | "note";
type RenderMode = "dom" | "canvas";
type AlignMode = "left" | "center" | "right";
interface YamlBaseImageEntry {
    path: string;
    name?: string;
}
interface YamlOverlayEntry {
    path: string;
    name?: string;
    visible: boolean;
}
interface YamlOptions {
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
interface MarkerLayer {
    id: string;
    name: string;
    visible: boolean;
    locked?: boolean;
    boundBase?: string;
}
interface DrawLayer {
    id: string;
    name: string;
    visible: boolean;
    locked?: boolean;
    boundBase?: string;
}
type MarkerKind = "pin" | "sticker" | "swap" | "switch" | "dice";
type AnchorSpace = "world" | "viewport";
/**
 * A marker on a TTRPG map. Coordinates `x` and `y` are normalized to [0, 1]
 * relative to the base image. See plan §2.4 for rendering semantics.
 */
interface Marker {
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
type GridShape = "square" | "hex";
interface GridOverlay {
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
type DrawingKind = "polygon" | "polyline" | "rect" | "circle";
type FillPatternKind = "none" | "solid" | "striped" | "cross" | "wavy";
interface DrawingStyle {
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
interface Drawing {
    id: string;
    layerId: string;
    kind: DrawingKind;
    visible: boolean;
    rect?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    circle?: {
        cx: number;
        cy: number;
        r: number;
    };
    polygon?: {
        x: number;
        y: number;
    }[];
    polyline?: {
        x: number;
        y: number;
    }[];
    style: DrawingStyle;
}
interface TextLayerStyle {
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
interface TextBaseline {
    id: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    text?: string;
}
interface TextBox {
    id: string;
    name: string;
    mode: "custom" | "auto";
    rect: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    lines: TextBaseline[];
    style?: TextLayerStyle;
    locked?: boolean;
    autoFlow?: boolean;
    allowAngledBaselines?: boolean;
}
interface TextLayer {
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
interface BaseImage {
    path: string;
    name?: string;
}
interface ImageOverlay {
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
interface TTRPGMapData {
    size?: {
        w: number;
        h: number;
    };
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
interface ResolvedImageRef {
    sourcePath: string;
    destRel: string;
    url: string;
}
/**
 * Data attached to `vfile.data.ttrpgMaps` by the transformer and serialized
 * to the placeholder `<div>` for the client script to pick up at runtime.
 */
interface ResolvedMap {
    index: number;
    id: string;
    yaml: YamlOptions;
    data: TTRPGMapData;
    resolvedImageUrls: ResolvedImageRef[];
    error?: ResolveError;
}
type ResolveError = "invalid-yaml" | "markers-missing" | "invalid-markers";

export type { AlignMode, AnchorSpace, BaseImage, DrawLayer, Drawing, DrawingKind, DrawingStyle, FillPatternKind, GridOverlay, GridShape, ImageOverlay, Marker, MarkerKind, MarkerLayer, RenderMode, ResolveError, ResolvedImageRef, ResolvedMap, StorageMode, TTRPGMapData, TextBaseline, TextBox, TextLayer, TextLayerStyle, TransformerOptions, YamlBaseImageEntry, YamlOptions, YamlOverlayEntry };

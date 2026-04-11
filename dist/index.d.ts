import { QuartzTransformerPlugin, QuartzEmitterPlugin } from '@quartz-community/types';
export { PageGenerator, PageMatcher, QuartzComponent, QuartzComponentConstructor, QuartzComponentProps, QuartzEmitterPlugin, QuartzFilterPlugin, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzTransformerPlugin, StringResource, VirtualPage } from '@quartz-community/types';
import { ResolvedMap, TransformerOptions } from './types.js';
export { AlignMode, AnchorSpace, BaseImage, DrawLayer, Drawing, DrawingKind, DrawingStyle, FillPatternKind, GridOverlay, GridShape, ImageOverlay, Marker, MarkerKind, MarkerLayer, RenderMode, ResolveError, ResolvedImageRef, StorageMode, TTRPGMapData, TextBaseline, TextBox, TextLayer, TextLayerStyle, YamlBaseImageEntry, YamlOptions, YamlOverlayEntry } from './types.js';
export { TTRPGMap } from './components/index.js';

declare module "vfile" {
    interface DataMap {
        ttrpgMaps?: ResolvedMap[];
    }
}
declare const DEFAULT_TRANSFORMER_OPTIONS: TransformerOptions;
declare const TTRPGMapTransformer: QuartzTransformerPlugin<Partial<TransformerOptions>>;

declare const TTRPGMapEmitter: QuartzEmitterPlugin;

export { DEFAULT_TRANSFORMER_OPTIONS, ResolvedMap, TTRPGMapEmitter, TTRPGMapTransformer, TransformerOptions };

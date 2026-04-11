# TTRPG Tools: Maps — Quartz v5 Plugin

A Quartz v5 community plugin that renders interactive, read-only TTRPG maps in a generated static site. It consumes the data formats produced by the Obsidian plugin [TTRPG Tools: Maps (zoom-map)](https://github.com/Jareika/zoom-map) without requiring any migration — point Quartz at a vault that uses zoommap, and the maps show up on the built site.

## Credits

This plugin is a static-site adaptation of [TTRPG Tools: Maps (zoom-map)](https://github.com/Jareika/zoom-map) by Jareika, an Obsidian community plugin licensed under MIT. The DOM structure, CSS layout rules, and interactive pan/zoom/pinch math are directly ported from the original at commit `da748dbcca9247ef26cf596b9e64b0b552fdb175`.

This plugin does **not** include any editing features; it consumes data produced by the original plugin and renders it as a read-only view in Quartz-generated static sites. For authoring maps, install the original plugin in Obsidian.

## Status

**MVP in progress.** See [`.sisyphus/plans/ttrpg-maps.md`](./.sisyphus/plans/ttrpg-maps.md) for the implementation plan.

## Installation

Not yet published. Once complete, install via:

```bash
npx quartz plugin add github:quartz-community/obsidian-plugin-ttrpg-tools-maps
```

Then register it in `quartz.config.ts`:

```ts
import * as TTRPGMaps from "./.quartz/plugins/obsidian-plugin-ttrpg-tools-maps";

export default {
  plugins: {
    transformers: [TTRPGMaps.TTRPGMapTransformer()],
    emitters: [TTRPGMaps.TTRPGMapEmitter()],
  },
};
```

## Authoring maps

Inside any Markdown note, embed a map with a fenced code block:

````markdown
```zoommap
imageBases:
  - path: assets/world-map.webp
    name: Forbidden Lands
markers: assets/world-map.webp.markers.json
minZoom: 0.3
maxZoom: 20
height: 480px
width: 100%
```
````

Or use inline storage (the entire marker dataset lives in the same Markdown note):

````markdown
```zoommap
image: assets/world-map.webp
storage: note
id: map-1
```

%%
ZOOMMAP-DATA id=map-1
{ "layers": [...], "markers": [...] }
/ZOOMMAP-DATA
%%
````

## Supported features (MVP scope)

- Single and multiple base images with a switcher UI
- Pan and zoom via mouse wheel, drag, double-click, and pinch
- Mobile pinch zoom and two-finger pan
- Pan clamping
- Markers (pin, sticker, switch variants — rendered statically)
- Marker tooltips and links
- Layer visibility toggles
- Per-marker zoom-range visibility
- Image overlays
- Grid overlays (square and hex)
- Drawings (rectangle, circle, polygon, polyline) with styles
- Text layers with baselines

## Unsupported features (roadmap)

- Editing of any kind (by design — static site)
- Ruler / measurement tool
- Custom units and travel-time calculations
- Viewport frame overlays
- Swap pin click-cycling
- Canvas render mode

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT — see [LICENSE](./LICENSE) for the full text, including the upstream copyright notice for the ported source.

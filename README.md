# TTRPG Tools: Maps — Quartz v5 Plugin

A Quartz v5 community plugin that renders interactive, read-only TTRPG maps in a generated static site. It consumes the data formats produced by the Obsidian plugin [TTRPG Tools: Maps (zoom-map)](https://github.com/Jareika/zoom-map) without requiring any migration — point Quartz at a vault that uses zoommap, and the maps show up on the built site.

## Credits

This plugin is a static-site adaptation of [TTRPG Tools: Maps (zoom-map)](https://github.com/Jareika/zoom-map) by Jareika, an Obsidian community plugin licensed under MIT. The DOM structure, CSS layout rules, and interactive pan/zoom/pinch math are directly ported from the original at commit `da748dbcca9247ef26cf596b9e64b0b552fdb175`.

This plugin does **not** include any editing features; it consumes data produced by the original plugin and renders it as a read-only view in Quartz-generated static sites. For authoring maps, install the original plugin in Obsidian.

## Installation

```bash
npx quartz plugin add @quartz-community/obsidian-plugin-ttrpg-tools-maps
```

Then enable it in `quartz.config.yaml` (one entry registers the transformer, the emitter that copies the map images, and the map component):

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/obsidian-plugin-ttrpg-tools-maps"
    enabled: true
    options:
      blockLanguage: zoommap
      inlineBlockHeaderId: ZOOMMAP-DATA
```

## Configuration

| Option                | Type     | Default          | Description                                                                              |
| --------------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `blockLanguage`       | `string` | `"zoommap"`      | The code block language that holds a map.                                                |
| `inlineBlockHeaderId` | `string` | `"ZOOMMAP-DATA"` | The header of inline marker data blocks (`storage: note`).                               |
| `defaultIconKey`      | `string` | `"pin-red"`      | Accepted, but currently not used: a marker without an icon is always drawn as a red pin. |
| `maxInlineDataBytes`  | `number` | `0`              | Reserved, currently not used: marker data is always inlined into the page.               |

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

## Supported features

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

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/ObsidianPluginTtrpgToolsMaps) for more information.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT — see [LICENSE](./LICENSE) for the full text, including the upstream copyright notice for the ported source.

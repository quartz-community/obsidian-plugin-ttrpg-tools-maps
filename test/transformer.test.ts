import { describe, expect, it, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Root as HastRoot, Element } from "hast";
import type { BuildCtx, FilePath } from "@quartz-community/types";
import { VFile } from "vfile";
import { visit } from "unist-util-visit";
import { TTRPGMapTransformer, DEFAULT_TRANSFORMER_OPTIONS } from "../src/transformer";
import type { ResolvedMap } from "../src/types";

function makeCtx(directory: string): BuildCtx {
  return {
    buildId: "test-build",
    argv: {
      directory,
      verbose: false,
      output: "dist",
      serve: false,
      watch: false,
      port: 0,
      wsPort: 0,
    },
    cfg: {} as BuildCtx["cfg"],
    allSlugs: [],
    allFiles: [],
    incremental: false,
  };
}

async function runTransformer(
  source: string,
  sourceFilePath: string,
  ctx: BuildCtx,
): Promise<{ tree: HastRoot; file: VFile }> {
  const processor = unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true });
  const mdast = processor.parse(source);
  const hast = (await processor.run(mdast)) as HastRoot;

  const file = new VFile({ value: source });
  file.data.filePath = sourceFilePath as FilePath;

  const transformer = TTRPGMapTransformer();
  const plugins = transformer.htmlPlugins?.(ctx) ?? [];
  for (const plugin of plugins) {
    const fn = Array.isArray(plugin) ? plugin[0] : plugin;
    const transformFn = (fn as () => (tree: HastRoot, file: VFile) => Promise<void> | void)();
    await transformFn(hast, file);
  }
  return { tree: hast, file };
}

function findPlaceholders(tree: HastRoot): Element[] {
  const out: Element[] = [];
  visit(tree, "element", (node: Element) => {
    const cls = node.properties?.className;
    if (Array.isArray(cls) && cls.includes("ttrpg-map-root")) {
      out.push(node);
    }
  });
  return out;
}

describe("TTRPGMapTransformer", () => {
  describe("defaults and metadata", () => {
    it("exposes default transformer options", () => {
      expect(DEFAULT_TRANSFORMER_OPTIONS.blockLanguage).toBe("zoommap");
      expect(DEFAULT_TRANSFORMER_OPTIONS.inlineBlockHeaderId).toBe("ZOOMMAP-DATA");
      expect(DEFAULT_TRANSFORMER_OPTIONS.maxInlineDataBytes).toBe(0);
      expect(DEFAULT_TRANSFORMER_OPTIONS.defaultIconKey).toBe("pin-red");
    });

    it("returns a plugin instance with the correct name", () => {
      const t = TTRPGMapTransformer();
      expect(t.name).toBe("TTRPGMapTransformer");
    });
  });

  describe("code block detection", () => {
    let tmp: string;

    beforeAll(async () => {
      tmp = await fs.mkdtemp(path.join(tmpdir(), "ttrpg-txf-"));
      await fs.writeFile(
        path.join(tmp, "world.markers.json"),
        JSON.stringify({
          layers: [{ id: "default", name: "Default", visible: true }],
          markers: [{ id: "m1", x: 0.5, y: 0.3, layer: "default", tooltip: "Tavern" }],
        }),
      );
    });

    afterAll(async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    });

    it("does nothing on notes without a zoommap block", async () => {
      const ctx = makeCtx(tmp);
      const { tree, file } = await runTransformer("# Hello\n\nNo maps here.\n", "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(0);
      expect(file.data.ttrpgMaps).toBeUndefined();
    });

    it("replaces a single zoommap block with a placeholder div", async () => {
      const ctx = makeCtx(tmp);
      const source = [
        "# Map",
        "",
        "```zoommap",
        "image: world.webp",
        "markers: world.markers.json",
        "```",
        "",
      ].join("\n");

      await fs.writeFile(path.join(tmp, "world.webp"), "fake-image-bytes");
      const { tree, file } = await runTransformer(source, "note.md", ctx);

      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(1);

      const placeholder = placeholders[0]!;
      const props = placeholder.properties ?? {};
      expect(props.dataQzTtrpgMapIndex).toBe("0");
      expect(typeof props.dataQzTtrpgMapCfg).toBe("string");
      expect(typeof props.dataQzTtrpgMapData).toBe("string");

      const cfg = JSON.parse(props.dataQzTtrpgMapCfg as string);
      expect(cfg.yaml.image).toBe("world.webp");
      expect(cfg.yaml.markers).toBe("world.markers.json");
      expect(cfg.resolvedImageUrls.length).toBeGreaterThan(0);
      expect(cfg.resolvedImageUrls[0].url).toBe("/world.webp");

      const data = JSON.parse(props.dataQzTtrpgMapData as string);
      expect(data.markers[0].tooltip).toBe("Tavern");

      const resolved = (file.data.ttrpgMaps ?? []) as ResolvedMap[];
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.error).toBeUndefined();
    });

    it("replaces multiple zoommap blocks independently", async () => {
      const ctx = makeCtx(tmp);
      const source = [
        "```zoommap",
        "image: world.webp",
        "markers: world.markers.json",
        "```",
        "",
        "Intermission",
        "",
        "```zoommap",
        "image: world.webp",
        "markers: world.markers.json",
        "```",
      ].join("\n");
      const { tree, file } = await runTransformer(source, "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(2);
      expect(placeholders[0]?.properties?.dataQzTtrpgMapIndex).toBe("0");
      expect(placeholders[1]?.properties?.dataQzTtrpgMapIndex).toBe("1");
      expect((file.data.ttrpgMaps ?? []).length).toBe(2);
    });
  });

  describe("error states", () => {
    it("emits an invalid-yaml error placeholder for broken YAML", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const source = "```zoommap\n: : : bogus\n```\n";
      const { tree, file } = await runTransformer(source, "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0]?.properties?.dataQzTtrpgMapError).toBe("invalid-yaml");
      expect(placeholders[0]?.properties?.dataQzTtrpgMapData).toBeUndefined();
      const resolved = (file.data.ttrpgMaps ?? []) as ResolvedMap[];
      expect(resolved[0]?.error).toBe("invalid-yaml");
    });

    it("emits a markers-missing error when sidecar does not exist", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const source = "```zoommap\nimage: nowhere.webp\n```\n";
      const { tree } = await runTransformer(source, "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0]?.properties?.dataQzTtrpgMapError).toBe("markers-missing");
    });

    it("emits an invalid-yaml error for note-storage without id", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const source = "```zoommap\nstorage: note\n```\n";
      const { tree } = await runTransformer(source, "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders[0]?.properties?.dataQzTtrpgMapError).toBe("invalid-yaml");
    });
  });

  describe("inline-storage resolution", () => {
    it("parses inline %% ZOOMMAP-DATA %% blocks", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const source = [
        "```zoommap",
        "storage: note",
        "id: map-1",
        "```",
        "",
        "%%",
        "ZOOMMAP-DATA id=map-1",
        JSON.stringify({
          layers: [{ id: "default", name: "Default", visible: true }],
          markers: [{ id: "m1", x: 0.1, y: 0.1, layer: "default", tooltip: "Inline tavern" }],
        }),
        "/ZOOMMAP-DATA",
        "%%",
      ].join("\n");
      const { tree } = await runTransformer(source, "note.md", ctx);
      const placeholders = findPlaceholders(tree);
      expect(placeholders).toHaveLength(1);
      const data = JSON.parse(placeholders[0]?.properties?.dataQzTtrpgMapData as string);
      expect(data.markers[0].tooltip).toBe("Inline tavern");
    });
  });

  describe("syntax-highlighted code block wrapping (regression: duplicate-hit bug)", () => {
    it("deduplicates when a <pre> is wrapped in a <figure>", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const wrappedHast: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "figure",
            properties: { className: ["code-figure"] },
            children: [
              {
                type: "element",
                tagName: "pre",
                properties: {},
                children: [
                  {
                    type: "element",
                    tagName: "code",
                    properties: { className: ["language-zoommap"] },
                    children: [
                      { type: "text", value: "image: nowhere.webp\nstorage: note\nid: x" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const file = new VFile({ value: "" });
      file.data.filePath = "note.md" as FilePath;

      const transformer = TTRPGMapTransformer();
      const plugins = transformer.htmlPlugins?.(ctx) ?? [];
      for (const plugin of plugins) {
        const fn = Array.isArray(plugin) ? plugin[0] : plugin;
        const transformFn = (fn as () => (tree: HastRoot, file: VFile) => Promise<void> | void)();
        await transformFn(wrappedHast, file);
      }

      const placeholders = findPlaceholders(wrappedHast);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0]?.properties?.dataQzTtrpgMapIndex).toBe("0");
      const resolved = (file.data.ttrpgMaps ?? []) as ResolvedMap[];
      expect(resolved).toHaveLength(1);
    });

    it("still handles bare <pre> without a figure wrapper", async () => {
      const ctx = makeCtx("/tmp/nonexistent");
      const bareHast: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "pre",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "code",
                properties: { className: ["language-zoommap"] },
                children: [{ type: "text", value: "storage: note\nid: y" }],
              },
            ],
          },
        ],
      };

      const file = new VFile({ value: "" });
      file.data.filePath = "note.md" as FilePath;

      const transformer = TTRPGMapTransformer();
      const plugins = transformer.htmlPlugins?.(ctx) ?? [];
      for (const plugin of plugins) {
        const fn = Array.isArray(plugin) ? plugin[0] : plugin;
        const transformFn = (fn as () => (tree: HastRoot, file: VFile) => Promise<void> | void)();
        await transformFn(bareHast, file);
      }

      const placeholders = findPlaceholders(bareHast);
      expect(placeholders).toHaveLength(1);
    });
  });
});

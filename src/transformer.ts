/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 */

import path from "node:path";
import { promises as fs } from "node:fs";
import type { PluggableList, Plugin } from "unified";
import type { Root as HastRoot, Element, ElementContent, RootContent, Text } from "hast";
import type { VFile } from "vfile";
import { visit } from "unist-util-visit";
import type { QuartzTransformerPlugin, BuildCtx } from "@quartz-community/types";
import type {
  ResolvedImageRef,
  ResolvedMap,
  TTRPGMapData,
  TransformerOptions,
  YamlOptions,
  BaseImage,
  ResolveError,
} from "./types";
import { parseZoomMapYaml } from "./parser/yamlConfig";
import { readSidecarMarkers } from "./parser/markerFile";
import { parseInlineMarkerBlock } from "./parser/inlineStore";
import { emptyMapData } from "./parser/normalize";

declare module "vfile" {
  interface DataMap {
    ttrpgMaps?: ResolvedMap[];
  }
}

export const DEFAULT_TRANSFORMER_OPTIONS: TransformerOptions = {
  blockLanguage: "zoommap",
  inlineBlockHeaderId: "ZOOMMAP-DATA",
  maxInlineDataBytes: 0,
  defaultIconKey: "pin-red",
};

export const TTRPGMapTransformer: QuartzTransformerPlugin<Partial<TransformerOptions>> = (
  userOptions?: Partial<TransformerOptions>,
) => {
  const options: TransformerOptions = { ...DEFAULT_TRANSFORMER_OPTIONS, ...userOptions };

  return {
    name: "TTRPGMapTransformer",
    markdownPlugins(_ctx: BuildCtx): PluggableList {
      return [];
    },
    htmlPlugins(ctx: BuildCtx): PluggableList {
      const plugin: Plugin<[], HastRoot> = () => {
        return async (tree: HastRoot, file: VFile): Promise<void> => {
          const hits = collectZoomMapHits(tree, options.blockLanguage);
          if (hits.length === 0) return;

          const source = String(file.value ?? "");
          const sourceFilePath = (file.data.filePath as string | undefined) ?? "";

          const resolved: ResolvedMap[] = [];
          for (let i = 0; i < hits.length; i += 1) {
            const hit = hits[i]!;
            resolved.push(
              await resolveMapBlock(ctx, options, hit.codeText, i, source, sourceFilePath),
            );
          }

          file.data.ttrpgMaps = resolved;

          for (let i = 0; i < hits.length; i += 1) {
            const placeholder = buildPlaceholder(resolved[i]!);
            const hit = hits[i]!;
            hit.replaceParent.children[hit.replaceIndex] = placeholder;
          }
        };
      };
      return [plugin];
    },
    externalResources() {
      return { css: [], js: [], additionalHead: [] };
    },
  };
};

interface Hit {
  replaceParent: { children: (ElementContent | RootContent)[] };
  replaceIndex: number;
  codeText: string;
}

function collectZoomMapHits(tree: HastRoot, blockLanguage: string): Hit[] {
  const hits: Hit[] = [];
  visit(tree, "element", (node: Element, index, parent) => {
    if (!parent || typeof index !== "number") return;
    if (node.tagName === "pre") {
      const parentTag = (parent as Element).tagName;
      if (parentTag === "figure") return;
    }
    const found = findZoomMapCodeblock(node, blockLanguage);
    if (!found) return;
    const codeText = extractCodeText(found.codeElement);
    hits.push({
      replaceParent: parent as { children: (ElementContent | RootContent)[] },
      replaceIndex: index,
      codeText,
    });
  });
  return hits;
}

interface FoundCodeblock {
  codeElement: Element;
}

function findZoomMapCodeblock(node: Element, blockLanguage: string): FoundCodeblock | null {
  if (node.tagName === "pre") {
    const code = findFirstCodeChild(node);
    if (code && isLanguage(code, blockLanguage)) {
      return { codeElement: code };
    }
    return null;
  }
  if (node.tagName === "figure") {
    const pre = node.children.find(
      (c): c is Element => c.type === "element" && (c as Element).tagName === "pre",
    );
    if (pre) {
      const code = findFirstCodeChild(pre);
      if (code && isLanguage(code, blockLanguage)) {
        return { codeElement: code };
      }
    }
  }
  return null;
}

function findFirstCodeChild(pre: Element): Element | null {
  for (const child of pre.children) {
    if (child.type === "element" && (child as Element).tagName === "code") {
      return child as Element;
    }
  }
  return null;
}

function isLanguage(codeElement: Element, blockLanguage: string): boolean {
  const props = codeElement.properties ?? {};
  const className = props.className;
  if (Array.isArray(className)) {
    if (className.some((c) => typeof c === "string" && c === `language-${blockLanguage}`)) {
      return true;
    }
  } else if (typeof className === "string") {
    if (className === `language-${blockLanguage}`) return true;
  }
  const dataLanguage = (props as Record<string, unknown>).dataLanguage;
  if (typeof dataLanguage === "string" && dataLanguage === blockLanguage) return true;
  return false;
}

function extractCodeText(codeElement: Element): string {
  let out = "";
  for (const child of codeElement.children) {
    if (child.type === "text") {
      out += (child as Text).value;
    } else if (child.type === "element") {
      out += extractCodeText(child as Element);
    }
  }
  return out;
}

async function resolveMapBlock(
  ctx: BuildCtx,
  options: TransformerOptions,
  codeText: string,
  index: number,
  source: string,
  sourceFilePath: string,
): Promise<ResolvedMap> {
  const yaml = parseZoomMapYaml(codeText);
  if (yaml === null) {
    return makeErrorMap(index, "invalid-yaml");
  }

  const id = yaml.id ?? `map-${index}`;

  let data: TTRPGMapData | null = null;
  let error: ResolveError | undefined;

  if (yaml.storage === "note") {
    if (yaml.id === undefined) {
      error = "invalid-yaml";
    } else {
      data = parseInlineMarkerBlock(source, yaml.id, options.inlineBlockHeaderId);
      if (data === null) error = "markers-missing";
    }
  } else {
    const primaryImage = pickPrimaryImagePath(yaml);
    const markersRel = yaml.markers ?? (primaryImage ? `${primaryImage}.markers.json` : undefined);
    if (!markersRel) {
      error = "markers-missing";
    } else {
      data = await readSidecarMarkers(ctx, markersRel, sourceFilePath);
      if (data === null) error = "markers-missing";
    }
  }

  const resolvedImageUrls = await buildResolvedImageUrls(ctx, yaml, data, sourceFilePath);

  return {
    index,
    id,
    yaml,
    data: data ?? emptyMapData(),
    resolvedImageUrls,
    error,
  };
}

function makeErrorMap(index: number, error: ResolveError): ResolvedMap {
  return {
    index,
    id: `map-${index}`,
    yaml: {
      minZoom: 0.25,
      maxZoom: 8,
      width: "100%",
      height: "480px",
      storage: "json",
      render: "dom",
      responsive: false,
      align: "left",
      wrap: false,
    },
    data: emptyMapData(),
    resolvedImageUrls: [],
    error,
  };
}

function pickPrimaryImagePath(yaml: YamlOptions): string | undefined {
  if (yaml.imageBases && yaml.imageBases.length > 0) {
    return yaml.imageBases[0]?.path;
  }
  return yaml.image;
}

async function buildResolvedImageUrls(
  ctx: BuildCtx,
  yaml: YamlOptions,
  data: TTRPGMapData | null,
  sourceFilePath: string,
): Promise<ResolvedImageRef[]> {
  const out: ResolvedImageRef[] = [];
  const seen = new Set<string>();

  const add = async (vaultPath: string | undefined) => {
    if (!vaultPath || seen.has(vaultPath)) return;
    seen.add(vaultPath);
    const ref = await resolveImageRef(ctx, vaultPath, sourceFilePath);
    if (ref) out.push(ref);
  };

  if (yaml.imageBases) {
    for (const b of yaml.imageBases) await add(b.path);
  }
  if (yaml.image) await add(yaml.image);
  if (yaml.imageOverlays) {
    for (const o of yaml.imageOverlays) await add(o.path);
  }
  if (data?.bases) {
    for (const b of data.bases) {
      const p = typeof b === "string" ? b : (b as BaseImage).path;
      await add(p);
    }
  }
  if (data?.overlays) {
    for (const o of data.overlays) await add(o.path);
  }
  if (data?.markers) {
    for (const m of data.markers) {
      if (m.stickerPath) await add(m.stickerPath);
    }
  }

  return out;
}

async function resolveImageRef(
  ctx: BuildCtx,
  vaultPath: string,
  sourceFilePath: string,
): Promise<ResolvedImageRef | null> {
  const contentDir = path.resolve(ctx.argv.directory);
  const candidates: string[] = [];

  if (sourceFilePath.length > 0) {
    const sourceAbs = path.isAbsolute(sourceFilePath)
      ? sourceFilePath
      : path.resolve(contentDir, sourceFilePath);
    candidates.push(path.resolve(path.dirname(sourceAbs), vaultPath));
  }
  candidates.push(path.resolve(contentDir, vaultPath));

  for (const abs of candidates) {
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) {
        const destRel = path.relative(contentDir, abs).split(path.sep).join("/");
        return {
          sourcePath: abs,
          destRel,
          url: "/" + destRel.split("/").map(encodeURIComponent).join("/"),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function buildPlaceholder(resolved: ResolvedMap): Element {
  const cfg = {
    yaml: resolved.yaml,
    resolvedImageUrls: resolved.resolvedImageUrls,
    error: resolved.error,
  };
  const properties: Record<
    string,
    string | number | boolean | (string | number)[] | null | undefined
  > = {
    className: ["ttrpg-map-root"],
    dataQzTtrpgMapIndex: String(resolved.index),
    dataQzTtrpgMapId: resolved.id,
    dataQzTtrpgMapCfg: JSON.stringify(cfg),
  };
  if (resolved.error) {
    properties.dataQzTtrpgMapError = resolved.error;
  } else {
    properties.dataQzTtrpgMapData = JSON.stringify(resolved.data);
  }
  return {
    type: "element",
    tagName: "div",
    properties,
    children: [],
  };
}

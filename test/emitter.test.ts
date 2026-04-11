import { describe, expect, it, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import type { BuildCtx, FilePath, ProcessedContent } from "@quartz-community/types";
import { VFile } from "vfile";
import { TTRPGMapEmitter } from "../src/emitter";
import type { ResolvedMap } from "../src/types";

function makeCtx(directory: string, output: string): BuildCtx {
  return {
    buildId: "test-build",
    argv: {
      directory,
      verbose: false,
      output,
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

function makeContent(ttrpgMaps: ResolvedMap[]): ProcessedContent[] {
  const vfile = new VFile("");
  vfile.data.ttrpgMaps = ttrpgMaps;
  return [[{ type: "root", children: [] }, vfile]];
}

describe("TTRPGMapEmitter", () => {
  let tmp: string;
  let contentDir: string;
  let outputDir: string;

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(tmpdir(), "ttrpg-emit-"));
    contentDir = path.join(tmp, "content");
    outputDir = path.join(tmp, "dist");
    await fs.mkdir(contentDir, { recursive: true });
    await fs.mkdir(path.join(contentDir, "assets"), { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(contentDir, "assets", "world.webp"), "fake-image-1");
    await fs.writeFile(path.join(contentDir, "assets", "roads.png"), "fake-image-2");
  });

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("does nothing when no ttrpgMaps are present", async () => {
    const ctx = makeCtx(contentDir, outputDir);
    const emitter = TTRPGMapEmitter();
    const content: ProcessedContent[] = [[{ type: "root", children: [] }, new VFile("")]];
    const result = await emitter.emit(ctx, content, { css: [], js: [], additionalHead: [] });
    const paths = Array.isArray(result) ? result : await collect(result);
    expect(paths).toHaveLength(0);
  });

  it("copies each referenced image to the output tree", async () => {
    const ctx = makeCtx(contentDir, outputDir);
    const emitter = TTRPGMapEmitter();
    const worldSrc = path.join(contentDir, "assets", "world.webp");
    const roadsSrc = path.join(contentDir, "assets", "roads.png");
    const content = makeContent([
      {
        index: 0,
        id: "map-0",
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
        data: { layers: [], markers: [] },
        resolvedImageUrls: [
          { sourcePath: worldSrc, destRel: "assets/world.webp", url: "/assets/world.webp" },
          { sourcePath: roadsSrc, destRel: "assets/roads.png", url: "/assets/roads.png" },
        ],
      },
    ]);
    const result = await emitter.emit(ctx, content, { css: [], js: [], additionalHead: [] });
    const paths = Array.isArray(result) ? result : await collect(result);
    expect(paths).toHaveLength(2);

    const worldOut = path.join(outputDir, "assets", "world.webp");
    const roadsOut = path.join(outputDir, "assets", "roads.png");
    expect(await fs.readFile(worldOut, "utf-8")).toBe("fake-image-1");
    expect(await fs.readFile(roadsOut, "utf-8")).toBe("fake-image-2");
  });

  it("deduplicates images referenced from multiple maps", async () => {
    const ctx = makeCtx(contentDir, outputDir);
    const emitter = TTRPGMapEmitter();
    const worldSrc = path.join(contentDir, "assets", "world.webp");
    const ref = { sourcePath: worldSrc, destRel: "assets/world.webp", url: "/assets/world.webp" };
    const content = makeContent([
      {
        index: 0,
        id: "a",
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
        data: { layers: [], markers: [] },
        resolvedImageUrls: [ref],
      },
      {
        index: 1,
        id: "b",
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
        data: { layers: [], markers: [] },
        resolvedImageUrls: [ref],
      },
    ]);
    const result = await emitter.emit(ctx, content, { css: [], js: [], additionalHead: [] });
    const paths = Array.isArray(result) ? result : await collect(result);
    expect(paths).toHaveLength(1);
  });

  it("skips missing source files without failing", async () => {
    const ctx = makeCtx(contentDir, outputDir);
    const emitter = TTRPGMapEmitter();
    const content = makeContent([
      {
        index: 0,
        id: "x",
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
        data: { layers: [], markers: [] },
        resolvedImageUrls: [
          { sourcePath: "/nonexistent/path/to/file.webp", destRel: "file.webp", url: "/file.webp" },
        ],
      },
    ]);
    const result = await emitter.emit(ctx, content, { css: [], js: [], additionalHead: [] });
    const paths = Array.isArray(result) ? result : await collect(result);
    expect(paths).toHaveLength(0);
  });
});

async function collect(iter: AsyncGenerator<FilePath>): Promise<FilePath[]> {
  const out: FilePath[] = [];
  for await (const p of iter) out.push(p);
  return out;
}

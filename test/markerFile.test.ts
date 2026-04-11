import { describe, expect, it, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import type { BuildCtx } from "@quartz-community/types";
import { readSidecarMarkers } from "../src/parser/markerFile";

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

describe("readSidecarMarkers", () => {
  let tmp: string;

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(tmpdir(), "ttrpg-maps-test-"));
    await fs.mkdir(path.join(tmp, "notes"), { recursive: true });
    await fs.mkdir(path.join(tmp, "notes", "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "notes", "assets", "world.markers.json"),
      JSON.stringify({
        layers: [{ id: "default", name: "Default", visible: true }],
        markers: [{ id: "m1", x: 0.5, y: 0.5, layer: "default", tooltip: "Same-dir resolution" }],
      }),
    );
    await fs.writeFile(
      path.join(tmp, "root-map.markers.json"),
      JSON.stringify({
        layers: [{ id: "default", name: "Default", visible: true }],
        markers: [
          { id: "m2", x: 0.1, y: 0.1, layer: "default", tooltip: "Content-root resolution" },
        ],
      }),
    );
    await fs.writeFile(path.join(tmp, "broken.markers.json"), "{ this is not valid json");
  });

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("resolves a sidecar relative to the source file's directory", async () => {
    const ctx = makeCtx(tmp);
    const result = await readSidecarMarkers(ctx, "assets/world.markers.json", "notes/adventure.md");
    expect(result).not.toBeNull();
    expect(result?.markers[0]?.tooltip).toBe("Same-dir resolution");
  });

  it("falls back to content-root when same-dir lookup fails", async () => {
    const ctx = makeCtx(tmp);
    const result = await readSidecarMarkers(ctx, "root-map.markers.json", "notes/adventure.md");
    expect(result).not.toBeNull();
    expect(result?.markers[0]?.tooltip).toBe("Content-root resolution");
  });

  it("returns null when the file does not exist", async () => {
    const ctx = makeCtx(tmp);
    const result = await readSidecarMarkers(ctx, "missing.markers.json", "notes/adventure.md");
    expect(result).toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    const ctx = makeCtx(tmp);
    const result = await readSidecarMarkers(ctx, "broken.markers.json", "notes/adventure.md");
    expect(result).toBeNull();
  });

  it("returns null for JSON that fails normalization", async () => {
    const bogusPath = path.join(tmp, "bogus.markers.json");
    await fs.writeFile(bogusPath, JSON.stringify("not an object"));
    const ctx = makeCtx(tmp);
    const result = await readSidecarMarkers(ctx, "bogus.markers.json", "notes/adventure.md");
    expect(result).toBeNull();
  });

  it("loads the checked-in fixture file end-to-end", async () => {
    const fixtureDir = path.resolve(__dirname, "fixtures");
    const ctx = makeCtx(fixtureDir);
    const result = await readSidecarMarkers(ctx, "simple.markers.json", "");
    expect(result).not.toBeNull();
    expect(result?.markers[0]?.id).toBe("m_tavern");
    expect(result?.markers[0]?.tooltip).toBe("The Prancing Pony");
    expect(result?.bases).toEqual(["assets/world-map.webp"]);
  });
});

import { promises as fs } from "node:fs";
import path from "node:path";
import type { BuildCtx } from "@quartz-community/types";
import type { TTRPGMapData } from "../types";
import { normalizeMarkerData } from "./normalize";

export async function readSidecarMarkers(
  ctx: BuildCtx,
  markersRelPath: string,
  sourceFilePath: string,
): Promise<TTRPGMapData | null> {
  const contentDir = path.resolve(ctx.argv.directory);
  const candidates: string[] = [];

  if (sourceFilePath.length > 0) {
    const sourceAbs = path.isAbsolute(sourceFilePath)
      ? sourceFilePath
      : path.resolve(contentDir, sourceFilePath);
    const sourceDir = path.dirname(sourceAbs);
    candidates.push(path.resolve(sourceDir, markersRelPath));
  }
  candidates.push(path.resolve(contentDir, markersRelPath));

  for (const abs of candidates) {
    const parsed = await tryReadAndParse(abs);
    if (parsed !== null) return parsed;
  }
  return null;
}

async function tryReadAndParse(absPath: string): Promise<TTRPGMapData | null> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf-8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return normalizeMarkerData(parsed);
}

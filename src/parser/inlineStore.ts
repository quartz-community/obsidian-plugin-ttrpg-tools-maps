/*
 * Portions of this file are ported from:
 *   zoom-map by Jareika
 *   https://github.com/Jareika/zoom-map
 *   Commit: da748dbcca9247ef26cf596b9e64b0b552fdb175
 *   MIT License — Copyright (c) 2025 Jareika
 *
 * Block format parsing logic is a direct port of the findBlock() method in
 * the source plugin's src/inlineStore.ts (lines 22-68 at the pinned commit).
 */

import type { TTRPGMapData } from "../types";
import { normalizeMarkerData } from "./normalize";

const DEFAULT_HEADER_ID = "ZOOMMAP-DATA";

export function parseInlineMarkerBlock(
  source: string,
  mapId: string,
  headerIdName: string = DEFAULT_HEADER_ID,
): TTRPGMapData | null {
  if (typeof source !== "string" || source.length === 0) return null;
  if (typeof mapId !== "string" || mapId.length === 0) return null;

  const header = `${headerIdName} id=${mapId}`;
  const footer = `/${headerIdName}`;

  const hIdx = source.indexOf(header);
  if (hIdx < 0) return null;

  const headerLineEnd = source.indexOf("\n", hIdx);
  if (headerLineEnd < 0) return null;
  const jsonStart = headerLineEnd + 1;

  const fIdx = source.indexOf(footer, jsonStart);
  if (fIdx < 0) return null;

  const footerLineStart = source.lastIndexOf("\n", fIdx) + 1;
  const jsonEndExclusive = footerLineStart - 1;
  if (jsonEndExclusive <= jsonStart) return null;

  const rawJson = source.slice(jsonStart, jsonEndExclusive).trim();
  if (rawJson.length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  return normalizeMarkerData(parsed);
}

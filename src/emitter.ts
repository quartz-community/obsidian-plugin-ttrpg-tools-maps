import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  BuildCtx,
  FilePath,
  ProcessedContent,
  QuartzEmitterPlugin,
} from "@quartz-community/types";

export const TTRPGMapEmitter: QuartzEmitterPlugin = () => {
  const emit = async (ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath[]> => {
    const outputs: FilePath[] = [];
    const seen = new Set<string>();
    const outputRoot = path.resolve(ctx.argv.output);

    for (const [, vfile] of content) {
      const maps = vfile.data.ttrpgMaps;
      if (!maps) continue;
      for (const map of maps) {
        for (const ref of map.resolvedImageUrls) {
          if (seen.has(ref.sourcePath)) continue;
          seen.add(ref.sourcePath);
          const destAbs = path.resolve(outputRoot, ref.destRel);
          try {
            await fs.mkdir(path.dirname(destAbs), { recursive: true });
            await fs.copyFile(ref.sourcePath, destAbs);
            outputs.push(destAbs as FilePath);
          } catch {
            continue;
          }
        }
      }
    }
    return outputs;
  };

  return {
    name: "TTRPGMapEmitter",
    async emit(ctx, content, _resources) {
      return emit(ctx, content);
    },
    async *partialEmit(ctx, content, _resources, _changeEvents) {
      const paths = await emit(ctx, content);
      for (const p of paths) yield p;
    },
    getQuartzComponents() {
      return [];
    },
  };
};

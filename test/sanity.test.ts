import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSFORMER_OPTIONS, TTRPGMapTransformer } from "../src/transformer";
import { TTRPGMapEmitter } from "../src/emitter";

describe("Phase 0 scaffold sanity", () => {
  it("exposes the transformer factory", () => {
    const transformer = TTRPGMapTransformer();
    expect(transformer.name).toBe("TTRPGMapTransformer");
  });

  it("exposes the emitter factory", () => {
    const emitter = TTRPGMapEmitter();
    expect(emitter.name).toBe("TTRPGMapEmitter");
  });

  it("has sensible default transformer options", () => {
    expect(DEFAULT_TRANSFORMER_OPTIONS.blockLanguage).toBe("zoommap");
    expect(DEFAULT_TRANSFORMER_OPTIONS.inlineBlockHeaderId).toBe("ZOOMMAP-DATA");
    expect(DEFAULT_TRANSFORMER_OPTIONS.maxInlineDataBytes).toBe(0);
    expect(DEFAULT_TRANSFORMER_OPTIONS.defaultIconKey).toBe("pin-red");
  });
});

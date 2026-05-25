import { describe, expect, test } from "vitest";
import {
  decorationFilePaths,
  hashStringToNumber,
  isDecorationEnabled,
  isRuntimeDecoration,
  resolveDecorationFilePath,
  type DecorationAssetEntry,
} from "@/lib/scene/decorations";

const staticAsset: DecorationAssetEntry = {
  id: "tree",
  filePath: "/graphics/decorations/tree.png",
  tileX: 2,
  tileY: 3,
  change: { kind: "static" },
};

const seedAsset: DecorationAssetEntry = {
  id: "rock",
  filePath: "/graphics/decorations/rock-a.png",
  tileX: 5,
  tileY: 6,
  change: {
    kind: "seed",
    otherFilePaths: [
      "/graphics/decorations/rock-b.png",
      "/graphics/decorations/rock-c.png",
    ],
  },
};

const runtimeAsset: DecorationAssetEntry = {
  id: "lantern",
  filePath: "/graphics/decorations/lantern-0.png",
  tileX: 1,
  tileY: 2,
  change: {
    intervalMs: 1000,
    kind: "runtime",
    otherFilePaths: ["/graphics/decorations/lantern-1.png"],
  },
};

describe("individual decoration assets", () => {
  test("keeps file path lists in base-plus-other order", () => {
    expect(decorationFilePaths(seedAsset)).toEqual([
      "/graphics/decorations/rock-a.png",
      "/graphics/decorations/rock-b.png",
      "/graphics/decorations/rock-c.png",
    ]);
  });

  test("hashes strings deterministically", () => {
    expect(hashStringToNumber("seed:rock:file")).toBe(
      hashStringToNumber("seed:rock:file"),
    );
    expect(hashStringToNumber("seed:rock:file")).not.toBe(
      hashStringToNumber("seed:tree:file"),
    );
  });

  test("static assets always resolve to their main file", () => {
    expect(resolveDecorationFilePath(staticAsset, "a", 0)).toBe(
      staticAsset.filePath,
    );
    expect(resolveDecorationFilePath(staticAsset, "b", 999999)).toBe(
      staticAsset.filePath,
    );
  });

  test("seed assets choose one file deterministically per seed", () => {
    const first = resolveDecorationFilePath(seedAsset, "default", 0);
    const second = resolveDecorationFilePath(seedAsset, "default", 999999);

    expect(decorationFilePaths(seedAsset)).toContain(first);
    expect(second).toBe(first);
  });

  test("runtime assets cycle through files over time", () => {
    const first = resolveDecorationFilePath(runtimeAsset, "default", 0);
    const second = resolveDecorationFilePath(runtimeAsset, "default", 1000);

    expect(decorationFilePaths(runtimeAsset)).toContain(first);
    expect(decorationFilePaths(runtimeAsset)).toContain(second);
    expect(second).not.toBe(first);
  });

  test("enabled and runtime checks account for disabled entries", () => {
    expect(isDecorationEnabled(staticAsset)).toBe(true);
    expect(isRuntimeDecoration(runtimeAsset)).toBe(true);
    expect(
      isRuntimeDecoration({
        ...runtimeAsset,
        enabled: false,
      }),
    ).toBe(false);
  });
});

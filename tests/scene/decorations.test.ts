import { describe, expect, test } from "vitest";
import {
  decorationFilePaths,
  hashStringToNumber,
  isDecorationEnabled,
  isRuntimeDecoration,
  isWaveDecoration,
  resolveDecorationFilePath,
  type DecorationAssetEntry,
} from "@/lib/scene/decorations";

const staticAsset: DecorationAssetEntry = {
  id: "tree",
  filePath: "/graphics/decorations/tree.png",
  tileX: 2,
  tileY: 3,
  sizeMultiplier: 1,
  change: { kind: "static" },
};

const seedAsset: DecorationAssetEntry = {
  id: "rock",
  filePath: "/graphics/decorations/rock-a.png",
  tileX: 5,
  tileY: 6,
  sizeMultiplier: 1,
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
  sizeMultiplier: 1,
  change: {
    intervalMs: 1000,
    kind: "runtime",
    otherFilePaths: ["/graphics/decorations/lantern-1.png"],
  },
};

const waveAsset: DecorationAssetEntry = {
  id: "water-ball",
  filePath: "/graphics/decorations/water/ball/water-ball0.png",
  tileX: 1,
  tileY: 2,
  sizeMultiplier: 1,
  change: {
    kind: "wave",
    frame1FilePath: "/graphics/decorations/water/ball/water-ball1.png",
  },
};

const seedWaveAsset: DecorationAssetEntry = {
  id: "water-barrel",
  filePath: "/graphics/decorations/water/barrel/water-barrel-seed0-0.png",
  tileX: 1,
  tileY: 2,
  sizeMultiplier: 1,
  change: {
    kind: "seed-wave",
    frame1FilePath:
      "/graphics/decorations/water/barrel/water-barrel-seed0-1.png",
    otherVariants: [
      {
        filePath:
          "/graphics/decorations/water/barrel/water-barrel-seed1-0.png",
        frame1FilePath:
          "/graphics/decorations/water/barrel/water-barrel-seed1-1.png",
      },
      {
        filePath:
          "/graphics/decorations/water/barrel/water-barrel-seed2-0.png",
        frame1FilePath:
          "/graphics/decorations/water/barrel/water-barrel-seed2-1.png",
      },
    ],
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

  test("wave assets switch directly from the tile wave frame", () => {
    expect(resolveDecorationFilePath(waveAsset, "default", 0, 0)).toBe(
      "/graphics/decorations/water/ball/water-ball0.png",
    );
    expect(resolveDecorationFilePath(waveAsset, "default", 0, 1)).toBe(
      "/graphics/decorations/water/ball/water-ball1.png",
    );
  });

  test("seed-wave assets keep seed choice stable while wave frame changes", () => {
    const frame0 = resolveDecorationFilePath(seedWaveAsset, "default", 0, 0);
    const frame1 = resolveDecorationFilePath(seedWaveAsset, "default", 0, 1);
    const frame0Base = frame0.replace(/-0\.png$/, "");
    const frame1Base = frame1.replace(/-1\.png$/, "");

    expect(decorationFilePaths(seedWaveAsset)).toContain(frame0);
    expect(decorationFilePaths(seedWaveAsset)).toContain(frame1);
    expect(frame0).toMatch(/-0\.png$/);
    expect(frame1).toMatch(/-1\.png$/);
    expect(frame0Base).toBe(frame1Base);
  });

  test("enabled and runtime checks account for disabled entries", () => {
    expect(isDecorationEnabled(staticAsset)).toBe(true);
    expect(isRuntimeDecoration(runtimeAsset)).toBe(true);
    expect(isWaveDecoration(waveAsset)).toBe(true);
    expect(
      isRuntimeDecoration({
        ...runtimeAsset,
        enabled: false,
      }),
    ).toBe(false);
    expect(
      isWaveDecoration({
        ...waveAsset,
        enabled: false,
      }),
    ).toBe(false);
  });
});

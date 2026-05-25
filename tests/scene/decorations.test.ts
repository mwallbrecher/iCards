import { describe, expect, test } from "vitest";
import {
  ANIMATION_PERIOD_MS,
  DECORATION_ATLASES,
  DECORATION_SUB_ASSETS,
  hashStringToNumber,
  resolveSubAssetVariant,
} from "@/lib/scene/decorations";

function subAsset(slotName: string) {
  const asset = DECORATION_SUB_ASSETS.find((sub) => sub.slotName === slotName);

  if (asset === undefined) {
    throw new Error(`Missing decoration sub-asset ${slotName}`);
  }

  return asset;
}

describe("decoration metadata", () => {
  test("defines the expected land asset inventory", () => {
    expect(DECORATION_SUB_ASSETS.map((sub) => sub.slotName)).toEqual([
      "land1_0",
      "land1_1",
      "land1_2",
      "land1_3",
      "land2_0",
      "land2_1",
      "land3_0",
      "land4_0",
      "land5_0",
    ]);
  });

  test("hashes strings deterministically", () => {
    expect(hashStringToNumber("land4_0:phase")).toBe(
      hashStringToNumber("land4_0:phase"),
    );
    expect(hashStringToNumber("land4_0:phase")).not.toBe(
      hashStringToNumber("land5_0:phase"),
    );
  });

  test("resolves static row variants from the seed", () => {
    const asset = subAsset("land1_0");
    const atlas = DECORATION_ATLASES[asset.atlasKey];
    const variant = resolveSubAssetVariant(asset, "default", 0);

    expect(variant.atlasX).toBe(asset.xPx);
    expect([0, atlas.rowHeight]).toContain(variant.atlasY);
    expect(resolveSubAssetVariant(asset, "default", 123456)).toEqual(variant);
  });

  test("static-column variants keep a seed-picked column", () => {
    const asset = subAsset("land4_0");
    const variant = resolveSubAssetVariant(asset, "default", 0);
    const nextVariant = resolveSubAssetVariant(asset, "default", 999999);

    expect([0, asset.widthPx, asset.widthPx * 2]).toContain(variant.atlasX);
    expect(variant.atlasY).toBe(0);
    expect(nextVariant).toEqual(variant);
  });

  test("animated-column variants keep a seed-picked column and animate rows", () => {
    const asset = subAsset("land5_0");
    const variant = resolveSubAssetVariant(asset, "default", 0);
    const nextVariant = resolveSubAssetVariant(
      asset,
      "default",
      ANIMATION_PERIOD_MS,
    );

    expect([0, asset.widthPx]).toContain(variant.atlasX);
    expect(nextVariant.atlasX).toBe(variant.atlasX);
    expect(nextVariant.atlasY).not.toBe(variant.atlasY);
  });
});

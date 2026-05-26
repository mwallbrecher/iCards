export type DecorationChange =
  | { kind: "static" }
  | { kind: "seed"; otherFilePaths: string[] }
  | { kind: "runtime"; intervalMs?: number; otherFilePaths: string[] }
  | { kind: "wave"; frame1FilePath: string }
  | {
      kind: "seed-wave";
      frame1FilePath: string;
      otherVariants: Array<{
        filePath: string;
        frame1FilePath: string;
      }>;
    };

export type DecorationAssetEntry = {
  /** Stable identifier used for React keys and deterministic variant picking. */
  id: string;
  /** Main image file. The image is rendered at native pixel size scaled by the scene scale. */
  filePath: string;
  /** Top-left scene-grid coordinate, in tiles. Fractional values are allowed. */
  tileX: number;
  tileY: number;
  /** Multiplies the image render size after scene scaling. */
  sizeMultiplier: number;
  /** Optional off switch for keeping prepared entries out of the scene. */
  enabled?: boolean;
  /** Whether this asset changes, and how alternate image files are selected. */
  change: DecorationChange;
};

export const RUNTIME_DECORATION_INTERVAL_MS = 6000;

export function hashStringToNumber(value: string): number {
  let hash = 2166136261 >>> 0;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function decorationFilePaths(asset: DecorationAssetEntry): string[] {
  if (asset.change.kind === "static") {
    return [asset.filePath];
  }

  if (asset.change.kind === "wave") {
    return [asset.filePath, asset.change.frame1FilePath];
  }

  if (asset.change.kind === "seed-wave") {
    return [
      asset.filePath,
      asset.change.frame1FilePath,
      ...asset.change.otherVariants.flatMap((variant) => [
        variant.filePath,
        variant.frame1FilePath,
      ]),
    ];
  }

  return [asset.filePath, ...asset.change.otherFilePaths];
}

export function isDecorationEnabled(asset: DecorationAssetEntry): boolean {
  return asset.enabled !== false;
}

export function isRuntimeDecoration(asset: DecorationAssetEntry): boolean {
  return (
    isDecorationEnabled(asset) &&
    asset.change.kind === "runtime" &&
    decorationFilePaths(asset).length > 1
  );
}

export function isWaveDecoration(asset: DecorationAssetEntry): boolean {
  return (
    isDecorationEnabled(asset) &&
    (asset.change.kind === "wave" || asset.change.kind === "seed-wave")
  );
}

export function resolveDecorationFilePath(
  asset: DecorationAssetEntry,
  seed: string,
  nowMs: number,
  waveFrame: 0 | 1 = 0,
): string {
  const filePaths = decorationFilePaths(asset);

  if (filePaths.length === 1 || asset.change.kind === "static") {
    return asset.filePath;
  }

  if (asset.change.kind === "wave") {
    return waveFrame === 0 ? asset.filePath : asset.change.frame1FilePath;
  }

  if (asset.change.kind === "seed-wave") {
    const variants = [
      {
        filePath: asset.filePath,
        frame1FilePath: asset.change.frame1FilePath,
      },
      ...asset.change.otherVariants,
    ];
    const index =
      hashStringToNumber(`${seed}:${asset.id}:file`) % variants.length;
    const variant = variants[index]!;
    return waveFrame === 0 ? variant.filePath : variant.frame1FilePath;
  }

  if (asset.change.kind === "seed") {
    const index =
      hashStringToNumber(`${seed}:${asset.id}:file`) % filePaths.length;
    return filePaths[index]!;
  }

  const intervalMs = asset.change.intervalMs ?? RUNTIME_DECORATION_INTERVAL_MS;
  const phaseOffset =
    hashStringToNumber(`${asset.id}:runtime-phase`) % intervalMs;
  const index =
    Math.floor((nowMs + phaseOffset) / intervalMs) % filePaths.length;

  return filePaths[index]!;
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractSceneMapsFromSource } from "@/lib/scene/default-map-source";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const GENERATOR_PATH = join(process.cwd(), "lib/scene/generator.ts");

export async function GET() {
  const source = await readFile(GENERATOR_PATH, "utf8");
  const maps = extractSceneMapsFromSource(source);

  return Response.json(maps, {
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}

import { describe, expect, test } from "vitest";
import {
  extractDefaultMapFromSource,
  extractSceneMapsFromSource,
} from "@/lib/scene/default-map-source";

describe("default map source extraction", () => {
  test("extracts the DEFAULT_MAP template literally", () => {
    const source = `
export const DEFAULT_MAP = \`
CC
B.
\`;
`;

    expect(extractDefaultMapFromSource(source)).toBe("\nCC\nB.\n");
  });

  test("throws when DEFAULT_MAP is missing", () => {
    expect(() => extractDefaultMapFromSource("export const OTHER = ``;")).toThrow(
      "Could not find DEFAULT_MAP template literal",
    );
  });

  test("extracts both scene map template literals", () => {
    const source = `
export const DEFAULT_MAP = \`
CC
B.
\`;

export const DEFAULT_PIER_MAP = \`
..
a.
\`;
`;

    expect(extractSceneMapsFromSource(source)).toEqual({
      grassMap: "\nCC\nB.\n",
      pierMap: "\n..\na.\n",
    });
  });

  test("throws when DEFAULT_PIER_MAP is missing", () => {
    expect(() =>
      extractSceneMapsFromSource("export const DEFAULT_MAP = ``;"),
    ).toThrow("Could not find DEFAULT_PIER_MAP template literal");
  });
});

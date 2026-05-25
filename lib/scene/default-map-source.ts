const TEMPLATE_LITERAL_PATTERN = (name: string) =>
  new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`;`);

export type SceneMapSource = {
  grassMap: string;
  pierMap: string;
};

function extractTemplateLiteral(source: string, name: string): string {
  const match = TEMPLATE_LITERAL_PATTERN(name).exec(source);

  if (match?.[1] === undefined) {
    throw new Error(`Could not find ${name} template literal`);
  }

  return match[1];
}

export function extractDefaultMapFromSource(source: string): string {
  return extractTemplateLiteral(source, "DEFAULT_MAP");
}

export function extractSceneMapsFromSource(source: string): SceneMapSource {
  return {
    grassMap: extractTemplateLiteral(source, "DEFAULT_MAP"),
    pierMap: extractTemplateLiteral(source, "DEFAULT_PIER_MAP"),
  };
}

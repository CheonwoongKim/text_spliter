import type { DocumentEngineType } from "@/lib/types";

export function buildParserExperimentEngines(
  primaryEngine: DocumentEngineType,
  additionalEngines: readonly DocumentEngineType[]
): DocumentEngineType[] {
  const engines = new Set<DocumentEngineType>([primaryEngine]);

  for (const parserType of additionalEngines) {
    engines.add(parserType);
  }

  return Array.from(engines);
}
